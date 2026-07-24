import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type GoogleFormPayload = {
  cohortId?: string;
  responseId?: string;
  submittedAt?: string;
  answers?: Record<string, string | string[]>;
};

export async function POST(request: Request) {
  const suppliedSecret = request.headers.get("x-certigen-secret")?.trim();
  if (!suppliedSecret) {
    return NextResponse.json({ error: "Missing webhook secret." }, { status: 401 });
  }

  let payload: GoogleFormPayload;
  try {
    payload = (await request.json()) as GoogleFormPayload;
  } catch {
    return NextResponse.json({ error: "Expected a JSON request body." }, { status: 400 });
  }

  if (!payload.cohortId || !payload.responseId || !payload.answers) {
    return NextResponse.json(
      { error: "cohortId, responseId, and answers are required." },
      { status: 422 },
    );
  }

  if (payload.submittedAt && Number.isNaN(Date.parse(payload.submittedAt))) {
    return NextResponse.json({ error: "submittedAt must be an ISO date." }, { status: 422 });
  }

  try {
    const supabase = createSupabaseAdminClient();
    const secretHash = createHash("sha256").update(suppliedSecret).digest("hex");
    const { data, error } = await supabase.rpc("ingest_google_form_response", {
      target_cohort_public_id: payload.cohortId,
      target_response_id: payload.responseId,
      target_submitted_at: payload.submittedAt ?? new Date().toISOString(),
      target_answers: payload.answers,
      supplied_secret_hash: secretHash,
    });

    if (error) {
      const unauthorized = error.code === "28000";
      const invalidPayload = error.code === "22023";
      const unpublished = error.code === "55000";
      return NextResponse.json(
        { error: unauthorized ? "Invalid webhook credentials." : error.message },
        { status: unauthorized ? 401 : invalidPayload ? 422 : unpublished ? 409 : 500 },
      );
    }

    const result = Array.isArray(data) ? data[0] : data;
    return NextResponse.json(
      {
        accepted: true,
        duplicate: result?.duplicate ?? false,
        enrollmentId: result?.enrollment_id,
        status: result?.enrollment_status,
      },
      { status: result?.duplicate ? 200 : 202 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server persistence is unavailable.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
