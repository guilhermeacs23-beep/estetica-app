import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import OrcamentosList from "@/components/OrcamentosList";

export default async function OrcamentosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabaseAdmin.from("profiles").select("tenant_id").eq("id", user!.id).single();
  const tid = profile!.tenant_id;

  const [{ data: orcamentos }, { data: clientes }, { data: servicos }] = await Promise.all([
    supabaseAdmin.from("orcamentos").select("*, clientes(nome), veiculos(placa,modelo)")
      .eq("tenant_id", tid).order("created_at", { ascending: false }).limit(50),
    supabaseAdmin.from("clientes").select("id,nome,telefone").eq("tenant_id", tid).order("nome"),
    supabaseAdmin.from("servicos").select("id,nome,preco_base").eq("tenant_id", tid).order("nome"),
  ]);

  return <OrcamentosList orcamentos={orcamentos??[]} clientes={clientes??[]} servicos={servicos??[]} />;
}
