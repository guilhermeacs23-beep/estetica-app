"use client";
import { useState, useEffect, useCallback } from "react";

const CATEGORIAS = ["Lavagem","Polimento","Vitrificação","Higienização","Cristalização","Plotagem","Outros"];

function calcPrecoSugerido(custoProdutos: number, custoOutros: number, markup: number) {
  const custoTotal = custoProdutos + custoOutros;
  return custoTotal * (1 + markup / 100);
}

export default function ServicosList({ servicos: inicial }: { servicos: any[] }) {
  const [servicos, setServicos] = useState(inicial);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    nome: "", categoria: "", duracao_min: "60",
    custo_outros: "0", markup: "100",
    preco_base: "", descricao: "", tempo_retorno_dias: "",
  });
  const [ficha, setFicha] = useState<{ produto_id: string; quantidade: string }[]>([]);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => { fetch("/api/produtos").then(r => r.json()).then(setProdutos); }, []);

  const custoProdutos = ficha.reduce((acc, linha) => {
    const p = produtos.find(x => x.id === linha.produto_id);
    return acc + (p ? p.custo_unitario * (parseFloat(linha.quantidade) || 0) : 0);
  }, 0);

  const precoSugerido = calcPrecoSugerido(custoProdutos, parseFloat(form.custo_outros) || 0, parseFloat(form.markup) || 0);

  function resetForm() {
    setForm({ nome:"",categoria:"",duracao_min:"60",custo_outros:"0",markup:"100",preco_base:"",descricao:"",tempo_retorno_dias:"" });
    setFicha([]);
    setEditId(null);
  }

  function addLinha() { setFicha(f => [...f, { produto_id: produtos[0]?.id ?? "", quantidade: "1" }]); }
  function removeLinha(i: number) { setFicha(f => f.filter((_, idx) => idx !== i)); }
  function setLinha(i: number, k: string, v: string) {
    setFicha(f => f.map((l, idx) => idx === i ? { ...l, [k]: v } : l));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const payload = {
      nome: form.nome, categoria: form.categoria,
      duracao_min: parseInt(form.duracao_min) || 60,
      custo_outros: parseFloat(form.custo_outros) || 0,
      custo_produtos: custoProdutos,
      markup: parseFloat(form.markup) || 100,
      preco_sugerido: precoSugerido,
      preco_base: parseFloat(form.preco_base) || precoSugerido,
      tempo_estimado: parseInt(form.duracao_min) || 60,
      tempo_retorno_dias: form.tempo_retorno_dias ? parseInt(form.tempo_retorno_dias) : null,
      descricao: form.descricao,
      ficha_tecnica: ficha.filter(l => l.produto_id && parseFloat(l.quantidade) > 0),
    };
    const url = editId ? `/api/servicos/${editId}` : "/api/servicos";
    const method = editId ? "PATCH" : "POST";
    const res = await fetch(url, { method, headers: {"Content-Type":"application/json"}, body: JSON.stringify(payload) });
    const json = await res.json();
    if (json.id) {
      if (editId) setServicos(p => p.map(s => s.id === json.id ? json : s));
      else setServicos(p => [...p, json]);
      setShowForm(false); resetForm();
    }
    setLoading(false);
  }

  function openEdit(s: any) {
    setForm({
      nome: s.nome, categoria: s.categoria ?? "",
      duracao_min: String(s.duracao_min ?? 60),
      custo_outros: String(s.custo_outros ?? 0),
      markup: String(s.markup ?? 100),
      preco_base: String(s.preco_base),
      descricao: s.descricao ?? "",
      tempo_retorno_dias: String(s.tempo_retorno_dias ?? ""),
    });
    setEditId(s.id);
    setShowForm(true);
  }

  const fmtR = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color:"var(--text)" }}>Serviços</h1>
          <p className="text-sm mt-1" style={{ color:"var(--text-muted)" }}>{servicos.length} serviços · com formação de preço</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(!showForm); }} className="btn btn-primary">+ Novo Serviço</button>
      </div>

      {showForm && (
        <form onSubmit={save} className="card flex flex-col gap-5">
          <h2 className="font-semibold text-lg" style={{ color:"var(--text)" }}>{editId ? "Editar Serviço" : "Novo Serviço"}</h2>

          {/* Dados básicos */}
          <div className="grid grid-cols-2 gap-4">
            <div className="field col-span-2"><label className="label">Nome do Serviço *</label>
              <input className="input" value={form.nome} onChange={e => set("nome", e.target.value)} required /></div>
            <div className="field col-span-2">
              <label className="label">💬 Descrição do Serviço</label>
              <textarea className="input" rows={3} value={form.descricao} onChange={e => set("descricao", e.target.value)}
                placeholder="Descreva o serviço para uso em catálogos, WhatsApp e orçamentos. Ex: Lavagem completa com shampoo neutro, secagem com microfibra e aspiração interna..." />
              <span className="text-xs mt-1" style={{ color:"var(--text-subtle)" }}>
                Aparece nos orçamentos enviados ao cliente e em comunicações automáticas.
              </span>
            </div>
            <div className="field"><label className="label">Categoria</label>
              <select className="input" value={form.categoria} onChange={e => set("categoria", e.target.value)}>
                <option value="">Geral</option>
                {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="field"><label className="label">Duração estimada (min)</label>
              <input className="input" type="number" value={form.duracao_min} onChange={e => set("duracao_min", e.target.value)} /></div>
            <div className="field col-span-2">
              <label className="label">⏱️ Tempo de Retorno (dias)</label>
              <input className="input" type="number" min="1" value={form.tempo_retorno_dias}
                onChange={e => set("tempo_retorno_dias", e.target.value)}
                placeholder="Ex: 30 (lavagem mensal), 90 (polimento trimestral), 180 (vitrificação)" />
              <span className="text-xs mt-1" style={{ color:"var(--text-subtle)" }}>
                Usado para alertar quando o cliente deve retornar. Deixe em branco para serviços sem periodicidade.
              </span>
            </div>
          </div>

          {/* Ficha técnica de produtos */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">📦 Ficha Técnica de Produtos</label>
              <button type="button" onClick={addLinha} className="btn btn-sm btn-secondary">+ Adicionar produto</button>
            </div>
            {ficha.length === 0 && (
              <p className="text-xs py-2" style={{ color:"var(--text-subtle)" }}>Nenhum produto adicionado. Adicione os insumos consumidos neste serviço.</p>
            )}
            {ficha.map((linha, i) => {
              const prod = produtos.find(p => p.id === linha.produto_id);
              const subtotal = prod ? prod.custo_unitario * (parseFloat(linha.quantidade) || 0) : 0;
              return (
                <div key={i} className="grid gap-3 mb-2 items-center" style={{ gridTemplateColumns: "1fr 100px 100px 32px" }}>
                  <select className="input" value={linha.produto_id} onChange={e => setLinha(i, "produto_id", e.target.value)}>
                    {produtos.map(p => <option key={p.id} value={p.id}>{p.nome} (R$ {p.custo_unitario.toFixed(2)}/{p.unidade})</option>)}
                  </select>
                  <input className="input text-right" type="number" step="0.001" min="0" value={linha.quantidade}
                    onChange={e => setLinha(i, "quantidade", e.target.value)} placeholder="Qtd" />
                  <span className="text-sm text-right" style={{ color:"var(--text-muted)" }}>{fmtR(subtotal)}</span>
                  <button type="button" onClick={() => removeLinha(i)} className="btn btn-icon btn-ghost btn-sm" style={{ color:"var(--danger)" }}>✕</button>
                </div>
              );
            })}
            {ficha.length > 0 && (
              <div className="text-right text-sm font-medium mt-1" style={{ color:"var(--text)" }}>
                Custo produtos: <span style={{ color:"var(--primary)" }}>{fmtR(custoProdutos)}</span>
              </div>
            )}
          </div>

          {/* Formação de preço */}
          <div className="card" style={{ background:"var(--bg)", border:"1px solid var(--border)" }}>
            <h3 className="text-sm font-semibold mb-3" style={{ color:"var(--text)" }}>💰 Formação de Preço</h3>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="field">
                <label className="label">Custo produtos</label>
                <input className="input" value={fmtR(custoProdutos)} readOnly style={{ opacity:0.6 }} />
              </div>
              <div className="field">
                <label className="label">Outros custos (R$)</label>
                <input className="input" type="number" step="0.01" min="0" value={form.custo_outros} onChange={e => set("custo_outros", e.target.value)} placeholder="MOD, energia..." />
              </div>
              <div className="field">
                <label className="label">Markup (%)</label>
                <input className="input" type="number" step="1" min="0" value={form.markup} onChange={e => set("markup", e.target.value)} placeholder="100" />
              </div>
            </div>
            {/* Resumo */}
            <div className="grid grid-cols-3 gap-3 text-center p-3 rounded-lg" style={{ background:"var(--bg-card)" }}>
              <div>
                <p className="text-xs" style={{ color:"var(--text-muted)" }}>Custo Total</p>
                <p className="font-semibold" style={{ color:"var(--text)" }}>{fmtR(custoProdutos + (parseFloat(form.custo_outros)||0))}</p>
              </div>
              <div>
                <p className="text-xs" style={{ color:"var(--text-muted)" }}>Markup {form.markup}%</p>
                <p className="font-semibold" style={{ color:"var(--success)" }}>+{fmtR((custoProdutos + (parseFloat(form.custo_outros)||0)) * (parseFloat(form.markup)||0) / 100)}</p>
              </div>
              <div>
                <p className="text-xs" style={{ color:"var(--text-muted)" }}>Preço Sugerido</p>
                <p className="font-bold text-lg" style={{ color:"var(--primary)" }}>{fmtR(precoSugerido)}</p>
              </div>
            </div>
          </div>

          <div className="field">
            <label className="label">Preço de Venda Final (R$) *</label>
            <input className="input" type="number" step="0.01" min="0" value={form.preco_base}
              onChange={e => set("preco_base", e.target.value)}
              placeholder={`Sugerido: ${fmtR(precoSugerido)}`} required />
            <span className="text-xs mt-1" style={{ color:"var(--text-subtle)" }}>
              Deixe em branco para usar o preço sugerido calculado acima
            </span>
          </div>

          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => { setShowForm(false); resetForm(); }} className="btn btn-secondary">Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? "Salvando..." : "Salvar Serviço"}</button>
          </div>
        </form>
      )}

      {/* Tabela */}
      <div className="table-wrapper">
        <table>
          <thead>
            <tr><th>Nome</th><th>Categoria</th><th>Custo Total</th><th>Markup</th><th>Preço Sugerido</th><th>Preço Final</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {!servicos.length ? (
              <tr><td colSpan={8} className="text-center py-10" style={{ color:"var(--text-muted)" }}>
                Nenhum serviço cadastrado ainda.
              </td></tr>
            ) : servicos.map(s => {
              const custoTotal = (s.custo_produtos ?? 0) + (s.custo_outros ?? 0);
              return (
                <tr key={s.id}>
                  <td className="font-medium" style={{ color:"var(--text)" }}>{s.nome}</td>
                  <td style={{ color:"var(--text-muted)" }}>{s.categoria || "Geral"}</td>
                  <td style={{ color:"var(--text-muted)" }}>{fmtR(custoTotal)}</td>
                  <td style={{ color:"var(--text-muted)" }}>{s.markup ?? 100}%</td>
                  <td style={{ color:"var(--text-muted)" }}>{fmtR(s.preco_sugerido ?? 0)}</td>
                  <td className="font-semibold" style={{ color:"var(--primary)" }}>{fmtR(s.preco_base)}</td>
                  <td style={{ color:"var(--text-muted)" }}>{s.tempo_retorno_dias ? `${s.tempo_retorno_dias}d` : "-"}</td>
                  <td><span className={`badge ${s.ativo ? "badge-finalizado" : "badge-recusado"}`}>{s.ativo ? "Ativo" : "Inativo"}</span></td>
                  <td>
                    <button onClick={() => openEdit(s)} className="btn btn-sm btn-ghost">Editar</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
