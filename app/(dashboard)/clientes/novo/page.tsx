"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import VeiculoForm, { VeiculoFormData } from "@/components/VeiculoForm";

const estadosBR = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

const veiculoVazio: VeiculoFormData = {
  placa: "", marca: "", modelo: "", ano: "", cor: "", km: "", categoria: "", tipo_veiculo: "carro", obs: ""
};

export default function NovoClientePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    nome: "", telefone: "", whatsapp: "", email: "", cpf: "", obs: "",
    endereco: "", cidade: "", estado: "", cep: ""
  });
  const [veiculo, setVeiculo] = useState<VeiculoFormData>(veiculoVazio);
  const [addVeiculo, setAddVeiculo] = useState(true);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

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
        body: JSON.stringify({
          ...veiculo,
          cliente_id: json.id,
          ano: veiculo.ano ? parseInt(veiculo.ano) : null,
          km: veiculo.km ? parseInt(veiculo.km) : null,
        }),
      });
    }
    router.push(`/clientes/${json.id}`);
  }

  return (
    <div style={{ maxWidth: 680 }}>
      <div className="mb-6">
        <Link href="/clientes" className="text-sm mb-2 block" style={{ color: "var(--text-muted)" }}>← Clientes</Link>
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
              <input className="input" value={form.telefone} onChange={e => set("telefone", e.target.value)} placeholder="(41) 99999-0000" />
            </div>
            <div className="field">
              <label className="label">WhatsApp</label>
              <input className="input" value={form.whatsapp} onChange={e => set("whatsapp", e.target.value)} placeholder="(41) 99999-0000" />
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
            <label className="label">Observações</label>
            <textarea className="input" rows={2} value={form.obs} onChange={e => set("obs", e.target.value)} placeholder="Anotações sobre o cliente..." />
          </div>
        </div>

        {/* Endereço */}
        <div className="card flex flex-col gap-4">
          <h2 className="font-semibold text-sm uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Endereço (opcional)</h2>
          <div className="field">
            <label className="label">Endereço</label>
            <input className="input" value={form.endereco} onChange={e => set("endereco", e.target.value)} placeholder="Rua, número, bairro" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="field">
              <label className="label">Cidade</label>
              <input className="input" value={form.cidade} onChange={e => set("cidade", e.target.value)} />
            </div>
            <div className="field">
              <label className="label">Estado</label>
              <select className="input" value={form.estado} onChange={e => set("estado", e.target.value)}>
                <option value="">—</option>
                {estadosBR.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="field">
              <label className="label">CEP</label>
              <input className="input" value={form.cep} onChange={e => set("cep", e.target.value)} placeholder="00000-000" />
            </div>
          </div>
        </div>

        {/* Veículo */}
        <div className="card flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Veículo</h2>
            <label className="flex items-center gap-2 cursor-pointer text-sm" style={{ color: "var(--text)" }}>
              <input type="checkbox" checked={addVeiculo} onChange={e => setAddVeiculo(e.target.checked)} />
              Adicionar veículo agora
            </label>
          </div>
          {addVeiculo && (
            <VeiculoForm value={veiculo} onChange={setVeiculo} />
          )}
        </div>

        <div className="flex gap-3 justify-end pb-8">
          <Link href="/clientes" className="btn btn-secondary">Cancelar</Link>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Salvando..." : "Salvar Cliente"}
          </button>
        </div>
      </form>
    </div>
  );
}
