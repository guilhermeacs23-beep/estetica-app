"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const ESTADOS = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

export default function NovoClientePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    nome: "", telefone: "", whatsapp: "", email: "", cpf: "", obs: "",
    endereco: "", cidade: "", estado: "", cep: ""
  });
  const [veiculo, setVeiculo] = useState({ placa: "", modelo: "", marca: "", ano: "", cor: "" });
  const [addVeiculo, setAddVeiculo] = useState(true);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const setV = (k: string, v: string) => setVeiculo(f => ({ ...f, [k]: v }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/clientes", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const json = await res.json();
    if (!json.id) { alert(json.error ?? "Erro ao salvar cliente"); setLoading(false); return; }
    if (addVeiculo && veiculo.placa) {
      await fetch("/api/veiculos", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...veiculo, cliente_id: json.id, ano: veiculo.ano ? parseInt(veiculo.ano) : null }),
      });
    }
    router.push(`/clientes/${json.id}`);
  }

  return (
    <div style={{ maxWidth: 680 }}>
      <div className="mb-6">
        <Link href="/clientes" className="text-sm mb-2 block" style={{ color: "var(--text-muted)" }}>
          Clientes
        </Link>
        <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>Novo Cliente</h1>
      </div>
      <form onSubmit={save} className="flex flex-col gap-5">

        {/* Dados pessoais */}
        <div className="card flex flex-col gap-4">
          <h2 className="font-semibold text-sm uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Dados do Cliente</h2>
          <div className="field">
            <label className="label">Nome *</label>
            <input className="input" value={form.nome} onChange={e => set("nome", e.target.value)} required placeholder="Nome completo" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="field">
              <label className="label">Telefone</label>
              <input className="input" value={form.telefone} onChange={e => set("telefone", e.target.value)} placeholder="(11) 99999-0000" />
            </div>
            <div className="field">
              <label className="label">WhatsApp</label>
              <input className="input" value={form.whatsapp} onChange={e => set("whatsapp", e.target.value)} placeholder="(11) 99999-0000" />
            </div>
            <div className="field">
              <label className="label">E-mail</label>
              <input className="input" type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="email@exemplo.com" />
            </div>
            <div className="field">
              <label className="label">CPF</label>
              <input className="input" value={form.cpf} onChange={e => set("cpf", e.target.value)} placeholder="000.000.000-00" />
            </div>
          </div>
          <div className="field">
            <label className="label">Observacoes</label>
            <textarea className="input" rows={2} value={form.obs} onChange={e => set("obs", e.target.value)} placeholder="Anotacoes sobre o cliente..." />
          </div>
        </div>

        {/* Endereco */}
        <div className="card flex flex-col gap-4">
          <h2 className="font-semibold text-sm uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Endereco</h2>
          <div className="field">
            <label className="label">Rua / Logradouro</label>
            <input className="input" value={form.endereco} onChange={e => set("endereco", e.target.value)} placeholder="Rua das Flores, 123 - Apto 4" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="field col-span-2">
              <label className="label">Cidade</label>
              <input className="input" value={form.cidade} onChange={e => set("cidade", e.target.value)} placeholder="Sao Paulo" />
            </div>
            <div className="field">
              <label className="label">Estado</label>
              <select className="input" value={form.estado} onChange={e => set("estado", e.target.value)}>
                <option value="">UF</option>
                {ESTADOS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
              </select>
            </div>
          </div>
          <div className="field" style={{ maxWidth: 160 }}>
            <label className="label">CEP</label>
            <input className="input" value={form.cep} onChange={e => set("cep", e.target.value)} placeholder="00000-000" />
          </div>
        </div>

        {/* Veiculo */}
        <div className="card flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Veiculo</h2>
            <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: "var(--text-muted)" }}>
              <input type="checkbox" checked={addVeiculo} onChange={e => setAddVeiculo(e.target.checked)} />
              Adicionar veiculo
            </label>
          </div>
          {addVeiculo && (
            <div className="grid grid-cols-2 gap-4">
              <div className="field">
                <label className="label">Placa *</label>
                <input className="input" value={veiculo.placa} onChange={e => setV("placa", e.target.value.toUpperCase())} placeholder="ABC1D23" />
              </div>
              <div className="field">
                <label className="label">Modelo</label>
                <input className="input" value={veiculo.modelo} onChange={e => setV("modelo", e.target.value)} placeholder="Civic, Gol, HB20..." />
              </div>
              <div className="field">
                <label className="label">Marca</label>
                <input className="input" value={veiculo.marca} onChange={e => setV("marca", e.target.value)} placeholder="Toyota, VW, Fiat..." />
              </div>
              <div className="field">
                <label className="label">Ano</label>
                <input className="input" type="number" value={veiculo.ano} onChange={e => setV("ano", e.target.value)} placeholder="2022" />
              </div>
              <div className="field col-span-2">
                <label className="label">Cor</label>
                <input className="input" value={veiculo.cor} onChange={e => setV("cor", e.target.value)} placeholder="Preto, Branco, Prata..." />
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 justify-end">
          <Link href="/clientes" className="btn btn-secondary">Cancelar</Link>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Salvando..." : "Salvar Cliente"}
          </button>
        </div>
      </form>
    </div>
  );
}
