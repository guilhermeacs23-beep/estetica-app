import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import RecapClient from "./RecapClient";

export default async function RecapPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabaseAdmin
    .from("profiles").select("tenant_id, role").eq("id", user!.id).single();

  // Todos os clientes com ultima OS finalizada e total de visitas
  const { data: clientes } = await supabaseAdmin
    .from("clientes")
    .select("id, nome, telefone, whatsapp, cidade")
    .eq("tenant_id", profile!.tenant_id)
    .order("nome");

  const { data: ordens } = await supabaseAdmin
    .from("ordens_servico")
    .select("id, cliente_id, data_entrada, status, valor_final, os_servicos(nome)")
    .eq("tenant_id", profile!.tenant_id)
    .in("status", ["finalizado", "entregue"])
    .order("data_entrada", { ascending: false });

  // Configuracoes (webhook n8n)
  const { data: config } = await supabaseAdmin
    .from("configuracoes")
    .select("webhook_n8n, nome_fantasia")
    .eq("tenant_id", profile!.tenant_id)
    .single();

  return (
    <RecapClient
      clientes={clientes ?? []}
      ordens={ordens ?? []}
      webhookN8n={config?.webhook_n8n ?? ""}
      nomeLoja={config?.nome_fantasia ?? "Studio RPM"}
    />
  );
}
