"use client";
import { useState, useMemo } from "react";

type Produto = {
  id: string; nome: string; codigo_sku?: string; categoria?: string;
  unidade: string; custo_unitario: number; estoque_atual: number;
  estoque_minimo: number; fornecedor?: string; ativo: boolean;
};

const UNIDADES = ["un","cx","kg","L","mL","g","par","rolo","pct","frasco"];
const CATEGORIAS = ["Produto Químico","Microfibra","Esponja","Cera / Coating","Pano / Flanela","Embalagem","EPI","Outro"];

const EMPTY: Partial<Produto> = {
  nome: "", codigo_sku: "", categoria: "", unidade: "un",
  custo_unitario: 0, estoque_atual: 0, estoque_minimo: 0, fornecedor: ""
};

export default function ProdutosClient({ produtos: inicial, tenantId, role }: {
  produtos: Produto[]; tenantId: string; role: string;
}) {
  const [produtos, setProdutos] = useState<Produto[]>(inicial);
  const [modal, setModal] = useState<"novo" | "editar" | null>(null);
  const [form, setForm] = useState<Partial<Produto>>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [busca, setBusca] = useState("");
  const [filtroAlerta, setFiltroAlerta] = useState(false);

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  // KPIs
  const totalSkus = produtos.length;
  const valorTotal = produtos.reduce((s, p) => s + (p.estoque_atual * p.custo_unitario), 0);
  const alertas = produtos.filter(p => p.estoque_atual <= p.estoque_minimo);

  // Filtro
  const lista = useMemo(() => {
    let r = produtos;
    if (filtroAlerta) r = r.filter(p => p.estoque_atual <= p.estoque_minimo);
    if (busca) r = r.filter(p =>
      p.nome.toLowerCase().includes(busca.toLowerCase()) ||
      (p.codigo_sku ?? "").toLowerCase().includes(busca.toLowerCase()) ||
      (p.categoria ?? "").toLowerCase().includes(busca.toLowerCase())
    );
    return r;
  }, [produtos, busca, filtroAlerta]);

  function abrirNovo() { setForm(EMPTY); setModal("novo"); }
  function abrirEditar(p: Produto) { setForm(p); setModal("editar"); }

  async function salvar() {
    setSaving(true);
    const method = modal === "novo" ? "POST" : "PATCH";
    const body = { ...form, custo_unitario: Number(form.custo_unitario), estoque_atual: Number(form.estoque_atual), estoque_minimo: Number(form.estoque_minimo) };
    const res = await fetch("/api/produtos", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json();
    if (data.error) { alert(data.error); setSaving(false); return; }
    if (modal === "novo") setProdutos(prev => [...prev, data].sort((a, b) => a.nome.localeCompare(b.nome)));
    else setProdutos(prev => prev.map(p => p.id === data.id ? data : p));
    setModal(null);
    setSaving(false);
  }

  async function ajustarEstoque(p: Produto, delta: number) {
    const novo = Math.max(0, p.estoque_atual + delta);
    const res = await fetch("/api/produtos", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: p.id, estoque_atual: novo }) });
    const data = await res.json();
    if (!data.error) setProdutos(prev => prev.map(x => x.id === p.id ? { ...x, estoque_atual: novo } : x));
  }

  async function excluir(id: string) {
    if (!confirm("Inativar este produto?")) return;
    await fetch("/api/produtos", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setProdutos(prev => prev.filter(p => p.id !== id));
  }

  const cor = (p: Produto) => p.estoque_atual === 0 ? "var(--danger)" : p.estoque_atual <= p.estoque_minimo ? "#f97316" : "var(--success)";
  const badge = (p: Produto) => p.estoque_atual === 0 ? "SEM ESTOQUE" : p.estoque_atual <= p.estoque_minimo ? "REPOR" : "OK";

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>Estoque</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Produtos e insumos utilizados nos serviços</p>
        </div>
        <button className="btn btn-primary" onClick={abrirNovo}>+ Novo Produto</button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <div className="kpi-card">
          <p className="kpi-label">Total SKUs</p>
          <p className="kpi-value">{totalSkus}</p>
        </div>
        <div className="kpi-card">
          <p className="kpi-label">Valor em Estoque</p>
          <p className="kpi-value">R$ {valorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="kpi-card" onClick={() => setFiltroAlerta(!filtroAlerta)}
          style={{ cursor: "pointer", borderLeft: alertas.length ? "3px solid #f97316" : undefined }}>
          <p className="kpi-label">Precisam Repor</p>
          <p className="kpi-value" style={{ color: alertas.length ? "#f97316" : "var(--text)" }}>{alertas.length}</p>
          {alertas.length > 0 && <p className="text-xs mt-1" style={{ color: "#f97316" }}>{filtroAlerta ? "Mostrar todos" : "Clique para filtrar"}</p>}
        </div>
      </div>

      {/* Busca */}
      <div className="flex gap-3 flex-wrap">
        <input className="input" style={{ maxWidth: 320 }} placeholder="Buscar produto, SKU, categoria..."
          value={busca} onChange={e => setBusca(e.target.value)} />
        {filtroAlerta && (
          <button className="btn btn-secondary btn-sm" onClick={() => setFiltroAlerta(false)}>
            ⚠️ Alertas ({alertas.length}) ✕
          </button>
        )}
      </div>

      {/* Tabela */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-muted)" }}>
                {["SKU","Produto","Categoria","Un.","Custo","Estoque","Mínimo","Valor Total","Status",""].map(h => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lista.length === 0 ? (
                <tr><td colSpan={10} style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>
                  {busca || filtroAlerta ? "Nenhum produto encontrado" : "Nenhum produto cadastrado. Clique em '+ Novo Produto' para começar."}
                </td></tr>
              ) : lista.map(p => (
                <tr key={p.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "10px 14px", fontSize: 12, color: "var(--text-muted)", fontFamily: "monospace" }}>{p.codigo_sku || "—"}</td>
                  <td style={{ padding: "10px 14px", fontWeight: 500, color: "var(--text)" }}>
                    {p.nome}
                    {p.fornecedor && <span style={{ display: "block", fontSize: 11, color: "var(--text-muted)", fontWeight: 400 }}>{p.fornecedor}</span>}
                  </td>
                  <td style={{ padding: "10px 14px", fontSize: 13, color: "var(--text-muted)" }}>{p.categoria || "—"}</td>
                  <td style={{ padding: "10px 14px", fontSize: 13, color: "var(--text-muted)" }}>{p.unidade}</td>
                  <td style={{ padding: "10px 14px", fontSize: 13 }}>R$ {Number(p.custo_unitario).toFixed(2).replace(".",",")}</td>
                  <td style={{ padding: "10px 14px" }}>
                    <div className="flex items-center gap-2">
                      <button onClick={() => ajustarEstoque(p, -1)} style={{ width: 24, height: 24, borderRadius: 4, border: "1px solid var(--border)", background: "var(--bg)", cursor: "pointer", fontSize: 14, color: "var(--text)" }}>−</button>
                      <span style={{ fontWeight: 600, minWidth: 32, textAlign: "center", color: cor(p) }}>{p.estoque_atual}</span>
                      <button onClick={() => ajustarEstoque(p, 1)} style={{ width: 24, height: 24, borderRadius: 4, border: "1px solid var(--border)", background: "var(--bg)", cursor: "pointer", fontSize: 14, color: "var(--text)" }}>+</button>
                    </div>
                  </td>
                  <td style={{ padding: "10px 14px", fontSize: 13, color: "var(--text-muted)" }}>{p.estoque_minimo}</td>
                  <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 500 }}>R$ {(p.estoque_atual * p.custo_unitario).toFixed(2).replace(".",",")}</td>
                  <td style={{ padding: "10px 14px" }}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 12, background: cor(p) + "22", color: cor(p) }}>{badge(p)}</span>
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    <div className="flex gap-2">
                      <button className="btn btn-ghost btn-sm" onClick={() => abrirEditar(p)}>✏️</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => excluir(p.id)}>🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div className="card" style={{ width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto" }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold" style={{ color: "var(--text)" }}>{modal === "novo" ? "Novo Produto" : "Editar Produto"}</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="field col-span-2">
                  <label className="label">Nome *</label>
                  <input className="input" value={form.nome ?? ""} onChange={e => set("nome", e.target.value)} required />
                </div>
                <div className="field">
                  <label className="label">Código SKU</label>
                  <input className="input" value={form.codigo_sku ?? ""} onChange={e => set("codigo_sku", e.target.value)} placeholder="Ex: SHAN-500ML" />
                </div>
                <div className="field">
                  <label className="label">Categoria</label>
                  <select className="input" value={form.categoria ?? ""} onChange={e => set("categoria", e.target.value)}>
                    <option value="">Selecionar...</option>
                    {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label className="label">Unidade</label>
                  <select className="input" value={form.unidade ?? "un"} onChange={e => set("unidade", e.target.value)}>
                    {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label className="label">Custo Unitário (R$)</label>
                  <input className="input" type="number" step="0.01" min="0" value={form.custo_unitario ?? 0} onChange={e => set("custo_unitario", e.target.value)} />
                </div>
                <div className="field">
                  <label className="label">Estoque Atual</label>
                  <input className="input" type="number" step="0.001" min="0" value={form.estoque_atual ?? 0} onChange={e => set("estoque_atual", e.target.value)} />
                </div>
                <div className="field">
                  <label className="label">Estoque Mínimo (ponto de reposição)</label>
                  <input className="input" type="number" step="0.001" min="0" value={form.estoque_minimo ?? 0} onChange={e => set("estoque_minimo", e.target.value)} />
                </div>
                <div className="field col-span-2">
                  <label className="label">Fornecedor</label>
                  <input className="input" value={form.fornecedor ?? ""} onChange={e => set("fornecedor", e.target.value)} placeholder="Nome do fornecedor" />
                </div>
              </div>
              <div className="flex gap-3 justify-end mt-2">
                <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
                <button className="btn btn-primary" onClick={salvar} disabled={saving || !form.nome}>
                  {saving ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
