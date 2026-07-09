"use client";
import { useState } from "react";
import Link from "next/link";
import VeiculoForm, { VeiculoFormData } from "@/components/VeiculoForm";

const TIPO_ICON: Record<string, string> = {
  carro: "🚗", suv: "🚙", pickup: "🛻", van: "🚐", caminhao: "🚚", moto: "🏍️",
};

const COR_HEX: Record<string, string> = {
  Branco:"#fff", Prata:"#C0C0C0", Cinza:"#808080", Preto:"#1a1a1a",
  Vermelho:"#CC2200", Azul:"#1A4FA0", Verde:"#2D7A2D", Amarelo:"#F5C518",
  Laranja:"#E07820", Roxo:"#6B3FA0", Marrom:"#7B4F2E", Bege:"#C8B89A",
  Rosa:"#E87090",
};

const BLANK: VeiculoFormData = {
  placa:"", marca:"", modelo:"", ano:"", cor:"", km:"",
  categoria:"", tipo_veiculo:"carro", obs:"",
};

export default function VeiculosClient({ veiculos: ini, tenantId }: { veiculos: any[]; tenantId: string }) {
  const [veiculos, setVeiculos] = useState(ini);
  const [busca, setBusca] = useState("");
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<VeiculoFormData>(BLANK);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [editId, setEditId] = useState<string | null>(null);

  const filtrados = veiculos.filter(v =>
    (v.placa ?? "").toLowerCase().includes(busca.toLowerCase()) ||
    (v.modelo ?? "").toLowerCase().includes(busca.toLowerCase()) ||
    (v.marca ?? "").toLowerCase().includes(busca.toLowerCase()) ||
    ((v.clientes as any)?.nome ?? "").toLowerCase().includes(busca.toLowerCase())
  );

  function abrirNovo() {
    setForm(BLANK); setEditId(null); setErr(""); setModal(true);
  }

  function abrirEditar(v: any) {
    setForm({
      placa: v.placa ?? "", marca: v.marca ?? "", modelo: v.modelo ?? "",
      ano: v.ano ?? "", cor: v.cor ?? "", km: v.km ?? "",
      categoria: v.categoria ?? "", tipo_veiculo: v.tipo_veiculo ?? "carro", obs: v.obs ?? "",
    });
    setEditId(v.id); setErr(""); setModal(true);
  }

  async function salvar() {
    if (!form.placa || !form.modelo) { setErr("Placa e modelo são obrigatórios."); return; }
    setSaving(true); setErr("");
    const body = { ...form, tenant_id: tenantId };
    let res;
    if (editId) {
      res = await fetch("/api/veiculos", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editId, ...form }),
      });
    } else {
      res = await fetch("/api/veiculos", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    }
    const data = await res.json();
    if (!res.ok) { setErr(data.error ?? "Erro ao salvar."); setSaving(false); return; }
    if (editId) {
      setVeiculos(v => v.map(x => x.id === editId ? { ...x, ...form } : x));
    } else {
      setVeiculos(v => [{ ...data, clientes: null }, ...v]);
    }
    setModal(false); setSaving(false);
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>Veículos</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
            {veiculos.length} veículo{veiculos.length !== 1 ? "s" : ""} cadastrado{veiculos.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button onClick={abrirNovo} className="btn btn-primary">+ Novo Veículo</button>
      </div>

      {/* Busca */}
      <input className="input" placeholder="Buscar por placa, modelo, marca ou cliente..."
        value={busca} onChange={e => setBusca(e.target.value)} style={{ maxWidth: 420 }} />

      {/* Tabela */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
              {["Tipo","Placa","Modelo","Marca","Cor","Ano","KM","Cliente",""].map(h => (
                <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11,
                  fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase",
                  letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 && (
              <tr><td colSpan={9} style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>
                {busca ? "Nenhum veículo encontrado." : "Nenhum veículo cadastrado ainda."}
              </td></tr>
            )}
            {filtrados.map((v, i) => {
              const corHex = COR_HEX[v.cor] ?? "#888";
              const borderColor = v.cor === "Branco" ? "#ccc" : corHex;
              return (
                <tr key={v.id} style={{ borderBottom: "1px solid var(--border)",
                  background: i % 2 === 0 ? "transparent" : "var(--surface)" }}>
                  <td style={{ padding: "10px 14px", fontSize: 20 }}>
                    {TIPO_ICON[v.tipo_veiculo] ?? "🚗"}
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    <span className="badge" style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 700,
                      letterSpacing: "0.05em" }}>{v.placa ?? "—"}</span>
                  </td>
                  <td style={{ padding: "10px 14px", fontSize: 13, color: "var(--text)", fontWeight: 600 }}>
                    {v.modelo ?? "—"}
                  </td>
                  <td style={{ padding: "10px 14px", fontSize: 13, color: "var(--text-muted)" }}>
                    {v.marca ?? "—"}
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    {v.cor ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ width: 14, height: 14, borderRadius: "50%",
                          background: corHex, border: `1.5px solid ${borderColor}` }} />
                        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{v.cor}</span>
                      </div>
                    ) : "—"}
                  </td>
                  <td style={{ padding: "10px 14px", fontSize: 13, color: "var(--text-muted)" }}>
                    {v.ano ?? "—"}
                  </td>
                  <td style={{ padding: "10px 14px", fontSize: 13, color: "var(--text-muted)" }}>
                    {v.km ? `${Number(v.km).toLocaleString("pt-BR")} km` : "—"}
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    {v.clientes ? (
                      <Link href={`/clientes/${v.cliente_id}`}
                        style={{ fontSize: 13, color: "var(--primary)", textDecoration: "none", fontWeight: 600 }}>
                        {(v.clientes as any).nome}
                      </Link>
                    ) : <span style={{ fontSize: 13, color: "var(--text-muted)" }}>—</span>}
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    <button onClick={() => abrirEditar(v)}
                      className="btn btn-secondary" style={{ fontSize: 12, padding: "4px 10px" }}>
                      Editar
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }}>
          <div className="card" style={{ width: "100%", maxWidth: 640, maxHeight: "90vh",
            overflowY: "auto", padding: 28 }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-bold text-lg" style={{ color: "var(--text)" }}>
                {editId ? "Editar Veículo" : "Novo Veículo"}
              </h2>
              <button onClick={() => setModal(false)}
                style={{ background: "none", border: "none", fontSize: 20,
                  color: "var(--text-muted)", cursor: "pointer" }}>✕</button>
            </div>

            <VeiculoForm value={form} onChange={setForm} />

            {err && <p className="text-sm mt-3" style={{ color: "var(--danger)" }}>{err}</p>}

            <div className="flex gap-3 justify-end mt-6">
              <button onClick={() => setModal(false)} className="btn btn-secondary">Cancelar</button>
              <button onClick={salvar} disabled={saving} className="btn btn-primary">
                {saving ? "Salvando..." : editId ? "Salvar alterações" : "Cadastrar veículo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
