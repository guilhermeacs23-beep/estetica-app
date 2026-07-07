"use client";
import { useState, useRef, useEffect } from "react";
import ClienteAutocomplete from "@/components/ClienteAutocomplete";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style:"currency", currency:"BRL" });

/* ── Status config ── */
const ST: Record<string, { label:string; color:string; bg:string; gradient:string }> = {
  pendente:  { label:"Pendente",  color:"#b45309", bg:"#fef3c7", gradient:"linear-gradient(90deg, transparent 70%, rgba(245,158,11,0.12) 100%)" },
  aprovado:  { label:"Aprovado",  color:"#065f46", bg:"#d1fae5", gradient:"linear-gradient(90deg, transparent 70%, rgba(16,185,129,0.12) 100%)" },
  recusado:  { label:"Recusado",  color:"#991b1b", bg:"#fee2e2", gradient:"linear-gradient(90deg, transparent 70%, rgba(239,68,68,0.12) 100%)" },
  expirado:  { label:"Expirado",  color:"#6b7280", bg:"#f3f4f6", gradient:"linear-gradient(90deg, transparent 70%, rgba(156,163,175,0.10) 100%)" },
};

/* ── Card colors for Dividido view ── */
const CARD_BG: Record<string, string> = {
  pendente:  "#f59e0b",
  aprovado:  "#10b981",
  recusado:  "#ef4444",
  expirado:  "#9ca3af",
};

interface Cliente { id: string; nome: string; telefone?: string; whatsapp?: string; }
interface Servico { id: string; nome: string; preco_base: number; descricao?: string; }
interface Orcamento {
  id: string; numero?: number; status: string; valor_total: number; validade?: string;
  created_at?: string; os_id?: string;
  clientes?: { nome: string; whatsapp?: string; telefone?: string };
  nome_avulso?: string; placa_avulsa?: string; modelo_avulso?: string;
  orcamento_servicos?: { servico_nome: string; descricao?: string; preco: number; quantidade: number }[];
}
interface Item { servico_id: string; servico_nome: string; descricao?: string; preco: string; quantidade: string; }

