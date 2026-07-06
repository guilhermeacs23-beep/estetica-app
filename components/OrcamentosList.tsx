"use client";
import { useState } from "react";
import ClienteAutocomplete from "@/components/ClienteAutocomplete";

const STATUS_LABEL: Record<string,string> = { pendente:"Pendente", aprovado:"Aprovado", recusado:"Recusado", expirado:"Expirado" };
const STATUS_BADGE: Record<string,string> = { pendente:"badge-aguardando", aprovado:"badge-finalizado", recusado:"badge-recusado", expirado:"badge-em-atendimento" };
const fmt = (v: number) => v.toLocaleString("pt-BR", { style:"currency", currency:"BRL" });

interface Cliente { id: string; nome: string; telefone?: string; whatsapp?: string; }
interface Servico { id: string; nome: string; preco_base: number; }
interface Orcamento {
  id: string; numero?: number; status: string; valor_total: number; validade: string; os_id?: string;
  clientes?: { nome: string; whatsapp?: string; telefone?: string };
  nome_avulso?: string; placa_avulsa?: string; modelo_avulso?: string;
}
interface Item { servico_id: string; servico_nome: string; preco: string; quantidade: string; }

const ORIGIN = typeof window !== "undefined" ? window.location.origin : "https://estetica-app-theta.vercel.app";

function buildWaMsg(o: Orcamento) {
  const nome = (o.clientes?.nome ?? o.nome_avulso ?? "Cliente").split(" ")[0];
  const placa = o.placa_avulsa ?? "";
  const link = `${ORIGIN}/orcamento/${o.id}`;
  return encodeURIComponent(
    `Olá ${nome}! 👋
Seu orçamento #${o.numero ?? ""} está pronto.
${placa ? `Veículo: ${placa}
` : ""}Total: ${fmt(o.valor_total)}

Veja os detalhes aqui:
${link}`
  );
}

