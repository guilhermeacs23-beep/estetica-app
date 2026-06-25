import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export default async function DashFinanceiroPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabaseAdmin.from("profiles").select("tenant_id").eq("id", user!.id).single();
  const tid = profile!.tenant_id;

  const hoje = new Date().toISOString().split("T")[0];
  const mesInicio = hoje.slice(0, 7) + "-01";

  const agora = new Date();
  const diaSemana = agora.getDay() === 0 ? 6 : agora.getDay() - 1;
  const semanaInicio = new Date(agora);
  semanaInicio.setDate(agora.getDate() - diaSemana);
  const semanaInicioStr = semanaInicio.toISOString().split("T")[0];

  const [{ data: mesData }, { data: hojeData }, { data: topServicos }, { data: osSemana }, { data: servDuracoes }] = await Promise.all([
    supabaseAdmin.from("ordens_servico").select("valor_final, data_entrada").eq("tenant_id", tid).gte("data_entrada", mesInicio).in("status", ["finalizado", "entregue"]),
    supabaseAdmin.from("ordens_servico").select("valor_final").eq("tenant_id", tid).eq("data_entrada", hoje).in("status", ["finalizado", "entregue"]),
    supabaseAdmin.from("os_servicos").select("nome").limit(200),
    supabaseAdmin.from("ordens_servico").select("id").eq("tenant_id", tid).gte("data_entrada", semanaInicioStr).in("status", ["finalizado", "entregue"]),
    supabaseAdmin.from("os_servicos").select("servico_id, servicos(duracao_min)").not("servico_id", "is", null),
  ]);

  const osSemanaIds = new Set((osSemana ?? []).map((o: { id: string }) => o.id));
  const totalMinSemana = (servDuracoes ?? [])
    .filter((s: { servicos?: { duracao_min?: number } | null }) => s.servicos?.duracao_min)
    .reduce((acc: number, s: { servicos?: { duracao_min?: number } | null }) => acc + (s.servicos?.duracao_min ?? 0), 0);
  const horasSemana = Math.floor(totalMinSemana / 60);
  const minSemana = totalMinSemana % 60;

  const faturamentoMes = (mesData ?? []).reduce((a, b: { valor_final?: number }) => a + (b.valor_final ?? 0), 0);
  const faturamentoHoje = (hojeData ?? []).reduce((a, b: { valor_final?: number }) => a + (b.valor_final ?? 0), 0);
  const ticketMedio = (mesData ?? []).length ? faturamentoMes / (mesData ?? []).length : 0;

  const contagem: Record<string, number> = {};
  (topServicos ?? []).forEach((s: { nome: string }) => { contagem[s.nome] = (contagem[s.nome] ?? 0) + 1; });
  const ranking = Object.entries(contagem).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const diasMap: Record<string, number> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    diasMap[d.toISOString().split("T")[0]] = 0;
  }
  (mesData ?? []).forEach((o: { data_entrada: string; valor_final?: number }) => {
    if (diasMap[o.data_entrada] !== undefined) diasMap[o.data_entrada] += o.valor_final ?? 0;
  });
  const dias7 = Object.entries(diasMap);
  const maxVal = Math.max(...dias7.map(d => d[1]), 1);

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>Dashboard Financeiro</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Resumo do mes atual</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Faturamento Hoje", value: fmt(faturamentoHoje) },
          { label: "Faturamento do Mes", value: fmt(faturamentoMes) },
          { label: "OS Finalizadas/Mes", value: String((mesData ?? []).length) },
          { label: "Ticket Medio", value: fmt(ticketMedio) },
        ].map(k => (
          <div key={k.label} className="kpi-card">
            <span className="kpi-label">{k.label}</span>
            <span className="kpi-value text-xl">{k.value}</span>
          </div>
        ))}
      </div>

      <div className="card" style={{ background: "rgba(196,30,58,0.06)", border: "1px solid rgba(196,30,58,0.2)" }}>
        <div className="flex items-center gap-4 flex-wrap">
          <div style={{ fontSize: 36, fontWeight: 700, color: "var(--primary)" }}>
            {horasSemana}h{minSemana > 0 ? ` ${minSemana}min` : ""}
          </div>
          <div>
            <p className="font-semibold" style={{ color: "var(--text)", margin: 0 }}>Horas Trabalhadas esta Semana</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              {osSemanaIds.size} OS finalizadas desde {semanaInicioStr}
              {totalMinSemana === 0 ? " — configure a duracao dos servicos para calcular" : ""}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card">
          <h2 className="font-semibold mb-4" style={{ color: "var(--text)" }}>Faturamento - Ultimos 7 dias</h2>
          <div className="flex items-end gap-2 h-32">
            {dias7.map(([data, valor]) => (
              <div key={data} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full rounded-t-sm" style={{ height: `${(valor / maxVal) * 100}%`, minHeight: 4, background: "var(--primary)", opacity: valor ? 1 : 0.2 }} />
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>{data.slice(8)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <h2 className="font-semibold mb-4" style={{ color: "var(--text)" }}>Servicos Mais Realizados</h2>
          {!ranking.length ? <p className="text-sm" style={{ color: "var(--text-muted)" }}>Sem dados ainda.</p> : (
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
