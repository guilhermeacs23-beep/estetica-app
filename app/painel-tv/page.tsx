import { supabaseAdmin } from "@/lib/supabase/admin";
import PainelTVClient from "@/components/PainelTVClient";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PainelTVPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabaseAdmin.schema("rpm").from("profiles").select("tenant_id, nome").eq("id", user!.id).single();

  const hoje = new Date().toISOString().split("T")[0];
  const { data: ordens } = await supabaseAdmin.schema("rpm").from("ordens_servico")
    .select("*, clientes(nome), veiculos(placa, modelo), os_servicos(nome, funcionarios(nome))")
    .eq("tenant_id", profile!.tenant_id).eq("data_entrada", hoje)
    .neq("status", "recusado").order("hora_entrada");

  const { data: config } = await supabaseAdmin.schema("rpm").from("configuracoes")
    .select("nome_fantasia").eq("tenant_id", profile!.tenant_id).single();

  return <PainelTVClient ordens={ordens ?? []} nomeTenant={config?.nome_fantasia ?? "Studio RPM"} />;
}
