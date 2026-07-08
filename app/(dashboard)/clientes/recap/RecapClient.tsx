"use client";
import { useState, useMemo } from "react";
import Link from "next/link";

type Cliente = { id: string; nome: string; telefone?: string; whatsapp?: string; cidade?: string; };
type Ordem   = { id: string; cliente_id: string; data_entrada: string; finalizado_em?: string; status: string; valor_final?: number; os_servicos?: { nome: string; servicos?: { tempo_retorno_dias?: number } }[]; };

type ClienteRecap = {
  cliente: Cliente;
  totalVisitas: number;
  ultimaVisita: string | null;
  diasSemVisita: number;
  ticketMedio: number;
  servicos: string[];
  tempoRetorno: number;
  bucket: "enviado" | "verde" | "azul" | "amarelo" | "vermelho";
};

function calcDias(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr + "T12:00").getTime()) / 86400000);
}

/* ── Bucket de cores ── */
const BUCKET = {
  enviado:  { label:"Enviado",         cor:"#16a34a", bg:"rgba(22,163,74,0.12)",  icon:"✓",  desc:"Contato realizado" },
  verde:    { label:"Ativo",           cor:"#16a34a", bg:"rgba(22,163,74,0.09)",  icon:"●",  desc:"Última visita recente" },
  azul:     { label:"Contatar agora",  cor:"#2563eb", bg:"rgba(37,99,235,0.1)",   icon:"◆",  desc:"15–30 dias" },
  amarelo:  { label:"Próximo",         cor:"#d97706", bg:"rgba(217,119,6,0.1)",   icon:"▲",  desc:"30–60 dias" },
  vermelho: { label:"Crítico",         cor:"#dc2626", bg:"rgba(220,38,38,0.1)",   icon:"!",  desc:"+60 dias ou sem histórico" },
};

function getBucket(dias: number, totalVisitas: number, enviado: boolean, tempoRetorno: number): ClienteRecap["bucket"] {
  if (enviado) return "enviado";
  if (totalVisitas === 0) return "vermelho";
  const t = tempoRetorno;
  if (dias <= Math.round(t * 0.6)) return "verde";     // dentro do prazo confortavel
  if (dias <= t) return "azul";                          // chegando no prazo - contatar
  if (dias <= Math.round(t * 1.5)) return "amarelo";   // passou um pouco
  return "vermelho";                                     // passou muito
}