export default function OrcamentosList({
  orcamentos: inicial, clientes, servicos,
}: { orcamentos: Orcamento[]; clientes: Cliente[]; servicos: Servico[] }) {
  const [lista, setLista] = useState(inicial);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  const [nomeAvulso, setNomeAvulso] = useState("");
  const [placa, setPlaca] = useState("");
  const [modelo, setModelo] = useState("");
  const [clienteSelecionado, setClienteSelecionado] = useState<{ id: string; nome: string; telefone?: string; whatsapp?: string } | null>(null);
  const [veiculosCliente, setVeiculosCliente] = useState<{ id: string; placa: string; modelo: string; marca?: string }[]>([]);
  const [veiculoId, setVeiculoId] = useState("");
  const [validade, setValidade] = useState(new Date(Date.now()+7*86400000).toISOString().slice(0,10));
  const [observacoes, setObservacoes] = useState("");
  const [desconto, setDesconto] = useState("0");
  const [itens, setItens] = useState<Item[]>([]);

  const subtotal = itens.reduce((s,i) => s + (parseFloat(i.preco)||0) * (parseInt(i.quantidade)||1), 0);
  const total = Math.max(0, subtotal - (parseFloat(desconto)||0));

  function addItem() {
    const s = servicos[0]; if (!s) return;
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

  async function salvar() {
    if (itens.length === 0) { alert("Adicione ao menos um serviço"); return; }
    setLoading(true);
    const res = await fetch("/api/orcamentos", {
      method: "POST", headers: { "Content-Type":"application/json" },
      body: JSON.stringify({
        clienteId: clienteSelecionado ? clienteSelecionado.id : null,
        nomeAvulso: !clienteSelecionado ? nomeAvulso : null,
        placaAvulsa: placa, modeloAvulso: modelo,
        validade, observacoes,
        desconto: parseFloat(desconto)||0,
        valorTotal: total,
        itens: itens.map(i => ({ servico_id: i.servico_id, servico_nome: i.servico_nome, preco: parseFloat(i.preco)||0, quantidade: parseInt(i.quantidade)||1 })),
      }),
    });
    const data = await res.json();
    if (data.error) { alert(data.error); setLoading(false); return; }
    setLista(prev => [data, ...prev]);
    setShowForm(false); setNomeAvulso(""); setPlaca(""); setModelo(""); setItens([]); setDesconto("0"); setObservacoes(""); setClienteSelecionado(null); setVeiculosCliente([]); setVeiculoId("");
    setLoading(false);
  }

  async function excluir(id: string) {
    if (!confirm("Cancelar este orçamento?")) return;
    await fetch("/api/orcamentos", { method:"DELETE", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ id }) });
    setLista(prev => prev.filter(o => o.id !== id));
  }

  function abrirWhatsApp(o: Orcamento) {
    const tel = (o.clientes?.whatsapp || o.clientes?.telefone || "").replace(/\D/g,"");
    if (!tel) {
      const msg = buildWaMsg(o);
      window.open(`https://wa.me/?text=${msg}`, "_blank");
      return;
    }
    window.open(`https://wa.me/55${tel}?text=${buildWaMsg(o)}`, "_blank");
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color:"var(--text)" }}>Orçamentos</h1>
          <p className="text-sm mt-1" style={{ color:"var(--text-muted)" }}>Gere orçamentos e converta em OS com 1 clique</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancelar" : "+ Novo Orçamento"}
        </button>
      </div>

      {/* Formulário */}
      {showForm && (
        <div className="card flex flex-col gap-4">
          <h2 className="font-semibold text-base" style={{ color:"var(--text)" }}>Novo Orçamento</h2>

          {/* Cliente */}
          <div className="grid grid-cols-3 gap-4">
            <div className="field">
              <label className="label">Cliente (nome ou celular)</label>
              <ClienteAutocomplete
                selected={clienteSelecionado}
                onSelect={async c => {
                  setClienteSelecionado(c);
                  setVeiculosCliente([]);
                  setVeiculoId("");
                  setPlaca("");
                  setModelo("");
                  if (!c) { setNomeAvulso(""); return; }
                  setNomeAvulso(c.nome);
                  // busca veículos do cliente
                  const res = await fetch(`/api/veiculos?clienteId=${c.id}`);
                  const json = await res.json();
                  const veics = Array.isArray(json) ? json : (json.data ?? []);
                  if (veics.length > 0) {
                    setVeiculosCliente(veics);
                    // se tiver só 1, preenche automaticamente
                    if (veics.length === 1) {
                      setPlaca(veics[0].placa ?? "");
                      setModelo(veics[0].modelo ?? "");
                      setVeiculoId(veics[0].id);
                    }
                  }
                }}
              />
            </div>
            <div className="field">
              <label className="label">Placa (opcional)</label>
              {veiculosCliente.length > 1 ? (
                <select className="input" value={veiculoId} onChange={e => {
                  const v = veiculosCliente.find(x => x.id === e.target.value);
                  setVeiculoId(e.target.value);
                  setPlaca(v?.placa ?? "");
                  setModelo(v?.modelo ?? "");
                }}>
                  <option value="">Selecionar veículo...</option>
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
              <input className="input" value={modelo} onChange={e => setModelo(e.target.value)} placeholder="Civic, Gol..."
                readOnly={veiculosCliente.length > 0}
                style={veiculosCliente.length > 0 ? { background: "var(--bg)", color: "var(--text-muted)" } : {}} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="field">
              <label className="label">Validade</label>
              <input className="input" type="date" value={validade} onChange={e => setValidade(e.target.value)} />
            </div>
            <div className="field">
              <label className="label">Desconto (R$)</label>
              <input className="input" type="number" min="0" step="0.01" value={desconto} onChange={e => setDesconto(e.target.value)} />
            </div>
          </div>

          {/* Itens */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">Serviços *</label>
              <button className="btn btn-ghost btn-sm" onClick={addItem} disabled={servicos.length === 0}>+ Adicionar serviço</button>
            </div>
            {servicos.length === 0 && (
              <p className="text-sm" style={{ color:"var(--danger)" }}>Nenhum serviço cadastrado. Vá em Serviços e cadastre os serviços oferecidos.</p>
            )}
            {itens.map((it, i) => (
              <div key={i} className="grid gap-3 mb-2" style={{ gridTemplateColumns:"1fr 80px 120px 32px" }}>
                <select className="input" value={it.servico_id} onChange={e => setItem(i,"servico_id",e.target.value)}>
                  {servicos.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                </select>
                <input className="input" type="number" min="1" value={it.quantidade} onChange={e => setItem(i,"quantidade",e.target.value)} placeholder="Qtd" />
                <input className="input" type="number" step="0.01" value={it.preco} onChange={e => setItem(i,"preco",e.target.value)} placeholder="Valor" />
                <button className="btn btn-ghost btn-sm" style={{ color:"var(--danger)" }} onClick={() => setItens(p => p.filter((_,idx)=>idx!==i))}>✕</button>
              </div>
            ))}
            {itens.length > 0 && (
              <div className="flex justify-end gap-4 mt-2 text-sm" style={{ color:"var(--text-muted)" }}>
                <span>Subtotal: {fmt(subtotal)}</span>
                {parseFloat(desconto)>0 && <span style={{ color:"var(--danger)" }}>− {fmt(parseFloat(desconto))}</span>}
                <span className="font-bold" style={{ color:"var(--text)" }}>Total: {fmt(total)}</span>
              </div>
            )}
          </div>

          <div className="field">
            <label className="label">Observações</label>
            <textarea className="input" rows={2} value={observacoes} onChange={e => setObservacoes(e.target.value)} placeholder="Condições, prazo, garantia..." />
          </div>

          <div className="flex justify-end gap-3">
            <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
            <button className="btn btn-primary" disabled={loading} onClick={salvar}>{loading ? "Salvando..." : "Salvar Orçamento"}</button>
          </div>
        </div>
      )}

      {/* Tabela */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead>
              <tr style={{ borderBottom:"1px solid var(--border)", background:"var(--bg-muted)" }}>
                {["Nº","Cliente / Nome","Placa / Modelo","Valor","Validade","Status","Ações"].map(h => (
                  <th key={h} style={{ padding:"10px 14px", textAlign:"left", fontSize:11, fontWeight:600, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.05em", whiteSpace:"nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lista.length === 0 ? (
                <tr><td colSpan={7} style={{ padding:40, textAlign:"center", color:"var(--text-muted)" }}>Nenhum orçamento ainda.</td></tr>
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
                        {/* Preview */}
                        <a href={`/orcamento/${o.id}`} target="_blank"
                          className="btn btn-sm btn-secondary"
                          title="Ver orçamento / PDF"
                          style={{ textDecoration:"none" }}>
                          👁️ Ver
                        </a>
                        {/* WhatsApp */}
                        <button className="btn btn-sm" onClick={() => abrirWhatsApp(o)}
                          style={{ background:"#25d366", color:"#fff", border:"none" }}
                          title="Enviar pelo WhatsApp">
                          💬
                        </button>
                        {/* Converter em OS */}
                        {!o.os_id && (
                          <span className="btn btn-sm btn-primary" style={{ cursor:"default" }} title="Converter em OS">OS</span>
                        )}
                        {/* Excluir */}
                        <button className="btn btn-ghost btn-sm" style={{ color:"var(--danger)" }}
                          onClick={() => excluir(o.id)} title="Cancelar">✕</button>
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
