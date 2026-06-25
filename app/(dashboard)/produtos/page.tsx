import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import ProdutosList from "@/components/ProdutosList";

export default async function ProdutosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabaseAdmin.from("profiles").select("tenant_id").eq("id", user!.id).single();
  const { data: produtos } = await supabaseAdmin.from("produtos")
    .select("*").eq("tenant_id", profile!.tenant_id).order("nome");
  return <ProdutosList produtos={produtos ?? []} tenantId={profile!.tenant_id} />;
}
