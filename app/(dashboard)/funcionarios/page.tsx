import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import FuncionariosList from "@/components/FuncionariosList";

export default async function FuncionariosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabaseAdmin.schema("rpm").from("profiles").select("tenant_id").eq("id", user!.id).single();
  const { data: funcionarios } = await supabaseAdmin.schema("rpm").from("funcionarios")
    .select("*").eq("tenant_id", profile!.tenant_id).order("nome");
  return <FuncionariosList funcionarios={funcionarios ?? []} tenantId={profile!.tenant_id} />;
}
