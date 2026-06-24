import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import ConfiguracoesClient from "@/components/ConfiguracoesClient";

export default async function ConfiguracoesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabaseAdmin.from("profiles").select("tenant_id, role").eq("id", user!.id).single();
  const { data: config } = await supabaseAdmin.from("configuracoes").select("*").eq("tenant_id", profile!.tenant_id).single();
  const { data: formas } = await supabaseAdmin.from("formas_pagamento").select("*").eq("tenant_id", profile!.tenant_id);
  return <ConfiguracoesClient config={config} formas={formas ?? []} tenantId={profile!.tenant_id} role={profile!.role} />;
}