export default function RecapClient({ clientes, ordens, webhookN8n, nomeLoja }: {
  clientes: Cliente[]; ordens: Ordem[]; webhookN8n: string; nomeLoja: string;
}) {
  const [busca, setBusca]         = useState("");
  const [filtro, setFiltro]       = useState<"todos"|"vermelho"|"amarelo"|"azul"|"verde"|"enviado">("todos");
  const [selecionados, setSel]    = useState<Set<string>>(new Set());
  const [enviando, setEnviando]   = useState(false);
  const [enviados, setEnviados]   = useState<Set<string>>(new Set());
  const [showConfig, setShowCfg]  = useState(false);
  const [webhookUrl, setWh]       = useState(webhookN8n);
  const [msgTemplate, setMsg]     = useState(
    `Ola {nome}! Faz um tempo que nao te vemos no ${nomeLoja}. Que tal agendar uma visita para seu carro? Te esperamos! 🚗✨`
  );

  const recap: ClienteRecap[] = useMemo(() => {
    return clientes.map(c => {
      const ords = ordens.filter(o => o.cliente_id === c.id);
      const ultimaVisita = ords[0]?.data_entrada ?? null;
      const diasSemVisita = ultimaVisita ? calcDias(ultimaVisita) : 9999;
      const totalVisitas  = ords.length;
      const totalGasto    = ords.reduce((s, o) => s + (o.valor_final ?? 0), 0);
      const ticketMedio   = totalVisitas > 0 ? totalGasto / totalVisitas : 0;
      const servicos      = [...new Set(ords.flatMap(o => (o.os_servicos ?? []).map(s => s.nome)))].slice(0, 3);
      const tempos = ords[0]?.os_servicos?.map(s => s.servicos?.tempo_retorno_dias ?? 0).filter(t => t > 0) ?? [];
      const tempoRetorno = tempos.length ? Math.max(...tempos) : 30;
      const bucket        = getBucket(diasSemVisita, totalVisitas, enviados.has(c.id), tempoRetorno);
      return { cliente: c, totalVisitas, ultimaVisita, diasSemVisita, ticketMedio, servicos, tempoRetorno, bucket };
    });
  }, [clientes, ordens, enviados]);

  const countBy = (b: string) => recap.filter(x => x.bucket === b).length;

  const filtrado = useMemo(() => {
    let r = recap;
    if (filtro !== "todos") r = r.filter(x => x.bucket === filtro);
    if (busca) r = r.filter(x => x.cliente.nome.toLowerCase().includes(busca.toLowerCase()) || (x.cliente.whatsapp ?? "").includes(busca));
    const order: Record<string, number> = { vermelho:0, amarelo:1, azul:2, verde:3, enviado:4 };
    return [...r].sort((a,b) => (order[a.bucket]??5)-(order[b.bucket]??5) || b.diasSemVisita-a.diasSemVisita);
  }, [recap, filtro, busca]);

  function toggle(id: string) { setSel(p => { const n=new Set(p); n.has(id)?n.delete(id):n.add(id); return n; }); }
  function selAll() { setSel(new Set(filtrado.map(x=>x.cliente.id))); }

  function montarMsg(nome: string) { return msgTemplate.replace("{nome}", nome.split(" ")[0]); }
  function abrirWa(c: Cliente) {
    const tel = (c.whatsapp||c.telefone||"").replace(/\D/g,"");
    if (!tel) return alert("Cliente sem WhatsApp");
    window.open(`https://wa.me/55${tel}?text=${encodeURIComponent(montarMsg(c.nome))}`, "_blank");
  }

  async function disparar(ids: string[]) {
    if (!webhookUrl) { setShowCfg(true); return; }
    setEnviando(true);
    for (const r of recap.filter(x=>ids.includes(x.cliente.id))) {
      const tel = (r.cliente.whatsapp||r.cliente.telefone||"").replace(/\D/g,"");
      if (!tel) continue;
      try {
        await fetch(webhookUrl, { method:"POST", headers:{"Content-Type":"application/json"},
          body: JSON.stringify({ nome:r.cliente.nome, telefone:tel, mensagem:montarMsg(r.cliente.nome), dias_sem_visita:r.diasSemVisita, ultima_visita:r.ultimaVisita }) });
        setEnviados(p=>new Set([...p,r.cliente.id]));
      } catch {}
    }
    setEnviando(false); setSel(new Set());
  }

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color:"var(--text)" }}>Recap de Clientes</h1>
          <p className="text-sm mt-1" style={{ color:"var(--text-muted)" }}>Clientes classificados pelo tempo desde o último serviço</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary btn-sm" onClick={()=>setShowCfg(!showConfig)}>
            {webhookUrl ? "⚡ n8n Conectado" : "Configurar n8n"}
          </button>
          {selecionados.size > 0 && (
            <button className="btn btn-primary" disabled={enviando} onClick={()=>disparar([...selecionados])}>
              {enviando ? "Enviando..." : `Disparar n8n (${selecionados.size})`}
            </button>
          )}
        </div>
      </div>

      {/* Config n8n */}
      {showConfig && (
        <div className="card flex flex-col gap-3" style={{ borderLeft:"3px solid var(--primary)" }}>
          <h3 className="font-semibold text-sm" style={{ color:"var(--text)" }}>Webhook n8n</h3>
          <div className="flex gap-3">
            <input className="input flex-1" value={webhookUrl} onChange={e=>setWh(e.target.value)} placeholder="https://n8n.dominio.com/webhook/..." />
            <button className="btn btn-primary btn-sm" onClick={async()=>{
              await fetch("/api/configuracoes",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({webhook_n8n:webhookUrl})});
              setShowCfg(false);
            }}>Salvar</button>
          </div>
          <div className="field">
            <label className="label text-xs">Mensagem template</label>
            <textarea className="input" rows={3} value={msgTemplate} onChange={e=>setMsg(e.target.value)} />
            <p className="text-xs mt-1" style={{ color:"var(--text-muted)" }}>Use {"{nome}"} para o primeiro nome</p>
          </div>
        </div>
      )}

      {/* KPIs coloridos */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {(["vermelho","amarelo","azul","verde","enviado"] as const).map(b => (
          <div key={b} className="kpi-card" style={{ borderLeft:`4px solid ${BUCKET[b].cor}`, cursor:"pointer" }}
            onClick={()=>setFiltro(f=>f===b?"todos":b)}>
            <div className="flex items-center justify-between">
              <p className="kpi-label" style={{ color:BUCKET[b].cor }}>{BUCKET[b].label}</p>
              <span style={{ fontSize:18, color:BUCKET[b].cor }}>{BUCKET[b].icon}</span>
            </div>
            <p className="kpi-value" style={{ color:BUCKET[b].cor }}>{countBy(b)}</p>
            <p className="text-xs" style={{ color:"var(--text-muted)" }}>{BUCKET[b].desc}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap items-center">
        <input className="input" style={{ maxWidth:240 }} placeholder="Buscar cliente..." value={busca} onChange={e=>setBusca(e.target.value)} />
        <button className={`btn btn-sm ${filtro==="todos"?"btn-primary":"btn-secondary"}`} onClick={()=>setFiltro("todos")}>
          Todos ({clientes.length})
        </button>
        {(["vermelho","amarelo","azul","verde","enviado"] as const).map(b=>(
          <button key={b} className={`btn btn-sm ${filtro===b?"btn-primary":"btn-secondary"}`}
            style={filtro===b?{}:{ borderColor:BUCKET[b].cor, color:BUCKET[b].cor }}
            onClick={()=>setFiltro(f=>f===b?"todos":b)}>
            {BUCKET[b].icon} {BUCKET[b].label} ({countBy(b)})
          </button>
        ))}
        {filtrado.length>0 && (
          <button className="btn btn-ghost btn-sm ml-auto" onClick={selAll}>Sel. todos ({filtrado.length})</button>
        )}
      </div>

      {/* Lista */}
      <div className="flex flex-col gap-2">
        {filtrado.length===0 ? (
          <div className="card p-10 text-center" style={{ color:"var(--text-muted)" }}>Nenhum cliente encontrado</div>
        ) : filtrado.map(x => {
          const b = BUCKET[x.bucket];
          const sel = selecionados.has(x.cliente.id);
          const dias = x.diasSemVisita;
          const diasLabel = x.totalVisitas===0 ? "Sem histórico" : dias===9999 ? "Sem histórico" : dias===0 ? "Hoje" : `${dias} dia${dias!==1?"s":""} atrás`;

          // barra de "urgência" visual: 0-90 dias
          const pct = Math.min(100, x.totalVisitas===0 ? 100 : Math.round((Math.min(dias,90)/90)*100));

          return (
            <div key={x.cliente.id} className="card" style={{
              borderLeft:`4px solid ${b.cor}`,
              padding:"14px 18px",
              background: sel ? `${b.bg}` : "var(--bg-card)",
              transition:"background 0.15s",
            }}>
              <div className="flex items-start gap-4">
                <input type="checkbox" checked={sel} onChange={()=>toggle(x.cliente.id)}
                  style={{ width:16,height:16,cursor:"pointer",flexShrink:0,marginTop:3 }} />

                {/* Badge círculo com ícone */}
                <div style={{
                  width:40,height:40,borderRadius:"50%",background:b.bg,
                  display:"flex",alignItems:"center",justifyContent:"center",
                  flexShrink:0,fontSize:16,color:b.cor,fontWeight:900,
                }}>
                  {x.totalVisitas===0 ? "?" : b.icon}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link href={`/clientes/${x.cliente.id}`} className="font-semibold hover:underline" style={{ color:"var(--text)", fontSize:15 }}>
                      {x.cliente.nome}
                    </Link>
                    <span style={{ fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:12,background:b.bg,color:b.cor,textTransform:"uppercase" }}>
                      {b.label}
                    </span>
                    {enviados.has(x.cliente.id) && (
                      <span style={{ fontSize:11,color:"#16a34a",fontWeight:700 }}>✓ Enviado</span>
                    )}
                  </div>

                  {/* Último serviço + barra */}
                  <div className="flex items-center gap-3 mt-2">
                    <div style={{ flex:1 }}>
                      <div className="flex justify-between mb-1" style={{ fontSize:11, color:"var(--text-muted)" }}>
                        <span>Último serviço</span>
                        <span style={{ fontWeight:700,color:b.cor }}>{diasLabel}</span>
                      </div>
                      <div style={{ height:5,borderRadius:4,background:"var(--border)",overflow:"hidden" }}>
                        <div style={{ height:"100%",width:`${pct}%`,background:b.cor,borderRadius:4,transition:"width 0.4s" }} />
                      </div>
                      {x.ultimaVisita && (
                        <div style={{ fontSize:10,color:"var(--text-muted)",marginTop:2 }}>
                          {new Date(x.ultimaVisita+"T12:00").toLocaleDateString("pt-BR",{day:"2-digit",month:"short",year:"numeric"})}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Meta info */}
                  <div className="flex gap-4 mt-2 flex-wrap" style={{ fontSize:12,color:"var(--text-muted)" }}>
                    <span>🔁 {x.totalVisitas} {x.totalVisitas===1?"visita":"visitas"}</span>
                    {x.ticketMedio>0 && <span>💰 Ticket R$ {x.ticketMedio.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g,",")}</span>}
                    {x.servicos.length>0 && <span>⚙️ {x.servicos.join(", ")}</span>}
                    {x.cliente.cidade && <span>📍 {x.cliente.cidade}</span>}
                  </div>
                </div>

                {/* Ações */}
                <div className="flex flex-col gap-2 flex-shrink-0">
                  <button className="btn btn-sm" style={{ background:"#25d366",color:"#fff",border:"none",minWidth:100 }}
                    onClick={()=>abrirWa(x.cliente)}>
                    💬 WhatsApp
                  </button>
                  {webhookUrl && (
                    <button className="btn btn-sm btn-primary" disabled={enviando||enviados.has(x.cliente.id)}
                      onClick={()=>disparar([x.cliente.id])} style={{ minWidth:100 }}>
                      {enviados.has(x.cliente.id) ? "✓ Enviado" : "⚡ n8n"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
