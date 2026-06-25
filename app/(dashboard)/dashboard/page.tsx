import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import Link from "next/link";

async function getKPIs(tenantId: string) {
  const hoje = new Date().toISOString().split("T")[0];
  const mesInicio = hoje.slice(0, 7) + "-01";
  const [{ count: osHoje }, { count: osMes }, { data: fat }] = await Promise.all([
    supabaseAdmin.from("ordens_servico").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("data_entrada", hoje),
    supabaseAdmin.from("ordens_servico").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).gte("data_entrada", mesInicio),
    supabaseAdmin.from("ordens_servico").select("valor_final").eq("tenant_id", tenantId).gte("data_entrada", mesInicio).in("status", ["finalizado", "entregue"]),
  ]);
  const faturamentoMes = fat?.reduce((a, b) => a + (b.valor_final ?? 0), 0) ?? 0;
  const ticketMedio = fat?.length ? faturamentoMes / fat.length : 0;
  return { osHoje: osHoje ?? 0, osMes: osMes ?? 0, faturamentoMes, ticketMedio };
}

function IconWrench()    { return <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg> }
function IconUsers()     { return <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> }
function IconCar()       { return <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 3v4h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg> }
function IconCalendar()  { return <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> }
function IconDollar()    { return <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> }
function IconGear()      { return <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> }
function IconUser()      { return <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> }
function IconChart()     { return <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> }
function IconTV()        { return <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg> }
function IconSettings()  { return <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> }
function IconReceipt()   { return <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16l3-3 3 3 3-3 3 3V4a2 2 0 0 0-2-2z"/><line x1="8" y1="8" x2="16" y2="8"/><line x1="8" y1="12" x2="16" y2="12"/></svg> }
function IconCash()      { return <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 12h.01M18 12h.01"/></svg> }
function IconPercent()   { return <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg> }
function IconStar()      { return <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> }
function IconChatbot()   { return <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> }
function IconGlobe()     { return <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg> }
function IconWhatsApp()  { return <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg> }
function IconLock()      { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> }

const MODULOS_ATIVOS = [
  { href: "/ordens-de-servico", label: "ORDENS DE\nSERVIÇO", icon: <IconWrench /> },
  { href: "/clientes",          label: "CLIENTES",           icon: <IconUsers /> },
  { href: "/veiculos",          label: "VEÍCULOS",           icon: <IconCar /> },
  { href: "/agenda",            label: "AGENDA",             icon: <IconCalendar /> },
  { href: "/dashboard-financeiro", label: "FINANCEIRO",      icon: <IconDollar /> },
  { href: "/servicos",          label: "SERVIÇOS",           icon: <IconGear /> },
  { href: "/funcionarios",      label: "FUNCIONÁRIOS",       icon: <IconUser /> },
  { href: "/relatorios",        label: "RELATÓRIOS",         icon: <IconChart /> },
  { href: "/painel-tv",         label: "PAINEL TV",          icon: <IconTV />, newTab: true },
  { href: "/configuracoes",     label: "CONFIGURAÇÕES",      icon: <IconSettings /> },
];

const MODULOS_EM_BREVE = [
  { label: "ORÇAMENTOS",        icon: <IconReceipt />,   novo: false },
  { label: "CONTROLE DE\nCAIXA", icon: <IconCash />,    novo: false },
  { label: "COMISSÕES",         icon: <IconPercent />,   novo: true  },
  { label: "FIDELIDADE",        icon: <IconStar />,      novo: true  },
  { label: "CHATBOT",           icon: <IconChatbot />,   novo: true  },
  { label: "SITE PRÓPRIO",      icon: <IconGlobe />,     novo: true  },
  { label: "AUTOMAÇÃO\nWHATSAPP", icon: <IconWhatsApp />, novo: true },
];

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabaseAdmin.from("profiles").select("tenant_id, nome").eq("id", user!.id).single();
  const kpis = await getKPIs(profile?.tenant_id);
  const { count: recapCount } = await supabaseAdmin
    .from("vw_clientes_recap").select("*", { count: "exact", head: true })
    .eq("tenant_id", profile?.tenant_id ?? "");
  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="flex flex-col gap-6 max-w-6xl">
      <div>
        <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>Página Inicial</h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
          {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "OS Hoje",         value: String(kpis.osHoje) },
          { label: "OS no Mês",       value: String(kpis.osMes) },
          { label: "Faturamento/Mês", value: fmt(kpis.faturamentoMes) },
          { label: "Ticket Médio",    value: fmt(kpis.ticketMedio) },
        ].map(k => (
          <div key={k.label} className="kpi-card">
            <span className="kpi-label">{k.label}</span>
            <span className="kpi-value">{k.value}</span>
          </div>
        ))}
      </div>

      {/* Alerta de recap */}
      {(recapCount ?? 0) > 0 && (
        <a href="/clientes/recap" className="flex items-center gap-3 p-3 rounded-xl border"
          style={{ background:"rgba(196,30,58,0.08)", borderColor:"rgba(196,30,58,0.3)", textDecoration:"none" }}>
          <span className="text-xl">📞</span>
          <div className="flex-1">
            <p className="text-sm font-semibold" style={{ color:"var(--primary)" }}>
              {recapCount} {recapCount === 1 ? "cliente" : "clientes"} com retorno vencido
            </p>
            <p className="text-xs" style={{ color:"var(--text-muted)" }}>Clique para ver e acionar agora</p>
          </div>
          <span style={{ color:"var(--primary)" }}>→</span>
        </a>
      )}

      {/* Módulos ativos — cards vermelhos */}
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
        {MODULOS_ATIVOS.map(m => (
          <Link key={m.href} href={m.href} target={m.newTab ? "_blank" : undefined} className="modulo-card modulo-ativo">
            <div className="modulo-icon">{m.icon}</div>
            <span className="modulo-label">{m.label}</span>
          </Link>
        ))}
      </div>

      {/* Em breve — cards cinza com cadeado */}
      <div>
        <p className="text-xs font-semibold mb-3 uppercase tracking-widest" style={{ color: "var(--text-subtle)" }}>Em breve</p>
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
          {MODULOS_EM_BREVE.map(m => (
            <div key={m.label} className="modulo-card modulo-locked">
              {m.novo && <span className="modulo-new-badge">NEW</span>}
              <div className="modulo-icon modulo-lock-icon"><IconLock /></div>
              <div className="modulo-icon modulo-icon-locked">{m.icon}</div>
              <span className="modulo-label modulo-label-locked">{m.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
