"use client";
import { useState } from "react";

const STATUS_LABEL: Record<string,string> = { pendente:"Pendente", aprovado:"Aprovado", recusado:"Recusado", expirado:"Expirado" };
const STATUS_BADGE: Record<string,string> = { pendente:"badge-aguardando", aprovado:"badge-finalizado", recusado:"badge-recusado", expirado:"badge-em-atendimento" };
const fmt = (v: number) => v.toLocaleString("pt-BR", { style:"currency", currency:"BRL" });

interface Cliente { id: string; nome: string; telefone?: string; }
interface Veiculo { id: string; cliente_id: string; placa?: string; modelo?: string; }
interface Servico { id: string; nome: string; preco_base: number; }
interface Orcamento { id: string; numero?: number; status: string; valor_total: number; validade: string; os_id?: string; clientes?: { nome: string }; veiculos?: { placa: string; modelo: string }; }
interface Item { servico_id: string; servico_nome: string; preco: string; quantidade: string; }

export default function OrcamentosList({
  orcamentos: inicial, clientes: clientesIniciais, veiculos, servicos,
}: { orcamentos: Orcamento[]; clientes: Cliente[]; veiculos: Veiculo[]; servicos: Servico[] }) {
  const [lista, setLista] = useState(inicial);
  const [clientes, setClientes] = useState(clientesIniciais);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  // Campos do orcamento
  const [clienteId, setClienteId] = useState("");
  const [veiculoId, setVeiculoId] = useState("");
  const [placaAvulsa, setPlacaAvulsa] = useState("");
  const [modeloAvulso, setModeloAvulso] = useState("");
  const [validade, setValidade] = useState(new Date(Date.now()+7*86400000).toISOString().slice(0,10));
  const [observacoes, setObservacoes] = useState("");
  const [desconto, setDesconto] = useState("0");
  const [itens, setItens] = useState<Item[]>([]);

  // Mini-cadastro de cliente
  const [showNovoCliente, setShowNovoCliente] = useState(false);
  const [ncNome, setNcNome] = useState("");
  const [ncTelefone, setNcTelefone] = useState("");
  const [ncLoading, setNcLoading] = useState(false);

  const veiculosCliente = veiculos.filter(v => v.cliente_id === clienteId);
  const subtotal = itens.reduce((s,i) => s + (parseFloat(i.preco)||0) * (parseInt(i.quantidade)||1), 0);
  const total = Math.max(0, subtotal - (parseFloat(desconto)||0));

  function handleClienteChange(val: string) {
    if (val === "__novo__") { setShowNovoCliente(true); return; }
    setClienteId(val); setVeiculoId(""); setPlacaAvulsa(""); setModeloAvulso("");
  }

  async function salvarNovoCliente(e: React.FormEvent) {
    e.preventDefault();
    if (!ncNome.trim()) return;
    setNcLoading(true);
    const res = await fetch("/api/clientes", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: ncNome.trim(), telefone: ncTelefone.replace(/\D/g,"") || null, whatsapp: ncTelefone.replace(/\D/g,"") || null }),
    });
    const json = await res.json();
    if (json.id) {
      const novo: Cliente = { id: json.id, nome: json.nome, telefone: json.telefone };
      setClientes(p => [...p, novo].sort((a,b) => a.nome.localeCompare(b.nome)));
      setClienteId(json.id);
      setShowNovoCliente(false);
      setNcNome(""); setNcTelefone("");
    }
    setNcLoading(false);
  }

  function addItem() {
    const s = servicos[0]; if (!s) return;
    setItens(p => [...p, { servico_id: s.id, servico_nome: s.nome, preco: String(s.preco_base), quantidade: "1" }]);
  }
  function setItem(i: number, k: string, v: string) {
    setItens(p => p.map((x,idx) => {
      if (idx !== i) return x;
      const upd = { ...x, [k]: v };
      if (k === "servico_id") { const s = servicos.find(s => s.id === v); if (s) { upd.servico_nome = s.nome; upd.preco = String(s.preco_base); } }
      return upd;
    }));
  }

  function resetForm() {
    setShowForm(false); setClienteId(""); setVeiculoId(""); setPlacaAvulsa(""); setModeloAvulso("");
    setObservacoes(""); setDesconto("0"); setItens([]); setShowNovoCliente(false);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!itens.length) { alert("Adicione pelo menos um servico."); return; }
    setLoading(true);
    const res = await fetch("/api/orcamentos", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({
        cliente_id: clienteId||null, veiculo_id: veiculoId||null,
        placa_avulsa: placaAvulsa.toUpperCase().replace(/[^A-Z0-9]/g,"")||null,
        modelo_avulso: modeloAvulso||null,
        validade, observacoes, desconto: parseFloat(desconto)||0, valor_total: total,
        itens: itens.map(i => ({ servico_id: i.servico_id, servico_nome: i.servico_nome, preco: parseFloat(i.preco)||0, quantidade: parseInt(i.quantidade)||1 })),
      }),
    });
    const json = await res.json();
    if (json.id) { setLista(p => [json, ...p]); resetForm(); }
    setLoading(false);
  }

  async function updateStatus(id: string, status: string) {
    const res = await fetch(`/api/orcamentos/${id}`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ status }) });
    const json = await res.json();
    setLista(p => p.map(o => o.id === id ? { ...o, status: json.status } : o));
  }

  async function converterOS(id: string) {
    const res = await fetch(`/api/orcamentos/${id}/converter`, { method:"POST" });
    const json = await res.json();
    if (json.os_id) { setLista(p => p.map(o => o.id === id ? { ...o, status:"aprovado", os_id: json.os_id } : o)); window.location.href = `/ordens-de-servico/${json.os_id}`; }
  }

  const clienteSelecionado = clientes.find(c => c.id === clienteId);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color:"var(--text)" }}>Orcamentos</h1>
          <p className="text-sm mt-0.5" style={{ color:"var(--text-muted)" }}>Gere orcamentos e converta em OS com 1 clique</p>
        </div>
        {!showForm && <button onClick={() => setShowForm(true)} className="btn btn-primary">+ Novo Orcamento</button>}
      </div>

      {showForm && (
        <div className="card">
          <h2 className="font-semibold text-lg mb-4" style={{ color:"var(--text)" }}>Novo Orcamento</h2>
          <form onSubmit={save} className="flex flex-col gap-4">

            {/* Cliente */}
            <div className="grid gap-4" style={{ gridTemplateColumns:"1fr 1fr" }}>
              <div className="field">
                <label className="label">Cliente</label>
                <select className="input" value={clienteId} onChange={e => handleClienteChange(e.target.value)}>
                  <option value="">Selecionar cliente</option>
                  <option value="__novo__" style={{ color:"var(--primary)", fontWeight:600 }}>+ Novo cliente rapido</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}{c.telefone ? ` — ${c.telefone}` : ""}</option>)}
                </select>
              </div>

              {/* Veiculo: dropdown se cliente selecionado, placa avulsa se nao */}
              {clienteId && veiculosCliente.length > 0 ? (
                <div className="field">
                  <label className="label">Veiculo</label>
                  <select className="input" value={veiculoId} onChange={e => setVeiculoId(e.target.value)}>
                    <option value="">Selecionar veiculo</option>
                    {veiculosCliente.map(v => <option key={v.id} value={v.id}>{v.placa} — {v.modelo}</option>)}
                    <option value="__avulso__">+ Placa diferente / novo veiculo</option>
                  </select>
                </div>
              ) : (
                <div className="field">
                  <label className="label">Placa</label>
                  <input className="input" value={placaAvulsa} onChange={e => setPlacaAvulsa(e.target.value.toUpperCase())}
                    placeholder="ABC1D23" maxLength={8} style={{ textTransform:"uppercase", letterSpacing:2, fontWeight:600 }} />
                </div>
              )}
            </div>

            {/* Se escolheu "placa diferente" no dropdown de veiculo */}
            {veiculoId === "__avulso__" && (
              <div className="grid gap-4" style={{ gridTemplateColumns:"1fr 1fr" }}>
                <div className="field">
                  <label className="label">Placa</label>
                  <input className="input" value={placaAvulsa} onChange={e => setPlacaAvulsa(e.target.value.toUpperCase())}
                    placeholder="ABC1D23" maxLength={8} style={{ textTransform:"uppercase", letterSpacing:2, fontWeight:600 }} />
                </div>
                <div className="field">
                  <label className="label">Modelo</label>
                  <input className="input" value={modeloAvulso} onChange={e => setModeloAvulso(e.target.value)} placeholder="Ex: Honda Civic" />
                </div>
              </div>
            )}

            {/* Modelo avulso (quando sem cliente) */}
            {!clienteId && placaAvulsa.length >= 3 && (
              <div className="field" style={{ maxWidth:320 }}>
                <label className="label">Modelo do Veiculo</label>
                <input className="input" value={modeloAvulso} onChange={e => setModeloAvulso(e.target.value)} placeholder="Ex: Honda Civic 2022" />
              </div>
            )}

            {/* Mini-cadastro inline */}
            {showNovoCliente && (
              <div style={{ background:"rgba(196,30,58,0.06)", border:"1px solid rgba(196,30,58,0.25)", borderRadius:10, padding:16 }}>
                <p className="font-semibold text-sm mb-3" style={{ color:"var(--primary)" }}>Cadastro rapido de cliente</p>
                <form onSubmit={salvarNovoCliente}>
                  <div className="grid gap-3 mb-3" style={{ gridTemplateColumns:"1fr 1fr" }}>
                    <div className="field">
                      <label className="label">Nome *</label>
                      <input className="input" value={ncNome} onChange={e => setNcNome(e.target.value)} placeholder="Nome completo" required autoFocus />
                    </div>
                    <div className="field">
                      <label className="label">WhatsApp / Telefone</label>
                      <input className="input" value={ncTelefone} onChange={e => setNcTelefone(e.target.value)} placeholder="41999998888" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" className="btn btn-primary btn-sm" disabled={ncLoading}>{ncLoading ? "Salvando..." : "Salvar cliente"}</button>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setShowNovoCliente(false); setNcNome(""); setNcTelefone(""); }}>Cancelar</button>
                  </div>
                </form>
              </div>
            )}

            {/* Validade + Desconto */}
            <div className="grid gap-4" style={{ gridTemplateColumns:"1fr 1fr" }}>
              <div className="field">
                <label className="label">Validade</label>
                <input className="input" type="date" value={validade} onChange={e => setValidade(e.target.value)} required />
              </div>
              <div className="field">
                <label className="label">Desconto (R$)</label>
                <input className="input" type="number" step="0.01" min="0" value={desconto} onChange={e => setDesconto(e.target.value)} placeholder="0,00" />
              </div>
            </div>

            {/* Servicos */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="label mb-0">Servicos *</label>
                <button type="button" onClick={addItem} className="btn btn-sm btn-secondary">+ Adicionar servico</button>
              </div>
              {!itens.length && <p className="text-xs py-2" style={{ color:"var(--text-subtle)" }}>Nenhum servico adicionado.</p>}
              {itens.map((item, i) => (
                <div key={i} className="grid gap-2 mb-2 items-center" style={{ gridTemplateColumns:"1fr 140px 80px 36px" }}>
                  <select className="input" value={item.servico_id} onChange={e => setItem(i,"servico_id",e.target.value)}>
                    {servicos.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                  </select>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs" style={{ color:"var(--text-muted)" }}>R$</span>
                    <input className="input text-right pl-8" type="number" step="0.01" value={item.preco} onChange={e => setItem(i,"preco",e.target.value)} />
                  </div>
                  <input className="input text-center" type="number" min="1" value={item.quantidade} onChange={e => setItem(i,"quantidade",e.target.value)} placeholder="Qtd" />
                  <button type="button" onClick={() => setItens(p => p.filter((_,idx)=>idx!==i))} className="btn btn-icon btn-ghost btn-sm" style={{ color:"var(--danger)" }}>x</button>
                </div>
              ))}
              {itens.length > 0 && (
                <div className="flex flex-col gap-1 mt-3 text-sm text-right">
                  <span style={{ color:"var(--text-muted)" }}>Subtotal: {fmt(subtotal)}</span>
                  {parseFloat(desconto)>0 && <span style={{ color:"var(--warning)" }}>Desconto: -{fmt(parseFloat(desconto)||0)}</span>}
                  <span className="font-bold text-base" style={{ color:"var(--primary)" }}>Total: {fmt(total)}</span>
                </div>
              )}
            </div>

            {/* Resumo do cliente/placa escolhido */}
            {(clienteSelecionado || placaAvulsa) && (
              <div style={{ background:"var(--surface)", borderRadius:8, padding:"10px 14px", fontSize:13, color:"var(--text-muted)", border:"1px solid var(--border)" }}>
                {clienteSelecionado && <span><strong style={{color:"var(--text)"}}>{clienteSelecionado.nome}</strong>{clienteSelecionado.telefone ? ` — ${clienteSelecionado.telefone}` : ""}</span>}
                {placaAvulsa && <span style={{marginLeft: clienteSelecionado ? 12 : 0}}>Placa: <strong style={{color:"var(--text)"}}>{placaAvulsa}</strong>{modeloAvulso ? ` (${modeloAvulso})` : ""}</span>}
              </div>
            )}

            <div className="field">
              <label className="label">Observacoes</label>
              <textarea className="input" rows={2} value={observacoes} onChange={e => setObservacoes(e.target.value)} placeholder="Condicoes, prazo de execucao, garantia..." />
            </div>

            <div className="flex gap-2 justify-end">
              <button type="button" onClick={resetForm} className="btn btn-secondary">Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={loading}>{loading?"Salvando...":"Salvar Orcamento"}</button>
            </div>
          </form>
        </div>
      )}

      {/* Tabela */}
      <div className="table-wrapper">
        <table>
          <thead>
            <tr><th>No</th><th>Cliente</th><th>Veiculo</th><th>Valor</th><th>Validade</th><th>Status</th><th>Acoes</th></tr>
          </thead>
          <tbody>
            {!lista.length ? (
              <tr><td colSpan={7} className="text-center py-10" style={{ color:"var(--text-muted)" }}>Nenhum orcamento ainda.</td></tr>
            ) : lista.map((o) => (
              <tr key={o.id}>
                <td className="font-mono text-sm" style={{ color:"var(--text-muted)" }}>#{o.numero}</td>
                <td className="font-medium" style={{ color:"var(--text)" }}>{o.clientes?.nome ?? "-"}</td>
                <td style={{ color:"var(--text-muted)" }}>{o.veiculos ? `${o.veiculos.placa} - ${o.veiculos.modelo}` : "-"}</td>
                <td className="font-semibold" style={{ color:"var(--primary)" }}>{fmt(o.valor_total)}</td>
                <td style={{ color: new Date(o.validade) < new Date() && o.status==="pendente" ? "var(--danger)" : "var(--text-muted)" }}>
                  {new Date(o.validade+"T12:00").toLocaleDateString("pt-BR")}
                  {new Date(o.validade) < new Date() && o.status==="pendente" && " !"}
                </td>
                <td><span className={`badge ${STATUS_BADGE[o.status]??""}`}>{STATUS_LABEL[o.status]??o.status}</span></td>
                <td>
                  <div className="flex gap-1">
                    {o.status === "pendente" && <>
                      <button onClick={() => converterOS(o.id)} className="btn btn-sm btn-primary" title="Converter em OS">OS</button>
                      <button onClick={() => updateStatus(o.id,"recusado")} className="btn btn-sm btn-ghost" style={{ color:"var(--danger)" }}>x</button>
                    </>}
                    {o.status === "aprovado" && o.os_id && <a href={`/ordens-de-servico/${o.os_id}`} className="btn btn-sm btn-ghost">Ver OS</a>}
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
