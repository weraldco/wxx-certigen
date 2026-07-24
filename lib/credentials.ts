import { createClient } from "@supabase/supabase-js";
import { getPublicSupabaseConfig } from "./supabase/config";

export type PublicCredential = {
  public_id: string;
  status: "active" | "revoked" | "superseded";
  recipient_name: string;
  program_name: string;
  organization_name: string;
  issued_at: string;
  revoked_at: string | null;
  revocation_reason: string | null;
};

export async function getPublicCredential(publicId: string): Promise<PublicCredential | null> {
  const { url, publishableKey } = getPublicSupabaseConfig();
  const supabase = createClient(url, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await supabase.rpc("verify_credential", { lookup_public_id: publicId });

  if (error) throw new Error(error.message);
  const result = Array.isArray(data) ? data[0] : data;
  return (result as PublicCredential | undefined) ?? null;
}
