import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import NovaOSForm from "@/components/NovaOSForm";

export default async function NovaOSPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabaseAdmin.from("profiles").select("tenant_id, role").eq("id", user!.id).single();
  const tenantId = profile!.tenant_id;

  const [{ data: clientes }, { data: servicos }, { data: formas }, { data: funcionarios }, { data: config }] = await Promise.all([
    supabaseAdmin.from("clientes").select("id, nome").eq("tenant_id", tenantId).order("nome"),
    supabaseAdmin.from("servicos").select("id, nome, preco_base, duracao_min").eq("tenant_id", tenantId).eq("ativo", true).order("nome"),
    supabaseAdmin.from("formas_pagamento").select("id, nome, tipo").eq("tenant_id", tenantId),
    supabaseAdmin.from("funcionarios").select("id, nome, profissao").eq("tenant_id", tenantId).eq("ativo", true).order("nome"),
    supabaseAdmin.from("configuracoes").select("vagas_dia").eq("tenant_id", tenantId).single(),
  ]);

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>Nova Ordem de Serviço</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Preencha os dados para abrir uma nova OS</p>
      </div>
      <NovaOSForm
        tenantId={tenantId}
        userId={user!.id}
        clientes={clientes ?? []}
        servicos={servicos ?? []}
        formas={formas ?? []}
        funcionarios={funcionarios ?? []}
        vagasDia={config?.vagas_dia ?? 5}
      />
    </div>
  );
}
