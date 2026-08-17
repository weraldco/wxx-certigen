import type { SupabaseClient } from "@supabase/supabase-js";

export function buildPdfStoragePath(
  organizationId: string,
  credentialId: string,
): string {
  return `${organizationId}/${credentialId}.pdf`;
}

export async function uploadCertificatePdf(
  supabaseAdmin: SupabaseClient,
  organizationId: string,
  credentialId: string,
  pdfBuffer: Buffer,
): Promise<string> {
  const path = buildPdfStoragePath(organizationId, credentialId);
  const { error } = await supabaseAdmin.storage
    .from("credential-pdfs")
    .upload(path, pdfBuffer, { contentType: "application/pdf", upsert: false });
  if (error) throw new Error(error.message);
  return path;
}