/* ── Serviço autocomplete ── */
function ServicoAutocomplete({ servicos, item, onChange }: { servicos: Servico[]; item: Item; onChange: (k:string,v:string)=>void }) {
  const [query, setQuery] = useState(item.servico_nome || "");
  const [open, setOpen] = useState(false);
  const filtered = query.length >= 1 ? servicos.filter(s => s.nome.toLowerCase().includes(query.toLowerCase())).slice(0,8) : servicos.slice(0,8);
  function pick(s: Servico) {
    setQuery(s.nome); setOpen(false);
    onChange("servico_id", s.id); onChange("servico_nome", s.nome);
    onChange("descricao", s.descricao ?? ""); onChange("preco", String(s.preco_base));
  }
  return (
    <div style={{ position:"relative", flex:1 }}>
      <input className="input" value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); onChange("servico_nome", e.target.value); }}
        onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Buscar servico..." />
      {open && filtered.length > 0 && (
        <div style={{ position:"absolute", top:"100%", left:0, right:0, zIndex:200,
          background:"var(--bg-sidebar)", border:"1px solid var(--border)", borderRadius:8,
          marginTop:2, boxShadow:"0 8px 24px rgba(0,0,0,0.18)", maxHeight:200, overflowY:"auto" }}>
          {filtered.map(s => (
            <button key={s.id} type="button" onMouseDown={() => pick(s)}
              style={{ display:"flex", justifyContent:"space-between", width:"100%", padding:"8px 12px",
                background:"none", border:"none", cursor:"pointer", borderBottom:"1px solid var(--border)" }}
              onMouseOver={e => (e.currentTarget.style.background = "var(--bg-card)")}
              onMouseOut={e => (e.currentTarget.style.background = "none")}>
              <span style={{ fontSize:13, color:"var(--text)", fontWeight:500 }}>{s.nome}</span>
              <span style={{ fontSize:12, color:"var(--primary)", fontWeight:600 }}>R$ {s.preco_base.toFixed(2).replace(".",",")}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Modal criar cliente rápido ── */
function ModalNovoCliente({ onClose, onCreated }: { onClose:()=>void; onCreated:(c:Cliente)=>void }) {
  const [nome, setNome] = useState(""); const [whatsapp, setWhatsapp] = useState(""); const [loading, setLoading] = useState(false);
  async function salvar(e: React.FormEvent) {
    e.preventDefault(); if (!nome.trim()) return; setLoading(true);
    const res = await fetch("/api/clientes", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ nome, whatsapp }) });
    const json = await res.json();
    if (json.id) { onCreated(json); onClose(); } else alert(json.error ?? "Erro");
    setLoading(false);
  }
  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ maxWidth:380 }}>
        <div className="modal-header"><h2 className="modal-title">Novo Cliente Rápido</h2><button onClick={onClose} className="modal-close">x</button></div>
        <form onSubmit={salvar} className="flex flex-col gap-4 p-6">
          <div className="field"><label className="label">Nome *</label><input className="input" value={nome} onChange={e=>setNome(e.target.value)} required autoFocus /></div>
          <div className="field"><label className="label">WhatsApp</label><input className="input" value={whatsapp} onChange={e=>setWhatsapp(e.target.value)} placeholder="(41) 99999-0000" /></div>
          <div className="flex justify-end gap-3">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading?"Salvando...":"Criar Cliente"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── 3-dot menu — usa position:fixed para escapar de overflow:hidden ── */
function MenuAcoes({ o, onExcluir, onAprovar, onWa }: { o:Orcamento; onExcluir:()=>void; onAprovar:()=>void; onWa:()=>void }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top:0, right:0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node) &&
          btnRef.current && !btnRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  function handleOpen() {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    setPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    setOpen(x => !x);
  }

  const acoes = [
    { label:"Visualizar",          icon:"👁", action:() => window.open(`/orcamento/${o.id}`,"_blank") },
    { label:"Chamar no WhatsApp",  icon:"💬", action: onWa },
    { label:"Aprovar",             icon:"✓",  action: onAprovar },
    { label:"Cancelar",            icon:"✕",  action: onExcluir },
  ];

  return (
    <>
      <button ref={btnRef} onClick={handleOpen}
        style={{ width:32, height:32, borderRadius:8, border:"1px solid var(--border)",
          background:"var(--bg-card)", color:"var(--text-muted)", cursor:"pointer",
          display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, fontWeight:700, flexShrink:0 }}>
        ⋮
      </button>
      {open && (
        <div ref={menuRef} style={{
          position:"fixed", top:pos.top, right:pos.right, zIndex:9999,
          background:"var(--bg-card)", border:"1px solid var(--border)", borderRadius:12,
          boxShadow:"0 8px 32px rgba(0,0,0,0.25)", minWidth:200, overflow:"hidden",
        }}>
          {acoes.map(item => (
            <button key={item.label} onClick={() => { item.action(); setOpen(false); }}
              style={{ display:"flex", alignItems:"center", gap:10, width:"100%", padding:"11px 16px",
                background:"none", border:"none", cursor:"pointer", textAlign:"left",
                fontSize:13, color: item.label === "Cancelar" ? "var(--danger)" : "var(--text)",
                borderBottom:"1px solid var(--border)" }}
              onMouseOver={e => (e.currentTarget.style.background = "var(--bg)")}
              onMouseOut={e => (e.currentTarget.style.background = "none")}>
              <span style={{ fontSize:15, minWidth:18 }}>{item.icon}</span> {item.label}
            </button>
          ))}
        </div>
      )}
    </>
  );
}

const ORIGIN = typeof window !== "undefined" ? window.location.origin : "https://estetica-app-theta.vercel.app";
function buildWaMsg(o: Orcamento) {
  const nome = (o.clientes?.nome ?? o.nome_avulso ?? "Cliente").split(" ")[0];
  const placa = o.placa_avulsa ?? "";
  const link = `${ORIGIN}/orcamento/${o.id}`;
  const itens = o.orcamento_servicos ?? [];
  const listaServicos = itens.map(i => {
    const preco = fmt(Number(i.preco) * (i.quantidade ?? 1));
    const desc = i.descricao ? `\n_${i.descricao}_` : "";
    const qtd = (i.quantidade ?? 1) > 1 ? ` (x${i.quantidade})` : "";
    return `*${i.servico_nome}*${qtd} - ${preco}${desc}`;
  }).join("\n\n");
  const veiculo = placa ? `\nVeiculo: *${placa}*` : "";
  const servicos = listaServicos ? `\n\nServicos:\n${listaServicos}` : "";
  const msg = `Ola *${nome}*! Seu orcamento *#${o.numero ?? ""}* esta pronto.${veiculo}${servicos}\n\nTotal: *${fmt(o.valor_total)}*\n\nVeja aqui: ${link}\n\nQualquer duvida e so chamar!`;
  return encodeURIComponent(msg);
}

