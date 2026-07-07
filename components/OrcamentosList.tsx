"use client";
import { useState } from "react";
import ClienteAutocomplete from "@/components/ClienteAutocomplete";

const STATUS_LABEL: Record<string,string> = { pendente:"Pendente", aprovado:"Aprovado", recusado:"Recusado", expirado:"Expirado" };
const STATUS_BADGE: Record<string,string> = { pendente:"badge-aguardando", aprovado:"badge-finalizado", recusado:"badge-recusado", expirado:"badge-em-atendimento" };
const fmt = (v: number) => v.toLocaleString("pt-BR", { style:"currency", currency:"BRL" });

interface Cliente { id: string; nome: string; telefone?: string; whatsapp?: string; }
interface Servico { id: string; nome: string; preco_base: number; descricao?: string; }
interface Orcamento {
  id: string; numero?: number; status: string; valor_total: number; validade: string; os_id?: string;
  clientes?: { nome: string; whatsapp?: string; telefone?: string };
  nome_avulso?: string; placa_avulsa?: string; modelo_avulso?: string;
  orcamento_servicos?: { servico_nome: string; descricao?: string; preco: number; quantidade: number }[];
}
interface Item { servico_id: string; servico_nome: string; descricao?: string; preco: string; quantidade: string; }

function ServicoAutocomplete({ servicos, item, onChange }: {
  servicos: Servico[];
  item: Item;
  onChange: (k: string, v: string) => void;
}) {
  const [query, setQuery] = useState(item.servico_nome || "");
  const [open, setOpen] = useState(false);
  const filtered = query.length >= 1
    ? servicos.filter(s => s.nome.toLowerCase().includes(query.toLowerCase())).slice(0, 8)
    : servicos.slice(0, 8);
  function pick(s: Servico) {
    setQuery(s.nome); setOpen(false);
    onChange("servico_id", s.id); onChange("servico_nome", s.nome);
    onChange("descricao", s.descricao ?? ""); onChange("preco", String(s.preco_base));
  }
  return (
    <div style={{ position: "relative", flex: 1 }}>
      <input className="input" value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); onChange("servico_nome", e.target.value); }}
        onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Buscar servico..." />
      {open && filtered.length > 0 && (
        <div style={{ position:"absolute", top:"100%", left:0, right:0, zIndex:200,
          background:"var(--bg-sidebar)", border:"1px solid var(--border)", borderRadius:8,
          marginTop:2, boxShadow:"0 8px 24px rgba(0,0,0,0.18)", maxHeight:220, overflowY:"auto" }}>
          {filtered.map(s => (
            <button key={s.id} type="button" onMouseDown={() => pick(s)}
              style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
                width:"100%", padding:"9px 12px", background:"none", border:"none",
                cursor:"pointer", textAlign:"left", borderBottom:"1px solid var(--border)" }}
              onMouseOver={e => (e.currentTarget.style.background = "var(--bg-card)")}
              onMouseOut={e => (e.currentTarget.style.background = "none")}>
              <span style={{ fontSize:13, color:"var(--text)", fontWeight:500 }}>{s.nome}</span>
              <span style={{ fontSize:12, color:"var(--primary)", fontWeight:600, marginLeft:8, flexShrink:0 }}>
                R$ {s.preco_base.toFixed(2).replace(".",",")}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────── Modal criar cliente rápido ─────────── */
function ModalNovoCliente({ onClose, onCreated }: {
  onClose: () => void;
  onCreated: (c: Cliente) => void;
}) {
  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [telefone, setTelefone] = useState("");
  const [loading, setLoading] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return;
    setLoading(true);
    const res = await fetch("/api/clientes", {
      method: "POST", headers: { "Content-Type":"application/json" },
      body: JSON.stringify({ nome, whatsapp, telefone }),
    });
    const json = await res.json();
    if (json.id) { onCreated(json); onClose(); }
    else { alert(json.error ?? "Erro ao salvar"); }
    setLoading(false);
  }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ maxWidth:400 }}>
        <div className="modal-header">
          <h2 className="modal-title">Novo Cliente</h2>
          <button onClick={onClose} className="modal-close">✕</button>
        </div>
        <form onSubmit={salvar} className="flex flex-col gap-4 p-6">
          <p className="text-sm" style={{ color:"var(--text-muted)" }}>Cadastro rápido — você pode completar o perfil depois.</p>
          <div className="field">
            <label className="label">Nome *</label>
            <input className="input" value={nome} onChange={e => setNome(e.target.value)} required autoFocus placeholder="Nome do cliente" />
          </div>
          <div className="field">
            <label className="label">WhatsApp</label>
            <input className="input" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="(41) 99999-0000" />
          </div>
          <div className="field">
            <label className="label">Telefone</label>
            <input className="input" value={telefone} onChange={e => setTelefone(e.target.value)} placeholder="(41) 99999-0000" />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? "Salvando..." : "Criar Cliente"}</button>
          </div>
        </form>
      </div>
    </div>
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

