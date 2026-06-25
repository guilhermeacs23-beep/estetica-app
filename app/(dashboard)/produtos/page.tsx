import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import ProdutosClient from "./ProdutosClient";

export default async function ProdutosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabaseAdmin.from("profiles").select("tenant_id, role").eq("id", user!.id).single();

  const { data: produtos } = await supabaseAdmin
    .from("produtos")
    .select("*")
    .eq("tenant_id", profile!.tenant_id)
    .eq("ativo", true)
    .order("nome");

  return <ProdutosClient produtos={produtos ?? []} tenantId={profile!.tenant_id} role={profile!.role} />;
}
