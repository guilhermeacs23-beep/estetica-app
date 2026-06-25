"use client";
import { useState } from "react";

const STATUS_LABEL: Record<string,string> = { pendente:"Pendente", aprovado:"Aprovado", recusado:"Recusado", expirado:"Expirado" };
const STATUS_BADGE: Record<string,string> = { pendente:"badge-aguardando", aprovado:"badge-finalizado", recusado:"badge-recusado", expirado:"badge-em-atendimento" };

export default function OrcamentosList({
  orcamentos: inicial, clientes, veiculos, servicos,
}: { orcamentos: any[]; clientes: any[]; veiculos: any[]; servicos: any[] }) {
  const [lista, setLista] = useState(inicial);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [clienteId, setClienteId] = useState("");
  const [veiculoId, setVeiculoId] = useState("");
  const [validade, setValidade] = useState(new Date(Date.now()+7*86400000).toISOString().slice(0,10));
  const [observacoes, setObservacoes] = useState("");
  const [desconto, setDesconto] = useState("0");
  const [itens, setItens] = useState<{ servico_id: string; servico_nome: string; preco: string; quantidade: string }[]>([]);

  const veiculosCliente = veiculos.filter(v => v.cliente_id === clienteId);
  const subtotal = itens.reduce((s,i) => s + (parseFloat(i.preco)||0) * (parseInt(i.quantidade)||1), 0);
  const total = Math.max(0, subtotal - (parseFloat(desconto)||0));

  function addItem() {
    const s = servicos[0];
    if (!s) return;
    setItens(p => [...p, { servico_id: s.id, servico_nome: s.nome, preco: String(s.preco_base), quantidade: "1" }]);
  }
  function setItem(i: number, k: string, v: string) {
    setItens(p => p.map((x,idx) => {
      if (idx !== i) return x;
      const upd = { ...x, [k]: v };
      if (k === "servico_id") {
        const s = servicos.find(s => s.id === v);
        if (s) { upd.servico_nome = s.nome; upd.preco = String(s.preco_base); }
      }
      return upd;
    }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!itens.length) { alert("Adicione pelo menos um serviço."); return; }
    setLoading(true);
    const res = await fetch("/api/orcamentos", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({
        cliente_id: clienteId||null, veiculo_id: veiculoId||null,
        validade, observacoes, desconto: parseFloat(desconto)||0, valor_total: total,
        itens: itens.map(i => ({
          servico_id: i.servico_id, servico_nome: i.servico_nome,
          preco: parseFloat(i.preco)||0, quantidade: parseInt(i.quantidade)||1,
        })),
      }),
    });
    const json = await res.json();
    if (json.id) {
      setLista(p => [json, ...p]);
      setShowForm(false);
      setItens([]); setClienteId(""); setVeiculoId(""); setObservacoes(""); setDesconto("0");
    }
    setLoading(false);
  }

  async function updateStatus(id: string, status: string) {
    const res = await fetch(`/api/orcamentos/${id}`, {
      method:"PATCH", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ status }),
    });
    const json = await res.json();
    setLista(p => p.map(o => o.id === id ? { ...o, status: json.status } : o));
  }

  async function converterOS(id: string) {
    const res = await fetch(`/api/orcamentos/${id}/converter`, { method:"POST" });
    const json = await res.json();
    if (json.os_id) {
      setLista(p => p.map(o => o.id === id ? { ...o, status:"aprovado", os_id: json.os_id } : o));
      window.location.href = `/ordens-de-servico/${json.os_id}`;
    }
  }

  const fmt = (v: number) => v.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color:"var(--text)" }}>Orçamentos</h1>
          <p className="text-sm mt-1" style={{ color:"var(--text-muted)" }}>Gere orçamentos e converta em OS com 1 clique</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn btn-primary">+ Novo Orçamento</button>
      </div>

      {showForm && (
        <form onSubmit={save} className="card flex flex-col gap-5">
          <h2 className="font-semibold text-lg" style={{ color:"var(--text)" }}>Novo Orçamento</h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="field">
              <label className="label">Cliente</label>
              <select className="input" value={clienteId} onChange={e => { setClienteId(e.target.value); setVeiculoId(""); }}>
                <option value="">Selecionar cliente</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div className="field">
              <label className="label">Veículo</label>
              <select className="input" value={veiculoId} onChange={e => setVeiculoId(e.target.value)} disabled={!clienteId}>
                <option value="">Selecionar veículo</option>
                {veiculosCliente.map(v => <option key={v.id} value={v.id}>{v.placa} — {v.modelo}</option>)}
              </select>
            </div>
            <div className="field">
              <label className="label">Validade</label>
              <input className="input" type="date" value={validade} onChange={e => setValidade(e.target.value)} required />
            </div>
            <div className="field">
              <label className="label">Desconto (R$)</label>
              <input className="input" type="number" step="0.01" min="0" value={desconto} onChange={e => setDesconto(e.target.value)} placeholder="0,00" />
            </div>
          </div>

          {/* Serviços */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">Serviços *</label>
              <button type="button" onClick={addItem} className="btn btn-sm btn-secondary">+ Adicionar serviço</button>
            </div>
            {!itens.length && <p className="text-xs py-2" style={{ color:"var(--text-subtle)" }}>Nenhum serviço adicionado.</p>}
            {itens.map((item, i) => (
              <div key={i} className="grid gap-2 mb-2 items-center" style={{ gridTemplateColumns:"1fr 120px 80px 32px" }}>
                <select className="input" value={item.servico_id} onChange={e => setItem(i,"servico_id",e.target.value)}>
                  {servicos.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                </select>
                <input className="input text-right" type="number" step="0.01" value={item.preco} onChange={e => setItem(i,"preco",e.target.value)} placeholder="Preço" />
                <input className="input text-center" type="number" min="1" value={item.quantidade} onChange={e => setItem(i,"quantidade",e.target.value)} placeholder="Qtd" />
                <button type="button" onClick={() => setItens(p => p.filter((_,idx)=>idx!==i))} className="btn btn-icon btn-ghost btn-sm" style={{ color:"var(--danger)" }}>✕</button>
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

          <div className="field">
            <label className="label">Observações</label>
            <textarea className="input" rows={2} value={observacoes} onChange={e => setObservacoes(e.target.value)} placeholder="Condições, prazo de execução, garantia..." />
          </div>

          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary">Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading?"Salvando...":"Salvar Orçamento"}</button>
          </div>
        </form>
      )}

      {/* Tabela */}
      <div className="table-wrapper">
        <table>
          <thead>
            <tr><th>Nº</th><th>Cliente</th><th>Veículo</th><th>Valor</th><th>Validade</th><th>Status</th><th>Ações</th></tr>
          </thead>
          <tbody>
            {!lista.length ? (
              <tr><td colSpan={7} className="text-center py-10" style={{ color:"var(--text-muted)" }}>Nenhum orçamento ainda.</td></tr>
            ) : lista.map((o:any) => (
              <tr key={o.id}>
                <td className="font-mono text-sm" style={{ color:"var(--text-muted)" }}>#{o.numero}</td>
                <td className="font-medium" style={{ color:"var(--text)" }}>{o.clientes?.nome ?? "-"}</td>
                <td style={{ color:"var(--text-muted)" }}>{o.veiculos ? `${o.veiculos.placa} · ${o.veiculos.modelo}` : "-"}</td>
                <td className="font-semibold" style={{ color:"var(--primary)" }}>{fmt(o.valor_total)}</td>
                <td style={{ color: new Date(o.validade) < new Date() && o.status==="pendente" ? "var(--danger)" : "var(--text-muted)" }}>
                  {new Date(o.validade+"T12:00").toLocaleDateString("pt-BR")}
                  {new Date(o.validade) < new Date() && o.status==="pendente" && " ⚠️"}
                </td>
                <td><span className={`badge ${STATUS_BADGE[o.status]??""}`}>{STATUS_LABEL[o.status]??o.status}</span></td>
                <td>
                  <div className="flex gap-1">
                    {o.status === "pendente" && <>
                      <button onClick={() => converterOS(o.id)} className="btn btn-sm btn-primary" title="Converter em OS">→ OS</button>
                      <button onClick={() => updateStatus(o.id,"recusado")} className="btn btn-sm btn-ghost" style={{ color:"var(--danger)" }}>✕</button>
                    </>}
                    {o.status === "aprovado" && o.os_id &&
                      <a href={`/ordens-de-servico/${o.os_id}`} className="btn btn-sm btn-ghost">Ver OS</a>}
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