export default function OrcamentosList({
  orcamentos: inicial, clientes, servicos,
}: { orcamentos: Orcamento[]; clientes: Cliente[]; servicos: Servico[] }) {
  const [lista, setLista] = useState(inicial);
  const [showForm, setShowForm] = useState(false);
  const [showModalCliente, setShowModalCliente] = useState(false);
  const [loading, setLoading] = useState(false);

  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);
  const [nomeAvulso, setNomeAvulso] = useState("");
  const [placa, setPlaca] = useState("");
  const [modelo, setModelo] = useState("");
  const [veiculosCliente, setVeiculosCliente] = useState<{ id: string; placa: string; modelo: string; marca?: string }[]>([]);
  const [veiculoId, setVeiculoId] = useState("");
  const [validade, setValidade] = useState(new Date(Date.now()+7*86400000).toISOString().slice(0,10));
  const [observacoes, setObservacoes] = useState("");
  const [descontoValor, setDescontoValor] = useState("0");
  const [descontoTipo, setDescontoTipo] = useState<"R$" | "%">("R$");
  const [itens, setItens] = useState<Item[]>([]);

  const subtotal = itens.reduce((s,i) => s + (parseFloat(i.preco)||0) * (parseInt(i.quantidade)||1), 0);
  const descontoNum = parseFloat(descontoValor) || 0;
  const descontoFinal = descontoTipo === "%" ? subtotal * descontoNum / 100 : descontoNum;
  const total = Math.max(0, subtotal - descontoFinal);

  function addItem() {
    setItens(p => [...p, { servico_id:"", servico_nome:"", descricao:"", preco:"", quantidade:"1" }]);
  }

  function setItem(i: number, k: string, v: string) {
    setItens(p => p.map((x,idx) => idx !== i ? x : { ...x, [k]: v }));
  }

  function resetForm() {
    setShowForm(false); setNomeAvulso(""); setPlaca(""); setModelo(""); setItens([]);
    setDescontoValor("0"); setDescontoTipo("R$"); setObservacoes("");
    setClienteSelecionado(null); setVeiculosCliente([]); setVeiculoId("");
  }

  async function salvar() {
    if (itens.length === 0) { alert("Adicione ao menos um servico"); return; }
    setLoading(true);
    const res = await fetch("/api/orcamentos", {
      method: "POST", headers: { "Content-Type":"application/json" },
      body: JSON.stringify({
        clienteId: clienteSelecionado ? clienteSelecionado.id : null,
        nomeAvulso: !clienteSelecionado ? nomeAvulso : null,
        placaAvulsa: placa, modeloAvulso: modelo,
        validade, observacoes,
        desconto: descontoFinal,
        valorTotal: total,
        itens: itens.map(i => ({
          servico_id: i.servico_id, servico_nome: i.servico_nome,
          descricao: i.descricao ?? "", preco: parseFloat(i.preco)||0, quantidade: parseInt(i.quantidade)||1
        })),
      }),
    });
    const data = await res.json();
    if (data.error) { alert(data.error); setLoading(false); return; }
    setLista(prev => [data, ...prev]);
    resetForm();
    setLoading(false);
  }

  async function excluir(id: string) {
    if (!confirm("Cancelar este orcamento?")) return;
    await fetch("/api/orcamentos", { method:"DELETE", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ id }) });
    setLista(prev => prev.filter(o => o.id !== id));
  }

  function abrirWhatsApp(o: Orcamento) {
    const tel = (o.clientes?.whatsapp || o.clientes?.telefone || "").replace(/\D/g,"");
    const msg = buildWaMsg(o);
    window.open(tel ? `https://wa.me/55${tel}?text=${msg}` : `https://wa.me/?text=${msg}`, "_blank");
  }

  return (
    <div className="flex flex-col gap-6">
      {showModalCliente && (
        <ModalNovoCliente
          onClose={() => setShowModalCliente(false)}
          onCreated={c => {
            setClienteSelecionado(c);
            setNomeAvulso(c.nome);
          }}
        />
      )}

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color:"var(--text)" }}>Orcamentos</h1>
          <p className="text-sm mt-1" style={{ color:"var(--text-muted)" }}>Gere orcamentos e converta em OS com 1 clique</p>
        </div>
        <button className="btn btn-primary" onClick={() => { if (showForm) resetForm(); else setShowForm(true); }}>
          {showForm ? "Cancelar" : "+ Novo Orcamento"}
        </button>
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="card flex flex-col gap-4">
          <h2 className="font-semibold text-base" style={{ color:"var(--text)" }}>Novo Orcamento</h2>

          {/* Cliente */}
          <div className="field">
            <div className="flex items-center justify-between mb-1">
              <label className="label mb-0">Cliente</label>
              <button type="button" onClick={() => setShowModalCliente(true)}
                className="btn btn-sm"
                style={{ background:"var(--bg-card)", border:"1px solid var(--primary)", color:"var(--primary)", fontSize:12, padding:"3px 10px", borderRadius:20 }}>
                + Criar novo cliente
              </button>
            </div>
            <ClienteAutocomplete
              selected={clienteSelecionado}
              onSelect={async c => {
                setClienteSelecionado(c);
                setVeiculosCliente([]); setVeiculoId(""); setPlaca(""); setModelo("");
                if (!c) { setNomeAvulso(""); return; }
                setNomeAvulso(c.nome);
                const res = await fetch(`/api/veiculos?clienteId=${c.id}`);
                const json = await res.json();
                const veics = Array.isArray(json) ? json : (json.data ?? []);
                if (veics.length > 0) {
                  setVeiculosCliente(veics);
                  if (veics.length === 1) { setPlaca(veics[0].placa ?? ""); setModelo(veics[0].modelo ?? ""); setVeiculoId(veics[0].id); }
                }
              }}
            />
          </div>

          {/* Veiculo */}
          <div className="grid grid-cols-2 gap-4">
            <div className="field">
              <label className="label">Placa (opcional)</label>
              {veiculosCliente.length > 1 ? (
                <select className="input" value={veiculoId} onChange={e => {
                  const v = veiculosCliente.find(x => x.id === e.target.value);
                  setVeiculoId(e.target.value); setPlaca(v?.placa ?? ""); setModelo(v?.modelo ?? "");
                }}>
                  <option value="">Selecionar veiculo...</option>
                  {veiculosCliente.map(v => (
                    <option key={v.id} value={v.id}>{v.placa} · {v.modelo}</option>
                  ))}
                </select>
              ) : (
                <input className="input" value={placa} onChange={e => setPlaca(e.target.value.toUpperCase())} placeholder="ABC1D23" />
              )}
            </div>
            <div className="field">
              <label className="label">Modelo (opcional)</label>
              <input className="input" value={modelo} onChange={e => setModelo(e.target.value)}
                placeholder="Civic, Gol..."
                readOnly={veiculosCliente.length > 0}
                style={veiculosCliente.length > 0 ? { background:"var(--bg)", color:"var(--text-muted)" } : {}} />
            </div>
          </div>

          {/* Validade + Desconto */}
          <div className="grid grid-cols-2 gap-4">
            <div className="field">
              <label className="label">Validade</label>
              <input className="input" type="date" value={validade} onChange={e => setValidade(e.target.value)} />
            </div>
            <div className="field">
              <label className="label">Desconto</label>
              <div style={{ display:"flex", gap:0 }}>
                <input className="input" type="number" min="0" step="0.01" value={descontoValor}
                  onChange={e => setDescontoValor(e.target.value)}
                  style={{ borderRadius:"8px 0 0 8px", flex:1 }} />
                <button type="button"
                  onClick={() => setDescontoTipo(t => t === "R$" ? "%" : "R$")}
                  style={{
                    padding:"0 14px", borderRadius:"0 8px 8px 0",
                    border:"1px solid var(--border)", borderLeft:"none",
                    background: descontoTipo === "%" ? "var(--primary)" : "var(--bg-card)",
                    color: descontoTipo === "%" ? "#fff" : "var(--text-muted)",
                    fontWeight:700, fontSize:14, cursor:"pointer", whiteSpace:"nowrap", minWidth:48
                  }}>
                  {descontoTipo}
                </button>
              </div>
              {descontoFinal > 0 && (
                <p className="text-xs mt-1" style={{ color:"var(--text-muted)" }}>
                  Desconto: {fmt(descontoFinal)}
                </p>
              )}
            </div>
          </div>

          {/* Servicos */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">Servicos *</label>
              <button className="btn btn-ghost btn-sm" onClick={addItem} disabled={servicos.length === 0}>+ Adicionar servico</button>
            </div>
            {servicos.length === 0 && (
              <p className="text-sm" style={{ color:"var(--danger)" }}>Nenhum servico cadastrado. Cadastre os servicos oferecidos primeiro.</p>
            )}
            {itens.map((it, i) => (
              <div key={i} style={{ display:"flex", gap:8, marginBottom:8, alignItems:"center" }}>
                <ServicoAutocomplete servicos={servicos} item={it} onChange={(k,v) => setItem(i,k,v)} />
                <input className="input" type="number" min="1" value={it.quantidade}
                  onChange={e => setItem(i,"quantidade",e.target.value)} placeholder="Qtd" style={{ width:64, flexShrink:0 }} />
                <input className="input" type="number" step="0.01" value={it.preco}
                  onChange={e => setItem(i,"preco",e.target.value)} placeholder="Valor" style={{ width:100, flexShrink:0 }} />
                <button className="btn btn-ghost btn-sm" style={{ color:"var(--danger)" }}
                  onClick={() => setItens(p => p.filter((_,idx)=>idx!==i))}>x</button>
              </div>
            ))}
            {itens.length > 0 && (
              <div className="flex justify-end gap-4 mt-2 text-sm" style={{ color:"var(--text-muted)" }}>
                <span>Subtotal: {fmt(subtotal)}</span>
                {descontoFinal > 0 && <span style={{ color:"var(--danger)" }}>- {fmt(descontoFinal)}</span>}
                <span className="font-bold" style={{ color:"var(--text)" }}>Total: {fmt(total)}</span>
              </div>
            )}
          </div>

          <div className="field">
            <label className="label">Observacoes</label>
            <textarea className="input" rows={2} value={observacoes} onChange={e => setObservacoes(e.target.value)} placeholder="Condicoes, prazo, garantia..." />
          </div>

          <div className="flex justify-end gap-3">
            <button className="btn btn-secondary" onClick={resetForm}>Cancelar</button>
            <button className="btn btn-primary" disabled={loading} onClick={salvar}>
              {loading ? "Salvando..." : "Salvar Orcamento"}
            </button>
          </div>
        </div>
      )}

      {/* Tabela */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead>
              <tr style={{ borderBottom:"1px solid var(--border)", background:"var(--bg-muted)" }}>
                {["N","Cliente","Placa / Modelo","Valor","Validade","Status","Acoes"].map(h => (
                  <th key={h} style={{ padding:"10px 14px", textAlign:"left", fontSize:11, fontWeight:600, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.05em", whiteSpace:"nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lista.length === 0 ? (
                <tr><td colSpan={7} style={{ padding:40, textAlign:"center", color:"var(--text-muted)" }}>Nenhum orcamento ainda.</td></tr>
              ) : lista.map(o => {
                const nome = o.clientes?.nome ?? o.nome_avulso ?? "—";
                const veiculo = [o.placa_avulsa, o.modelo_avulso].filter(Boolean).join(" · ") || "—";
                return (
                  <tr key={o.id} style={{ borderBottom:"1px solid var(--border)" }}>
                    <td style={{ padding:"12px 14px", fontWeight:600, color:"var(--text-muted)" }}>#{o.numero}</td>
                    <td style={{ padding:"12px 14px", fontWeight:500, color:"var(--text)" }}>{nome}</td>
                    <td style={{ padding:"12px 14px", color:"var(--text-muted)", fontSize:13 }}>{veiculo}</td>
                    <td style={{ padding:"12px 14px", fontWeight:600, color:"var(--primary)" }}>{fmt(o.valor_total)}</td>
                    <td style={{ padding:"12px 14px", fontSize:13, color:"var(--text-muted)", whiteSpace:"nowrap" }}>
                      {o.validade ? new Date(o.validade+"T12:00").toLocaleDateString("pt-BR") : "—"}
                    </td>
                    <td style={{ padding:"12px 14px" }}>
                      <span className={`badge ${STATUS_BADGE[o.status] ?? ""}`}>{STATUS_LABEL[o.status] ?? o.status}</span>
                    </td>
                    <td style={{ padding:"12px 14px" }}>
                      <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                        <a href={`/orcamento/${o.id}`} target="_blank" className="btn btn-sm btn-secondary" style={{ textDecoration:"none" }}>Ver</a>
                        <button className="btn btn-sm" onClick={() => abrirWhatsApp(o)}
                          style={{ background:"#25d366", color:"#fff", border:"none" }}>WA</button>
                        <button className="btn btn-ghost btn-sm" style={{ color:"var(--danger)" }} onClick={() => excluir(o.id)}>x</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
