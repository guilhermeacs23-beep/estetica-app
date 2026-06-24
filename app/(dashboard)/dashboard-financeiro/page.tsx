import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export default async function DashFinanceiroPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabaseAdmin.from("profiles").select("tenant_id").eq("id", user!.id).single();
  const tid = profile!.tenant_id;

  const hoje = new Date().toISOString().split("T")[0];
  const mesInicio = hoje.slice(0, 7) + "-01";

  const [{ data: mesData }, { data: hojeData }, { data: topServicos }] = await Promise.all([
    supabaseAdmin.from("ordens_servico")
      .select("valor_final, data_entrada").eq("tenant_id", tid)
      .gte("data_entrada", mesInicio).in("status", ["finalizado", "entregue"]),
    supabaseAdmin.from("ordens_servico")
      .select("valor_final").eq("tenant_id", tid).eq("data_entrada", hoje).in("status", ["finalizado", "entregue"]),
    supabaseAdmin.from("os_servicos")
      .select("nome, preco").limit(100),
  ]);

  const faturamentoMes = mesData?.reduce((a, b) => a + (b.valor_final ?? 0), 0) ?? 0;
  const faturamentoHoje = hojeData?.reduce((a, b) => a + (b.valor_final ?? 0), 0) ?? 0;
  const ticketMedio = mesData?.length ? faturamentoMes / mesData.length : 0;
  const osFinalizadas = mesData?.length ?? 0;

  // Top serviços
  const contagem: Record<string, number> = {};
  topServicos?.forEach(s => { contagem[s.nome] = (contagem[s.nome] ?? 0) + 1; });
  const ranking = Object.entries(contagem).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  // Faturamento por dia (últimos 7 dias)
  const diasMap: Record<string, number> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    diasMap[d.toISOString().split("T")[0]] = 0;
  }
  mesData?.forEach(o => { if (diasMap[o.data_entrada] !== undefined) diasMap[o.data_entrada] += o.valor_final ?? 0; });
  const dias7 = Object.entries(diasMap);
  const maxVal = Math.max(...dias7.map(d => d[1]), 1);

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>Dashboard Financeiro</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Resumo do mês atual</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Faturamento Hoje", value: fmt(faturamentoHoje) },
          { label: "Faturamento do Mês", value: fmt(faturamentoMes) },
          { label: "OS Finalizadas/Mês", value: String(osFinalizadas) },
          { label: "Ticket Médio", value: fmt(ticketMedio) },
        ].map(k => (
          <div key={k.label} className="kpi-card">
            <span className="kpi-label">{k.label}</span>
            <span className="kpi-value text-xl">{k.value}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Gráfico simples últimos 7 dias */}
        <div className="card">
          <h2 className="font-semibold mb-4" style={{ color: "var(--text)" }}>Faturamento — Últimos 7 dias</h2>
          <div className="flex items-end gap-2 h-32">
            {dias7.map(([data, valor]) => (
              <div key={data} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full rounded-t-sm transition-all" style={{ height: `${(valor / maxVal) * 100}%`, minHeight: 4, background: "var(--primary)", opacity: valor ? 1 : 0.2 }} />
                <span className="text-xs" style={{ color: "var(--text-subtle)" }}>{data.slice(8)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top serviços */}
        <div className="card">
          <h2 className="font-semibold mb-4" style={{ color: "var(--text)" }}>Serviços Mais Realizados</h2>
          {!ranking.length ? (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>Sem dados ainda.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {ranking.map(([nome, count], i) => (
                <div key={nome}>
                  <div className="flex justify-between text-sm mb-1">
                    <span style={{ color: "var(--text)" }}>{i + 1}. {nome}</span>
                    <span style={{ color: "var(--text-muted)" }}>{count}x</span>
                  </div>
                  <div className="h-1.5 rounded-full" style={{ background: "var(--border)" }}>
                    <div className="h-full rounded-full" style={{ width: `${(count / ranking[0][1]) * 100}%`, background: "var(--primary)" }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
