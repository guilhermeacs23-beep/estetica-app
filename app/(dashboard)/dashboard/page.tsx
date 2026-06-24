import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import Link from "next/link";

async function getKPIs(tenantId: string) {
  const hoje = new Date().toISOString().split("T")[0];
  const mesInicio = hoje.slice(0, 7) + "-01";

  const [{ count: osHoje }, { count: osMes }, { data: faturamento }] = await Promise.all([
    supabaseAdmin.from("ordens_servico")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId).eq("data_entrada", hoje),
    supabaseAdmin.from("ordens_servico")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId).gte("data_entrada", mesInicio),
    supabaseAdmin.from("ordens_servico")
      .select("valor_final")
      .eq("tenant_id", tenantId).gte("data_entrada", mesInicio)
      .in("status", ["finalizado", "entregue"]),
  ]);

  const faturamentoMes = faturamento?.reduce((a, b) => a + (b.valor_final ?? 0), 0) ?? 0;
  const ticketMedio = faturamento?.length ? faturamentoMes / faturamento.length : 0;

  return { osHoje: osHoje ?? 0, osMes: osMes ?? 0, faturamentoMes, ticketMedio };
}

async function getOSRecentes(tenantId: string) {
  const { data } = await supabaseAdmin.from("ordens_servico")
    .select("id, numero, status, data_entrada, clientes(nome), veiculos(placa, modelo)")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(5);
  return data ?? [];
}

const STATUS_LABEL: Record<string, string> = {
  aguardando: "Aguardando", aceito: "Aceito", em_atendimento: "Em Atendimento",
  finalizado: "Finalizado", entregue: "Entregue", recusado: "Recusado",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabaseAdmin.from("profiles").select("tenant_id, nome").eq("id", user!.id).single();
  const tenantId = profile?.tenant_id;

  const [kpis, recentes] = await Promise.all([
    getKPIs(tenantId),
    getOSRecentes(tenantId),
  ]);

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const ATALHOS = [
    { href: "/ordens-de-servico/nova", label: "Nova OS", icon: "🔧", desc: "Abrir ordem de serviço" },
    { href: "/clientes/novo",          label: "Novo Cliente", icon: "👤", desc: "Cadastrar cliente" },
    { href: "/agenda",                 label: "Agenda",   icon: "📅", desc: "Ver agendamentos" },
    { href: "/painel-tv",              label: "Painel TV", icon: "📺", desc: "Tela de atendimento" },
  ];

  return (
    <div className="flex flex-col gap-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>Dashboard</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
          {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "OS Hoje",          value: kpis.osHoje,           fmt: String },
          { label: "OS no Mês",        value: kpis.osMes,            fmt: String },
          { label: "Faturamento/Mês",  value: kpis.faturamentoMes,   fmt },
          { label: "Ticket Médio",     value: kpis.ticketMedio,      fmt },
        ].map(k => (
          <div key={k.label} className="kpi-card">
            <span className="kpi-label">{k.label}</span>
            <span className="kpi-value">{k.fmt(k.value as any)}</span>
          </div>
        ))}
      </div>

      {/* Atalhos */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {ATALHOS.map(a => (
          <Link key={a.href} href={a.href} className="card flex flex-col items-center gap-2 text-center hover:border-orange-500 transition-colors cursor-pointer">
            <span className="text-3xl">{a.icon}</span>
            <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>{a.label}</span>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>{a.desc}</span>
          </Link>
        ))}
      </div>

      {/* OS Recentes */}
      <div className="card p-0">
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
          <h2 className="font-semibold" style={{ color: "var(--text)" }}>Ordens Recentes</h2>
          <Link href="/ordens-de-servico" className="text-sm" style={{ color: "var(--primary)" }}>Ver todas →</Link>
        </div>
        {recentes.length === 0 ? (
          <div className="p-8 text-center" style={{ color: "var(--text-muted)" }}>
            <p className="text-4xl mb-3">🔧</p>
            <p className="font-medium">Nenhuma OS ainda</p>
            <p className="text-sm mt-1">Crie a primeira ordem de serviço</p>
            <Link href="/ordens-de-servico/nova" className="btn btn-primary mt-4 inline-flex">Nova OS</Link>
          </div>
        ) : (
          <div className="table-wrapper border-0 rounded-none">
            <table>
              <thead><tr>
                <th>Nº</th><th>Cliente</th><th>Veículo</th><th>Data</th><th>Status</th>
              </tr></thead>
              <tbody>
                {recentes.map((os: any) => (
                  <tr key={os.id}>
                    <td><Link href={`/ordens-de-servico/${os.id}`} style={{ color: "var(--primary)" }}>#{os.numero}</Link></td>
                    <td style={{ color: "var(--text)" }}>{os.clientes?.nome ?? "-"}</td>
                    <td style={{ color: "var(--text-muted)" }}>{os.veiculos?.placa} · {os.veiculos?.modelo}</td>
                    <td style={{ color: "var(--text-muted)" }}>{new Date(os.data_entrada + "T00:00").toLocaleDateString("pt-BR")}</td>
                    <td><span className={`badge badge-${os.status.replace("_", "-")}`}>{STATUS_LABEL[os.status]}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
