import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import ServicosList from "@/components/ServicosList";

export default async function ServicosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabaseAdmin.from("profiles").select("tenant_id").eq("id", user!.id).single();
  const { data: servicos } = await supabaseAdmin.from("servicos")
    .select("*").eq("tenant_id", profile!.tenant_id).order("nome");
  return <ServicosList servicos={servicos ?? []} tenantId={profile!.tenant_id} />;
}
