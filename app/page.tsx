import { CertigenApp } from "@/components/certigen-app";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function Home() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return <CertigenApp userEmail={user.email ?? "Signed in"} />;
}