/* ══════════════════════════════════════════════ */
export default function OrcamentosList({
  orcamentos: inicial, clientes, servicos,
}: { orcamentos: Orcamento[]; clientes: Cliente[]; servicos: Servico[] }) {
  const [lista, setLista] = useState(inicial);
  const [view, setView] = useState<"dividido"|"agrupado">("dividido");
  const [showForm, setShowForm] = useState(false);
  const [showModalCliente, setShowModalCliente] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");

  /* form state */
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente|null>(null);
  const [nomeAvulso, setNomeAvulso] = useState("");
  const [placa, setPlaca] = useState(""); const [modelo, setModelo] = useState("");
  const [veiculosCliente, setVeiculosCliente] = useState<{id:string;placa:string;modelo:string}[]>([]);
  const [veiculoId, setVeiculoId] = useState("");
  const [validade, setValidade] = useState(new Date(Date.now()+7*86400000).toISOString().slice(0,10));
  const [observacoes, setObservacoes] = useState("");
  const [descontoValor, setDescontoValor] = useState("0");
  const [descontoTipo, setDescontoTipo] = useState<"R$"|"%">("R$");
  const [itens, setItens] = useState<Item[]>([]);

  const subtotal = itens.reduce((s,i) => s+(parseFloat(i.preco)||0)*(parseInt(i.quantidade)||1), 0);
  const descontoNum = parseFloat(descontoValor)||0;
  const descontoFinal = descontoTipo === "%" ? subtotal*descontoNum/100 : descontoNum;
  const total = Math.max(0, subtotal-descontoFinal);

  /* KPIs */
  const kpiTotal    = lista.reduce((s,o) => s + o.valor_total, 0);
  const kpiAprov    = lista.filter(o=>o.status==="aprovado").reduce((s,o)=>s+o.valor_total,0);
  const kpiPend     = lista.filter(o=>o.status==="pendente").reduce((s,o)=>s+o.valor_total,0);
  const kpiCancel   = lista.filter(o=>o.status==="recusado").length;

  /* filtro */
  const listFiltrada = lista.filter(o => {
    const nome = (o.clientes?.nome ?? o.nome_avulso ?? "").toLowerCase();
    const matchBusca = busca.length < 2 || nome.includes(busca.toLowerCase()) || String(o.numero).includes(busca);
    const matchStatus = filtroStatus === "todos" || o.status === filtroStatus;
    return matchBusca && matchStatus;
  });

  /* agrupar por data */
  const agrupado: Record<string, Orcamento[]> = {};
  listFiltrada.forEach(o => {
    const dt = o.created_at ? new Date(o.created_at).toLocaleDateString("pt-BR",{weekday:"long",day:"numeric",month:"long"}) : "Sem data";
    const key = dt.charAt(0).toUpperCase() + dt.slice(1);
    if (!agrupado[key]) agrupado[key] = [];
    agrupado[key].push(o);
  });

  function setItem(i:number,k:string,v:string) { setItens(p=>p.map((x,idx)=>idx!==i?x:{...x,[k]:v})); }
  function resetForm() {
    setShowForm(false); setNomeAvulso(""); setPlaca(""); setModelo(""); setItens([]);
    setDescontoValor("0"); setDescontoTipo("R$"); setObservacoes("");
    setClienteSelecionado(null); setVeiculosCliente([]); setVeiculoId("");
  }

  async function salvar() {
    if (!itens.length) { alert("Adicione ao menos um servico"); return; }
    setLoading(true);
    const res = await fetch("/api/orcamentos", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({
        clienteId: clienteSelecionado?.id ?? null,
        nomeAvulso: !clienteSelecionado ? nomeAvulso : null,
        placaAvulsa: placa, modeloAvulso: modelo,
        validade, observacoes, desconto: descontoFinal, valorTotal: total,
        itens: itens.map(i => ({ servico_id:i.servico_id, servico_nome:i.servico_nome, descricao:i.descricao??"", preco:parseFloat(i.preco)||0, quantidade:parseInt(i.quantidade)||1 })),
      }),
    });
    const data = await res.json();
    if (data.error) { alert(data.error); setLoading(false); return; }
    setLista(prev => [data, ...prev]);
    resetForm(); setLoading(false);
  }

  async function excluir(id:string) {
    if (!confirm("Cancelar este orcamento?")) return;
    await fetch("/api/orcamentos",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({id})});
    setLista(prev=>prev.filter(o=>o.id!==id));
  }

  async function aprovar(id:string) {
    await fetch(`/api/orcamentos/${id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status:"aprovado"})});
    setLista(prev=>prev.map(o=>o.id===id?{...o,status:"aprovado"}:o));
  }

  function abrirWa(o:Orcamento) {
    const tel = (o.clientes?.whatsapp||o.clientes?.telefone||"").replace(/\D/g,"");
    const msg = buildWaMsg(o);
    window.open(tel?`https://wa.me/55${tel}?text=${msg}`:`https://wa.me/?text=${msg}`,"_blank");
  }

  return (
    <div className="flex flex-col gap-0" style={{ margin:-24 }}>

      {showModalCliente && <ModalNovoCliente onClose={()=>setShowModalCliente(false)} onCreated={c=>{setClienteSelecionado(c);setNomeAvulso(c.nome);}} />}

      {/* ── Header ── */}
      <div style={{ padding:"20px 24px 0", borderBottom:"1px solid var(--border)", background:"var(--bg-sidebar)" }}>
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2" style={{ color:"var(--text)", fontWeight:700, fontSize:16 }}>
              <span style={{ fontSize:18 }}>📄</span> Orçamentos
            </div>
            <nav className="flex gap-1">
              {["Calendário","Lista"].map(t=>(
                <button key={t} style={{ padding:"6px 14px", borderRadius:8, border:"none",
                  background:"transparent", fontSize:13, color:"var(--text-muted)", cursor:"pointer" }}>{t}</button>
              ))}
            </nav>
          </div>
          <button className="btn btn-primary" onClick={()=>{if(showForm)resetForm();else setShowForm(true);}}>
            {showForm?"Cancelar":"+ Novo Orçamento"}
          </button>
        </div>
        {/* filtros */}
        <div className="flex items-center gap-3 pb-3 flex-wrap">
          <div style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 12px", borderRadius:20,
            background:"var(--bg-card)", border:"1px solid var(--border)", fontSize:12, color:"var(--text-muted)" }}>
            📅 {new Date().toLocaleDateString("pt-BR",{month:"2-digit",year:"numeric",day:"2-digit"}).replace("/","/").slice(0,5).padStart(5,"0")} · este mês
          </div>
          <div style={{ flex:1, minWidth:160, position:"relative" }}>
            <input placeholder="Buscar orçamentos..."
              value={busca} onChange={e=>setBusca(e.target.value)}
              className="input" style={{ paddingLeft:36, height:36, fontSize:13 }} />
            <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", color:"var(--text-muted)", pointerEvents:"none" }}>🔍</span>
          </div>
          {["todos","pendente","aprovado","recusado"].map(s=>(
            <button key={s} onClick={()=>setFiltroStatus(s)}
              style={{ padding:"5px 14px", borderRadius:20, border:"1px solid var(--border)",
                background: filtroStatus===s ? "var(--primary)" : "var(--bg-card)",
                color: filtroStatus===s ? "#fff" : "var(--text-muted)",
                fontSize:12, fontWeight:500, cursor:"pointer", textTransform:"capitalize" }}>
              {s === "todos" ? "Todos" : ST[s]?.label ?? s}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding:"20px 24px", flex:1 }}>
        {/* ── Formulário ── */}
        {showForm && (
          <div className="card flex flex-col gap-4 mb-6">
            <h2 className="font-semibold" style={{ color:"var(--text)" }}>Novo Orçamento</h2>
            <div className="field">
              <div className="flex items-center justify-between mb-1">
                <label className="label mb-0">Cliente</label>
                <button type="button" onClick={()=>setShowModalCliente(true)}
                  style={{ fontSize:12, padding:"3px 10px", borderRadius:20, border:"1px solid var(--primary)",
                    color:"var(--primary)", background:"var(--bg-card)", cursor:"pointer" }}>
                  + Criar novo cliente
                </button>
              </div>
              <ClienteAutocomplete selected={clienteSelecionado} onSelect={async c=>{
                setClienteSelecionado(c); setVeiculosCliente([]); setVeiculoId(""); setPlaca(""); setModelo("");
                if (!c) { setNomeAvulso(""); return; }
                setNomeAvulso(c.nome);
                const res = await fetch(`/api/veiculos?clienteId=${c.id}`);
                const json = await res.json();
                const veics = Array.isArray(json)?json:(json.data??[]);
                if (veics.length > 0) {
                  setVeiculosCliente(veics);
                  if (veics.length===1) { setPlaca(veics[0].placa??""); setModelo(veics[0].modelo??""); setVeiculoId(veics[0].id); }
                }
              }} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="field">
                <label className="label">Placa</label>
                {veiculosCliente.length>1 ? (
                  <select className="input" value={veiculoId} onChange={e=>{const v=veiculosCliente.find(x=>x.id===e.target.value);setVeiculoId(e.target.value);setPlaca(v?.placa??"");setModelo(v?.modelo??"");}}>
                    <option value="">Selecionar...</option>
                    {veiculosCliente.map(v=><option key={v.id} value={v.id}>{v.placa} · {v.modelo}</option>)}
                  </select>
                ) : <input className="input" value={placa} onChange={e=>setPlaca(e.target.value.toUpperCase())} placeholder="ABC1D23" />}
              </div>
              <div className="field">
                <label className="label">Modelo</label>
                <input className="input" value={modelo} onChange={e=>setModelo(e.target.value)} placeholder="Civic, Gol..."
                  readOnly={veiculosCliente.length>0} style={veiculosCliente.length>0?{background:"var(--bg)",color:"var(--text-muted)"}:{}} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="field">
                <label className="label">Validade</label>
                <input className="input" type="date" value={validade} onChange={e=>setValidade(e.target.value)} />
              </div>
              <div className="field">
                <label className="label">Desconto</label>
                <div style={{ display:"flex" }}>
                  <input className="input" type="number" min="0" step="0.01" value={descontoValor}
                    onChange={e=>setDescontoValor(e.target.value)} style={{ borderRadius:"8px 0 0 8px", flex:1 }} />
                  <button type="button" onClick={()=>setDescontoTipo(t=>t==="R$"?"%":"R$")}
                    style={{ padding:"0 14px", borderRadius:"0 8px 8px 0", border:"1px solid var(--border)", borderLeft:"none",
                      background:descontoTipo==="%"?"var(--primary)":"var(--bg-card)",
                      color:descontoTipo==="%"?"#fff":"var(--text-muted)", fontWeight:700, fontSize:13, cursor:"pointer", minWidth:42 }}>
                    {descontoTipo}
                  </button>
                </div>
                {descontoFinal>0&&<p className="text-xs mt-1" style={{color:"var(--text-muted)"}}>= {fmt(descontoFinal)}</p>}
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="label mb-0">Serviços *</label>
                <button className="btn btn-ghost btn-sm" onClick={()=>setItens(p=>[...p,{servico_id:"",servico_nome:"",descricao:"",preco:"",quantidade:"1"}])}>+ Adicionar</button>
              </div>
              {itens.map((it,i)=>(
                <div key={i} style={{display:"flex",gap:8,marginBottom:8,alignItems:"center"}}>
                  <ServicoAutocomplete servicos={servicos} item={it} onChange={(k,v)=>setItem(i,k,v)} />
                  <input className="input" type="number" min="1" value={it.quantidade} onChange={e=>setItem(i,"quantidade",e.target.value)} style={{width:56,flexShrink:0}} />
                  <input className="input" type="number" step="0.01" value={it.preco} onChange={e=>setItem(i,"preco",e.target.value)} style={{width:96,flexShrink:0}} />
                  <button className="btn btn-ghost btn-sm" style={{color:"var(--danger)"}} onClick={()=>setItens(p=>p.filter((_,idx)=>idx!==i))}>x</button>
                </div>
              ))}
              {itens.length>0&&(
                <div className="flex justify-end gap-4 text-sm mt-1" style={{color:"var(--text-muted)"}}>
                  <span>Sub: {fmt(subtotal)}</span>
                  {descontoFinal>0&&<span style={{color:"var(--danger)"}}>- {fmt(descontoFinal)}</span>}
                  <span className="font-bold" style={{color:"var(--text)"}}>Total: {fmt(total)}</span>
                </div>
              )}
            </div>
            <div className="field">
              <label className="label">Observações</label>
              <textarea className="input" rows={2} value={observacoes} onChange={e=>setObservacoes(e.target.value)} />
            </div>
            <div className="flex justify-end gap-3">
              <button className="btn btn-secondary" onClick={resetForm}>Cancelar</button>
              <button className="btn btn-primary" disabled={loading} onClick={salvar}>{loading?"Salvando...":"Salvar Orçamento"}</button>
            </div>
          </div>
        )}

        {/* ── KPIs resumo ── */}
        <div className="card mb-5" style={{ padding:"16px 20px" }}>
          <p className="text-xs font-semibold mb-3" style={{ color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.05em" }}>Resumo do período</p>
          <div className="grid grid-cols-4 gap-6">
            {[
              { label:`Total (${lista.length})`,     val: kpiTotal,  color:"var(--primary)" },
              { label:`Concluídos (${lista.filter(o=>o.status==="aprovado").length})`, val: kpiAprov, color:"#10b981" },
              { label:`Pendentes (${lista.filter(o=>o.status==="pendente").length})`,  val: kpiPend,  color:"#f59e0b" },
              { label:`Cancelados (${kpiCancel})`,   val: null,      color:"#ef4444" },
            ].map(k=>(
              <div key={k.label}>
                <p className="text-xs mb-1" style={{ color:"var(--text-muted)" }}>{k.label}</p>
                <p className="font-bold text-base" style={{ color:k.color }}>{k.val !== null ? fmt(k.val) : `${kpiCancel} orç.`}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Toggle view ── */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs" style={{ color:"var(--text-muted)" }}>Visualização:</span>
          {[["dividido","⊞ Quadros"],["agrupado","≡ Lista"]].map(([v,l])=>(
            <button key={v} onClick={()=>setView(v as any)}
              className="btn btn-sm"
              style={{ background: view===v ? "var(--primary)" : "var(--bg-card)",
                color: view===v ? "#fff" : "var(--text-muted)",
                border:"1px solid var(--border)", fontSize:12, padding:"5px 14px" }}>
              {l}
            </button>
          ))}
          <span className="text-xs ml-2" style={{ color:"var(--text-muted)" }}>{listFiltrada.length} orçamento{listFiltrada.length!==1?"s":""}</span>
        </div>

        {/* ── QUADROS view ── */}
        {view==="dividido" && (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(220px, 1fr))", gap:16 }}>
            {listFiltrada.length===0 && (
              <div style={{ gridColumn:"1/-1", textAlign:"center", padding:48, color:"var(--text-muted)" }}>
                Nenhum orçamento encontrado.
              </div>
            )}
            {listFiltrada.map(o=>{
              const nome = o.clientes?.nome ?? o.nome_avulso ?? "—";
              const placa = o.placa_avulsa ?? "";
              const nItens = o.orcamento_servicos?.length ?? 0;
              const cor = CARD_BG[o.status] ?? "#9ca3af";
              return (
                <div key={o.id} style={{ borderRadius:14, overflow:"hidden", border:"1px solid var(--border)",
                  background:"var(--bg-card)", cursor:"pointer", transition:"transform 0.15s, box-shadow 0.15s" }}
                  onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.transform="translateY(-3px)";(e.currentTarget as HTMLElement).style.boxShadow="0 8px 28px rgba(0,0,0,0.15)"}}
                  onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.transform="";(e.currentTarget as HTMLElement).style.boxShadow=""}}>
                  {/* card header colorido */}
                  <div style={{ background:cor, padding:"14px 16px" }}>
                    <p style={{ color:"rgba(255,255,255,0.85)", fontSize:11, fontWeight:600 }}>Orçamento #{o.numero}</p>
                    <p style={{ color:"#fff", fontSize:20, fontWeight:900, marginTop:2 }}>{fmt(o.valor_total)}</p>
                  </div>
                  <div style={{ padding:"12px 16px", display:"flex", flexDirection:"column", gap:6 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                      <span style={{ fontSize:13 }}>👤</span>
                      <span style={{ fontSize:13, fontWeight:500, color:"var(--text)" }}>{nome}</span>
                    </div>
                    {placa && (
                      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                        <span style={{ fontSize:13 }}>🚗</span>
                        <span style={{ fontSize:12, color:"var(--text-muted)" }}>{placa} {o.modelo_avulso ?? ""}</span>
                      </div>
                    )}
                    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                      <span style={{ fontSize:13 }}>⚙️</span>
                      <span style={{ fontSize:12, color:"var(--text-muted)" }}>{nItens} serviço{nItens!==1?"s":""}</span>
                    </div>
                    {o.clientes?.whatsapp && (
                      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                        <span style={{ fontSize:13 }}>💬</span>
                        <span style={{ fontSize:12, color:"var(--text-muted)" }}>{o.clientes.whatsapp}</span>
                      </div>
                    )}
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:4, paddingTop:8, borderTop:"1px solid var(--border)" }}>
                      <span className={`badge ${o.status==="aprovado"?"badge-finalizado":o.status==="recusado"?"badge-recusado":"badge-aguardando"}`} style={{ fontSize:10 }}>
                        {ST[o.status]?.label??o.status}
                      </span>
                      <div style={{ display:"flex", gap:6 }}>
                        <a href={`/orcamento/${o.id}`} target="_blank"
                          style={{ width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center",
                            borderRadius:6,border:"1px solid var(--border)",background:"var(--bg)",
                            textDecoration:"none",fontSize:14 }}>👁</a>
                        <button onClick={()=>abrirWa(o)}
                          style={{ width:28,height:28,borderRadius:6,border:"none",
                            background:"#25d366",color:"#fff",cursor:"pointer",fontSize:13 }}>W</button>
                        <MenuAcoes o={o} onExcluir={()=>excluir(o.id)} onAprovar={()=>aprovar(o.id)} onWa={()=>abrirWa(o)} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── LISTA view ── */}
        {view==="agrupado" && (
          <div className="flex flex-col gap-6">
            {Object.keys(agrupado).length===0 && (
              <p style={{ textAlign:"center", padding:40, color:"var(--text-muted)" }}>Nenhum orçamento encontrado.</p>
            )}
            {Object.entries(agrupado).map(([data, ors])=>(
              <div key={data}>
                <p className="text-xs font-semibold mb-2" style={{ color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.05em" }}>{data}</p>
                <div className="card p-0 overflow-hidden">
                  <table style={{ width:"100%", borderCollapse:"collapse" }}>
                    <thead>
                      <tr style={{ borderBottom:"1px solid var(--border)" }}>
                        {["Número","Cliente","Valor","Itens","Vinculados","Status",""].map(h=>(
                          <th key={h} style={{ padding:"10px 14px", textAlign:"left", fontSize:11,
                            fontWeight:700, color:"var(--text-muted)", textTransform:"uppercase",
                            letterSpacing:"0.05em", whiteSpace:"nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {ors.map(o=>{
                        const nome = o.clientes?.nome ?? o.nome_avulso ?? "—";
                        const nItens = o.orcamento_servicos?.length ?? 0;
                        const st = ST[o.status] ?? ST.pendente;
                        return (
                          <tr key={o.id} style={{ borderBottom:"1px solid var(--border)", background:st.gradient }}>
                            <td style={{ padding:"12px 14px", fontWeight:700, color:"var(--text-muted)", fontSize:13 }}>#{o.numero}</td>
                            <td style={{ padding:"12px 14px", fontWeight:500, color:"var(--text)" }}>{nome}</td>
                            <td style={{ padding:"12px 14px", fontWeight:700, color:"var(--primary)" }}>{fmt(o.valor_total)}</td>
                            <td style={{ padding:"12px 14px", color:"var(--text-muted)", fontSize:13 }}>{nItens} serviço{nItens!==1?"s":""}</td>
                            <td style={{ padding:"12px 14px", color:"var(--text-muted)", fontSize:13 }}>—</td>
                            <td style={{ padding:"12px 14px" }}>
                              <span style={{ fontSize:11, fontWeight:700, padding:"3px 10px", borderRadius:20,
                                color:st.color, background:st.bg }}>{st.label}</span>
                            </td>
                            <td style={{ padding:"12px 14px" }}>
                              <MenuAcoes o={o} onExcluir={()=>excluir(o.id)} onAprovar={()=>aprovar(o.id)} onWa={()=>abrirWa(o)} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
