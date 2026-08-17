import type { SupabaseClient } from "@supabase/supabase-js";
import type { CertificateTemplateKey } from "./html";

export type RawEnrollmentRow = {
  organization_id: string;
  recipients: { full_name: string } | null;
  cohorts: {
    ends_on: string | null;
    organizations: { name: string } | null;
    programs: { name: string } | null;
    templates: { preset_key: string; settings: { accent?: string } | null } | null;
  } | null;
};

export type IssuanceContext = {
  organizationId: string;
  recipientName: string;
  organizationName: string;
  programName: string;
  completionDateLabel: string;
  templateKey: CertificateTemplateKey;
  accent: string;
};

const TEMPLATE_KEYS: readonly CertificateTemplateKey[] = ["modern", "academic", "editorial", "minimal"];
const DEFAULT_ACCENT = "#1f6f4a";

function formatCompletionDate(isoDate: string | null): string {
  if (!isoDate) return "Completion date";
  return new Intl.DateTimeFormat("en", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${isoDate}T00:00:00Z`),
  );
}

function resolveTemplateKey(presetKey: string | undefined): CertificateTemplateKey {
  return (TEMPLATE_KEYS as readonly string[]).includes(presetKey ?? "")
    ? (presetKey as CertificateTemplateKey)
    : "modern";
}

export function mapEnrollmentRowToIssuanceContext(row: RawEnrollmentRow): IssuanceContext {
  if (!row.recipients || !row.cohorts || !row.cohorts.organizations || !row.cohorts.programs) {
    throw new Error("Enrollment is missing required relations for issuance.");
  }
  return {
    organizationId: row.organization_id,
    recipientName: row.recipients.full_name,
    organizationName: row.cohorts.organizations.name,
    programName: row.cohorts.programs.name,
    completionDateLabel: formatCompletionDate(row.cohorts.ends_on),
    templateKey: resolveTemplateKey(row.cohorts.templates?.preset_key),
    accent: row.cohorts.templates?.settings?.accent ?? DEFAULT_ACCENT,
  };
}

export async function fetchEnrollmentRow(
  supabaseAdmin: SupabaseClient,
  enrollmentId: string,
): Promise<RawEnrollmentRow | null> {
  const { data, error } = await supabaseAdmin
    .from("enrollments")
    .select(
      `organization_id,
       recipients ( full_name ),
       cohorts (
         ends_on,
         organizations ( name ),
         programs ( name ),
         templates ( preset_key, settings )
       )`,
    )
    .eq("id", enrollmentId)
    .single();

  if (error) throw new Error(error.message);
  return data as RawEnrollmentRow | null;
}
