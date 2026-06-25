import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import Link from "next/link";

export default async function DashFinanceiroPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabaseAdmin.from("profiles").select("tenant_id").eq("id", user!.id).single();
  const tid = profile!.tenant_id;

  const hoje = new Date();
  const hojeStr = hoje.toISOString().slice(0,10);
  const mesInicio = hojeStr.slice(0,7) + "-01";
  const semInicio = new Date(hoje); semInicio.setDate(hoje.getDate() - hoje.getDay());
  const semFim = new Date(semInicio); semFim.setDate(semInicio.getDate() + 6);
  const semInicioStr = semInicio.toISOString().slice(0,10);
  const semFimStr = semFim.toISOString().slice(0,10);
  const fmt = (v: number) => v.toLocaleString("pt-BR", { style:"currency", currency:"BRL" });

  const [
    { data: osHoje },
    { data: osMes },
    { data: osSemana },
    { data: produtos },
    { count: recapCount },
    { data: recapClientes },
    { data: ultimos30 },
  ] = await Promise.all([
    supabaseAdmin.from("ordens_servico").select("valor_final, status").eq("tenant_id", tid).eq("data_entrada", hojeStr),
    supabaseAdmin.from("ordens_servico").select("valor_final, status").eq("tenant_id", tid).gte("data_entrada", mesInicio),
    supabaseAdmin.from("ordens_servico").select("valor_final, status, data_entrada, clientes(nome), veiculos(modelo,placa)")
      .eq("tenant_id", tid).gte("data_entrada", semInicioStr).lte("data_entrada", semFimStr),
    supabaseAdmin.from("produtos").select("custo_unitario, estoque_atual").eq("tenant_id", tid).eq("ativo", true),
    supabaseAdmin.from("vw_clientes_recap").select("*", { count:"exact", head:true }).eq("tenant_id", tid),
    supabaseAdmin.from("vw_clientes_recap").select("cliente_id").eq("tenant_id", tid).limit(100),
    supabaseAdmin.from("ordens_servico").select("valor_final, data_entrada, status")
      .eq("tenant_id", tid).gte("data_entrada", new Date(Date.now()-30*86400000).toISOString().slice(0,10))
      .in("status",["finalizado","entregue"]).order("data_entrada"),
  ]);

  // KPIs financeiros
  const faturadoHoje = (osHoje??[]).filter((o:any) => ["finalizado","entregue"].includes(o.status)).reduce((s:number,o:any) => s+(o.valor_final??0),0);
  const faturadoMes  = (osMes ??[]).filter((o:any) => ["finalizado","entregue"].includes(o.status)).reduce((s:number,o:any) => s+(o.valor_final??0),0);
  const osAbertas    = (osMes ??[]).filter((o:any) => !["finalizado","entregue","recusado"].includes(o.status)).length;
  const valorAberto  = (osMes ??[]).filter((o:any) => !["finalizado","entregue","recusado"].includes(o.status)).reduce((s:number,o:any) => s+(o.valor_final??0),0);

  // Estoque
  const valorEstoque = (produtos??[]).reduce((s:number,p:any) => s+(p.custo_unitario*(p.estoque_atual??0)),0);

  // Agenda semana
  const valorSemana = (osSemana??[]).filter((o:any) => ["finalizado","entregue"].includes(o.status)).reduce((s:number,o:any)=>s+(o.valor_final??0),0);
  const prevSemana  = (osSemana??[]).filter((o:any) => !["recusado"].includes(o.status)).reduce((s:number,o:any)=>s+(o.valor_final??0),0);

  // Recap potencial (ticket médio dos clientes em risco)
  let recapPotencial = 0;
  if ((recapClientes?.length??0) > 0) {
    const ids = recapClientes!.map((c:any) => c.cliente_id);
    const { data: osRecap } = await supabaseAdmin.from("ordens_servico")
      .select("valor_final, cliente_id").eq("tenant_id", tid).in("cliente_id", ids).in("status",["finalizado","entregue"]);
    const totalRecap = (osRecap??[]).reduce((s:number,o:any)=>s+(o.valor_final??0),0);
    const ticketMedio = osRecap?.length ? totalRecap/osRecap.length : 0;
    recapPotencial = ticketMedio * (recapCount??0);
  }

  // Últimos 30 dias — agrupar por dia para mini-gráfico
  const por30: Record<string,number> = {};
  (ultimos30??[]).forEach((o:any) => {
    por30[o.data_entrada] = (por30[o.data_entrada]??0) + (o.valor_final??0);
  });
  const dias30 = Array.from({length:30},(_,i)=>{
    const d = new Date(Date.now()-(29-i)*86400000).toISOString().slice(0,10);
    return { d, v: por30[d]??0 };
  });
  const max30 = Math.max(...dias30.map(d=>d.v), 1);

  return (
    <div className="flex flex-col gap-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold" style={{ color:"var(--text)" }}>💰 Painel Financeiro</h1>
        <p className="text-sm mt-0.5" style={{ color:"var(--text-muted)" }}>
          {hoje.toLocaleDateString("pt-BR",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}
        </p>
      </div>

      {/* KPIs principais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="kpi-card">
          <span className="kpi-label">💵 Faturado Hoje</span>
          <span className="kpi-value" style={{ color:"var(--success)" }}>{fmt(faturadoHoje)}</span>
          <span className="kpi-sub">{(osHoje??[]).filter((o:any)=>["finalizado","entregue"].includes(o.status)).length} OS finalizadas</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">📅 Faturado no Mês</span>
          <span className="kpi-value">{fmt(faturadoMes)}</span>
          <span className="kpi-sub">{(osMes??[]).filter((o:any)=>["finalizado","entregue"].includes(o.status)).length} OS pagas</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">⏳ Em Aberto (mês)</span>
          <span className="kpi-value" style={{ color:"var(--warning)" }}>{fmt(valorAberto)}</span>
          <span className="kpi-sub">{osAbertas} OS em andamento</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">📦 Valor em Estoque</span>
          <span className="kpi-value" style={{ color:"var(--info)" }}>{fmt(valorEstoque)}</span>
          <span className="kpi-sub">{produtos?.length ?? 0} produtos cadastrados</span>
        </div>
      </div>

      {/* Semana + Recap */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Agenda da semana */}
        <div className="card p-0">
          <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor:"var(--border)" }}>
            <h2 className="font-semibold" style={{ color:"var(--text)" }}>📅 Agenda da Semana</h2>
            <div className="text-right">
              <p className="text-xs" style={{ color:"var(--text-muted)" }}>Realizado</p>
              <p className="font-bold" style={{ color:"var(--success)" }}>{fmt(valorSemana)}</p>
            </div>
          </div>
          <div className="p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between text-sm">
              <span style={{ color:"var(--text-muted)" }}>Total previsto</span>
              <span className="font-medium" style={{ color:"var(--text)" }}>{fmt(prevSemana)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span style={{ color:"var(--text-muted)" }}>OSs na semana</span>
              <span className="font-medium" style={{ color:"var(--text)" }}>{(osSemana??[]).length}</span>
            </div>
            <div className="divider" />
            {(osSemana??[]).slice(0,5).map((os:any) => (
              <div key={os.id??Math.random()} className="flex items-center justify-between text-sm">
                <span style={{ color:"var(--text)" }}>{os.clientes?.nome} · <span style={{ color:"var(--text-muted)" }}>{os.veiculos?.modelo}</span></span>
                <span style={{ color:"var(--primary)" }}>{fmt(os.valor_final??0)}</span>
              </div>
            ))}
            {(osSemana??[]).length > 5 && <p className="text-xs text-center" style={{ color:"var(--text-subtle)" }}>+{(osSemana??[]).length-5} mais</p>}
            {!(osSemana??[]).length && <p className="text-sm text-center py-2" style={{ color:"var(--text-subtle)" }}>Nenhuma OS esta semana</p>}
          </div>
        </div>

        {/* Recap potencial */}
        <div className="card p-0">
          <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor:"var(--border)" }}>
            <h2 className="font-semibold" style={{ color:"var(--text)" }}>📞 Potencial de Recap</h2>
            <div className="text-right">
              <p className="text-xs" style={{ color:"var(--text-muted)" }}>Se retornarem</p>
              <p className="font-bold" style={{ color:"var(--primary)" }}>{fmt(recapPotencial)}</p>
            </div>
          </div>
          <div className="p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between text-sm">
              <span style={{ color:"var(--text-muted)" }}>Clientes com retorno vencido</span>
              <span className="font-semibold" style={{ color:"var(--danger)" }}>{recapCount ?? 0}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span style={{ color:"var(--text-muted)" }}>Receita potencial estimada</span>
              <span className="font-semibold" style={{ color:"var(--primary)" }}>{fmt(recapPotencial)}</span>
            </div>
            <div className="divider" />
            <p className="text-xs" style={{ color:"var(--text-subtle)" }}>
              Baseado no ticket médio histórico de cada cliente em risco. Acione o N8N para disparar o chatbot automaticamente.
            </p>
            <Link href="/clientes/recap" className="btn btn-primary btn-sm w-full text-center">
              Ver e Acionar Clientes →
            </Link>
          </div>
        </div>
      </div>

      {/* Gráfico últimos 30 dias */}
      <div className="card">
        <h2 className="font-semibold mb-4" style={{ color:"var(--text)" }}>📈 Faturamento — Últimos 30 dias</h2>
        <div className="flex items-end gap-0.5 h-28">
          {dias30.map(({ d, v }) => (
            <div key={d} className="flex-1 flex flex-col items-center gap-0.5 group relative" title={`${new Date(d+"T12:00").toLocaleDateString("pt-BR")}: ${fmt(v)}`}>
              <div className="w-full rounded-sm transition-all" style={{
                height: `${(v/max30)*100}%`, minHeight: v>0?4:0,
                background: v>0 ? "var(--primary)" : "var(--border)",
                opacity: v>0 ? 1 : 0.4,
              }} />
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2 text-xs" style={{ color:"var(--text-subtle)" }}>
          <span>{new Date(Date.now()-29*86400000).toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit"})}</span>
          <span>Total: {fmt(dias30.reduce((s,d)=>s+d.v,0))}</span>
          <span>Hoje</span>
        </div>
      </div>
    </div>
  );
}
