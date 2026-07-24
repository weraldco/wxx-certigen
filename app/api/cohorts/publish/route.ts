import { createHash, randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type PublishPayload = {
  program: { name?: string; organizer?: string; date?: string; type?: string };
  formUrl?: string;
  nameField?: string;
  emailField?: string;
  approvalMode?: "automatic" | "review";
  templateKey?: "modern" | "academic" | "editorial" | "minimal";
  accent?: string;
  emailSubject?: string;
  emailBody?: string;
};

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  let payload: PublishPayload;
  try {
    payload = (await request.json()) as PublishPayload;
  } catch {
    return NextResponse.json({ error: "Expected a JSON request body." }, { status: 400 });
  }

  const { program } = payload;
  if (!program?.name || !program.organizer || !program.date || !program.type || !payload.formUrl || !payload.nameField || !payload.emailField || !payload.templateKey || !payload.emailSubject || !payload.emailBody) {
    return NextResponse.json({ error: "Complete every setup step before publishing." }, { status: 422 });
  }

  const webhookSecret = randomBytes(32).toString("hex");
  const webhookSecretHash = createHash("sha256").update(webhookSecret).digest("hex");
  const { data, error } = await supabase.rpc("publish_cohort", {
    target_program_name: program.name,
    target_program_type: program.type,
    target_organization_name: program.organizer,
    target_completion_date: program.date,
    target_template_key: payload.templateKey,
    target_template_settings: { accent: payload.accent },
    target_form_url: payload.formUrl,
    target_name_field: payload.nameField,
    target_email_field: payload.emailField,
    target_approval_mode: payload.approvalMode ?? "automatic",
    target_email_subject: payload.emailSubject,
    target_email_body: payload.emailBody,
    target_webhook_secret_hash: webhookSecretHash,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: error.code === "22023" ? 422 : 500 });
  }

  const result = Array.isArray(data) ? data[0] : data;
  if (!result?.cohort_public_id) {
    return NextResponse.json({ error: "The cohort was not created." }, { status: 500 });
  }

  return NextResponse.json({
    certigenUrl: `${request.nextUrl.origin}/api/google-forms/webhook`,
    cohortId: result.cohort_public_id,
    webhookSecret,
  });
}
