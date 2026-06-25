import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export default async function RelServicosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabaseAdmin.from("profiles").select("tenant_id").eq("id", user!.id).single();
  const mesInicio = new Date().toISOString().slice(0,7) + "-01";
  const { data: itens } = await supabaseAdmin
    .from("os_servicos")
    .select("servico_nome, preco_aplicado, ordens_servico!inner(tenant_id, data_entrada, status)")
    .eq("ordens_servico.tenant_id", profile!.tenant_id)
    .gte("ordens_servico.data_entrada", mesInicio)
    .in("ordens_servico.status", ["finalizado","entregue"]);

  const agrupado = (itens ?? []).reduce((acc: Record<string, { qtd: number; total: number }>, i: any) => {
    const k = i.servico_nome;
    if (!acc[k]) acc[k] = { qtd: 0, total: 0 };
    acc[k].qtd++; acc[k].total += i.preco_aplicado ?? 0;
    return acc;
  }, {});

  const lista = Object.entries(agrupado).sort((a, b) => b[1].total - a[1].total);
  const totalGeral = lista.reduce((s, [, v]) => s + v.total, 0);
  const fmt = (v: number) => v.toLocaleString("pt-BR", { style:"currency", currency:"BRL" });

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold" style={{ color:"var(--text)" }}>Serviços Realizados</h1>
        <p className="text-sm mt-1" style={{ color:"var(--text-muted)" }}>Mês atual · serviços finalizados/entregues</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="kpi-card"><span className="kpi-label">Total do Mês</span><span className="kpi-value">{fmt(totalGeral)}</span></div>
        <div className="kpi-card"><span className="kpi-label">Serviços Distintos</span><span className="kpi-value">{lista.length}</span></div>
      </div>
      <div className="table-wrapper">
        <table>
          <thead><tr><th>Serviço</th><th>Qtd</th><th>Total</th><th>% do faturamento</th></tr></thead>
          <tbody>
            {!lista.length ? (
              <tr><td colSpan={4} className="text-center py-10" style={{ color:"var(--text-muted)" }}>Nenhum serviço finalizado este mês.</td></tr>
            ) : lista.map(([nome, v]) => (
              <tr key={nome}>
                <td className="font-medium" style={{ color:"var(--text)" }}>{nome}</td>
                <td style={{ color:"var(--text-muted)" }}>{v.qtd}</td>
                <td style={{ color:"var(--primary)" }}>{fmt(v.total)}</td>
                <td>
                  <div className="flex items-center gap-2">
                    <div style={{ width: 80, height: 6, background:"var(--border)", borderRadius:3 }}>
                      <div style={{ width: `${(v.total/totalGeral*100).toFixed(0)}%`, height:"100%", background:"var(--primary)", borderRadius:3 }} />
                    </div>
                    <span className="text-xs" style={{ color:"var(--text-muted)" }}>{(v.total/totalGeral*100).toFixed(1)}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
