import { randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { fetchEnrollmentRow, mapEnrollmentRowToIssuanceContext } from "@/lib/certificates/issuance-data";
import { buildCertificatePdf } from "@/lib/certificates/build-certificate";
import { uploadCertificatePdf } from "@/lib/certificates/storage";
import { computeBackoffDelayMs, isRetryable, MAX_ISSUANCE_ATTEMPTS } from "@/lib/jobs/backoff";

export const maxDuration = 300;

const BATCH_SIZE = 5;

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

function isAuthorized(request: NextRequest): boolean {
  const expectedSecret = process.env.CRON_SECRET;
  if (!expectedSecret) return false;

  const authHeader = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${expectedSecret}`;

  const actualBuf = Buffer.from(authHeader);
  const expectedBuf = Buffer.from(expected);
  if (actualBuf.length !== expectedBuf.length) return false;

  return timingSafeEqual(actualBuf, expectedBuf);
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
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

  let issued = 0;
  let retried = 0;
  let failed = 0;

  for (const job of (claimedJobs ?? []) as ClaimedJob[]) {
    try {
      // Idempotency: a prior attempt may have already inserted the credential
      // and then died before marking the enrollment/job as done. Reuse it
      // instead of rendering and inserting a duplicate.
      const { data: existing, error: existingError } = await supabaseAdmin
        .from("credentials")
        .select("id")
        .eq("enrollment_id", job.enrollment_id)
        .eq("status", "active")
        .maybeSingle();
      if (existingError) throw new Error(existingError.message);

      if (!existing) {
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
      }

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

      issued += 1;
    } catch (error) {
      const wasTerminal = !isRetryable(job.attempts + 1);
      await handleJobFailure(supabaseAdmin, job, error);
      if (wasTerminal) {
        failed += 1;
      } else {
        retried += 1;
      }
    }
  }

  return NextResponse.json({ claimed: claimedJobs?.length ?? 0, issued, retried, failed });
}

async function handleJobFailure(
  supabaseAdmin: ReturnType<typeof createSupabaseAdminClient>,
  job: ClaimedJob,
  error: unknown,
) {
  const nextAttempts = job.attempts + 1;
  const message = error instanceof Error ? error.message : "Unknown issuance error";

  if (isRetryable(nextAttempts)) {
    const { error: retryError } = await supabaseAdmin
      .from("jobs")
      .update({
        status: "queued",
        attempts: nextAttempts,
        last_error: message,
        available_at: new Date(Date.now() + computeBackoffDelayMs(nextAttempts)).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", job.job_id);
    if (retryError) {
      console.error(`Failed to record retry state for job ${job.job_id}:`, retryError.message);
    }
    return;
  }

  const { error: failError } = await supabaseAdmin
    .from("jobs")
    .update({
      status: "failed",
      attempts: nextAttempts,
      last_error: message,
      updated_at: new Date().toISOString(),
    })
    .eq("id", job.job_id);
  if (failError) {
    console.error(`Failed to record terminal failure for job ${job.job_id}:`, failError.message);
  }

  const { error: activityError } = await supabaseAdmin.from("activity_events").insert({
    organization_id: job.organization_id,
    entity_type: "job",
    entity_id: job.job_id,
    action: "issuance_failed",
    details: { enrollment_id: job.enrollment_id, error: message },
  });
  if (activityError) {
    console.error(`Failed to record activity event for job ${job.job_id}:`, activityError.message);
  }
}
