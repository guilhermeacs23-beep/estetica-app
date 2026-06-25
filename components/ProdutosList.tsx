"use client";
import { useState } from "react";

const UNIDADES = ["un", "ml", "L", "g", "kg", "m", "m²"];

export default function ProdutosList({ produtos: inicial, tenantId: _ }: { produtos: any[]; tenantId: string }) {
  const [produtos, setProdutos] = useState(inicial);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ nome: "", unidade: "un", custo_unitario: "", estoque_atual: "", estoque_minimo: "" });
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/produtos", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome: form.nome, unidade: form.unidade,
        custo_unitario: parseFloat(form.custo_unitario) || 0,
        estoque_atual: parseFloat(form.estoque_atual) || 0,
        estoque_minimo: parseFloat(form.estoque_minimo) || 0,
      }),
    });
    const json = await res.json();
    if (json.id) { setProdutos(p => [...p, json]); setShowForm(false); setForm({ nome:"",unidade:"un",custo_unitario:"",estoque_atual:"",estoque_minimo:"" }); }
    setLoading(false);
  }

  async function patch(id: string, data: Record<string, unknown>) {
    const res = await fetch(`/api/produtos/${id}`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body: JSON.stringify(data) });
    const json = await res.json();
    setProdutos(p => p.map(x => x.id === id ? json : x));
  }

  const fmtCusto = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color:"var(--text)" }}>Produtos / Insumos</h1>
          <p className="text-sm mt-1" style={{ color:"var(--text-muted)" }}>{produtos.length} produtos cadastrados · custo dos serviços</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn btn-primary">+ Novo Produto</button>
      </div>

      {showForm && (
        <form onSubmit={save} className="card flex flex-col gap-4">
          <h2 className="font-semibold" style={{ color:"var(--text)" }}>Novo Produto / Insumo</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="field col-span-2">
              <label className="label">Nome do Produto *</label>
              <input className="input" value={form.nome} onChange={e => set("nome", e.target.value)} placeholder="Ex: Shampoo Automotivo, Cera Líquida..." required />
            </div>
            <div className="field">
              <label className="label">Unidade de Medida</label>
              <select className="input" value={form.unidade} onChange={e => set("unidade", e.target.value)}>
                {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div className="field">
              <label className="label">Custo por Unidade (R$) *</label>
              <input className="input" type="number" step="0.01" min="0" value={form.custo_unitario} onChange={e => set("custo_unitario", e.target.value)} placeholder="0,00" required />
            </div>
            <div className="field">
              <label className="label">Estoque Atual</label>
              <input className="input" type="number" step="0.001" min="0" value={form.estoque_atual} onChange={e => set("estoque_atual", e.target.value)} placeholder="0" />
            </div>
            <div className="field">
              <label className="label">Estoque Mínimo (alerta)</label>
              <input className="input" type="number" step="0.001" min="0" value={form.estoque_minimo} onChange={e => set("estoque_minimo", e.target.value)} placeholder="0" />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary">Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? "Salvando..." : "Salvar"}</button>
          </div>
        </form>
      )}

      <div className="table-wrapper">
        <table>
          <thead>
            <tr><th>Produto</th><th>Unidade</th><th>Custo Unit.</th><th>Estoque</th><th>Mín.</th><th>Status</th></tr>
          </thead>
          <tbody>
            {!produtos.length ? (
              <tr><td colSpan={6} className="text-center py-10" style={{ color:"var(--text-muted)" }}>Nenhum produto cadastrado. Adicione insumos para calcular o custo dos serviços.</td></tr>
            ) : produtos.map(p => {
              const baixo = p.estoque_atual !== null && p.estoque_minimo !== null && p.estoque_atual <= p.estoque_minimo;
              return (
                <tr key={p.id}>
                  <td className="font-medium" style={{ color:"var(--text)" }}>{p.nome}</td>
                  <td style={{ color:"var(--text-muted)" }}>{p.unidade}</td>
                  <td style={{ color:"var(--primary)" }}>{fmtCusto(p.custo_unitario)}</td>
                  <td>
                    <span style={{ color: baixo ? "var(--warning)" : "var(--text)" }}>
                      {p.estoque_atual ?? 0} {p.unidade}
                      {baixo && " ⚠️"}
                    </span>
                  </td>
                  <td style={{ color:"var(--text-muted)" }}>{p.estoque_minimo ?? 0} {p.unidade}</td>
                  <td>
                    <button onClick={() => patch(p.id, { ativo: !p.ativo })} className={`badge ${p.ativo ? "badge-finalizado" : "badge-recusado"}`} style={{ cursor:"pointer", border:"none" }}>
                      {p.ativo ? "Ativo" : "Inativo"}
                    </button>
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
