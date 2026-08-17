import { randomBytes, randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { fetchEnrollmentRow, mapEnrollmentRowToIssuanceContext } from "@/lib/certificates/issuance-data";
import { buildCertificatePdf } from "@/lib/certificates/build-certificate";
import { uploadCertificatePdf } from "@/lib/certificates/storage";
import { computeBackoffDelayMs, isRetryable, MAX_ISSUANCE_ATTEMPTS } from "@/lib/jobs/backoff";

const BATCH_SIZE = 20;

type ClaimedJob = {
  job_id: string;
  enrollment_id: string;
  organization_id: string;
  config_version: number;
  attempts: number;
};

function generatePublicId(): string {
  return `CG-${randomBytes(6).toString("hex").toUpperCase()}`;
}

export async function POST(request: NextRequest) {
  const expectedSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const { data: claimedJobs, error: claimError } = await supabaseAdmin.rpc("claim_issuance_jobs", {
    batch_size: BATCH_SIZE,
    max_attempts: MAX_ISSUANCE_ATTEMPTS,
  });
  if (claimError) {
    return NextResponse.json({ error: claimError.message }, { status: 500 });
  }

  let completed = 0;
  let failed = 0;

  for (const job of (claimedJobs ?? []) as ClaimedJob[]) {
    try {
      const row = await fetchEnrollmentRow(supabaseAdmin, job.enrollment_id);
      if (!row) throw new Error(`Enrollment ${job.enrollment_id} not found`);
      const context = mapEnrollmentRowToIssuanceContext(row);

      const credentialId = randomUUID();
      const publicId = generatePublicId();
      const verifyUrl = `${request.nextUrl.origin}/verify/${publicId}`;

      const pdfBuffer = await buildCertificatePdf({
        recipientName: context.recipientName,
        organizationName: context.organizationName,
        programName: context.programName,
        completionDateLabel: context.completionDateLabel,
        certificatePublicId: publicId,
        templateKey: context.templateKey,
        accent: context.accent,
        verifyUrl,
      });

      const pdfPath = await uploadCertificatePdf(supabaseAdmin, context.organizationId, credentialId, pdfBuffer);

      const { error: insertError } = await supabaseAdmin.from("credentials").insert({
        id: credentialId,
        public_id: publicId,
        organization_id: context.organizationId,
        enrollment_id: job.enrollment_id,
        config_version: job.config_version,
        pdf_path: pdfPath,
      });
      if (insertError) throw new Error(insertError.message);

      const { error: enrollmentError } = await supabaseAdmin
        .from("enrollments")
        .update({ status: "issued", updated_at: new Date().toISOString() })
        .eq("id", job.enrollment_id);
      if (enrollmentError) throw new Error(enrollmentError.message);

      const { error: completeError } = await supabaseAdmin
        .from("jobs")
        .update({ status: "completed", updated_at: new Date().toISOString() })
        .eq("id", job.job_id);
      if (completeError) throw new Error(completeError.message);

      completed += 1;
    } catch (error) {
      failed += 1;
      await handleJobFailure(supabaseAdmin, job, error);
    }
  }

  return NextResponse.json({ claimed: claimedJobs?.length ?? 0, completed, failed });
}

async function handleJobFailure(
  supabaseAdmin: ReturnType<typeof createSupabaseAdminClient>,
  job: ClaimedJob,
  error: unknown,
) {
  const nextAttempts = job.attempts + 1;
  const message = error instanceof Error ? error.message : "Unknown issuance error";

  if (isRetryable(nextAttempts)) {
    await supabaseAdmin
      .from("jobs")
      .update({
        status: "queued",
        attempts: nextAttempts,
        last_error: message,
        available_at: new Date(Date.now() + computeBackoffDelayMs(nextAttempts)).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", job.job_id);
    return;
  }

  await supabaseAdmin
    .from("jobs")
    .update({
      status: "failed",
      attempts: nextAttempts,
      last_error: message,
      updated_at: new Date().toISOString(),
    })
    .eq("id", job.job_id);

  await supabaseAdmin.from("activity_events").insert({
    organization_id: job.organization_id,
    entity_type: "job",
    entity_id: job.job_id,
    action: "issuance_failed",
    details: { enrollment_id: job.enrollment_id, error: message },
  });
}
