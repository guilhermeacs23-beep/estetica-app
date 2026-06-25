"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const estadosBR = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

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
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const json = await res.json();
    if (!json.id) { alert(json.error ?? "Erro ao salvar cliente"); setLoading(false); return; }

    if (addVeiculo && veiculo.placa) {
      const vres = await fetch("/api/veiculos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...veiculo, cliente_id: json.id, ano: veiculo.ano ? parseInt(veiculo.ano) : null }),
      });
      const vj = await vres.json();
      if (vj.error) console.warn("Veiculo nao salvo:", vj.error);
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
        <div className="card flex flex-col gap-4">
          <h2 className="font-semibold text-sm uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Dados do Cliente</h2>
          <div className="field">
            <label className="label">Nome *</label>
            <input className="input" value={form.nome} onChange={e => set("nome", e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="field">
              <label className="label">Telefone</label>
              <input className="input" value={form.telefone} onChange={e => set("telefone", e.target.value)} placeholder="(11) 9..." />
            </div>
            <div className="field">
              <label className="label">WhatsApp</label>
              <input className="input" value={form.whatsapp} onChange={e => set("whatsapp", e.target.value)} placeholder="(11) 9..." />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="field">
              <label className="label">E-mail</label>
              <input className="input" type="email" value={form.email} onChange={e => set("email", e.target.value)} />
            </div>
            <div className="field">
              <label className="label">CPF</label>
              <input className="input" value={form.cpf} onChange={e => set("cpf", e.target.value)} placeholder="000.000.000-00" />
            </div>
          </div>
          <div className="field">
            <label className="label">Observacoes</label>
            <textarea className="input min-h-16 resize-none" value={form.obs} onChange={e => set("obs", e.target.value)} />
          </div>
        </div>

        <div className="card flex flex-col gap-4">
          <h2 className="font-semibold text-sm uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Endereco</h2>
          <div className="field">
            <label className="label">Rua / Endereco</label>
            <input className="input" value={form.endereco} onChange={e => set("endereco", e.target.value)} placeholder="Rua, numero, complemento" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="field">
              <label className="label">CEP</label>
              <input className="input" value={form.cep} onChange={e => set("cep", e.target.value)} placeholder="00000-000" maxLength={9} />
            </div>
            <div className="field">
              <label className="label">Cidade</label>
              <input className="input" value={form.cidade} onChange={e => set("cidade", e.target.value)} />
            </div>
            <div className="field">
              <label className="label">Estado</label>
              <select className="input" value={form.estado} onChange={e => set("estado", e.target.value)}>
                <option value="">UF</option>
                {estadosBR.map(uf => <option key={uf} value={uf}>{uf}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="card flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Veiculo</h2>
            <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: "var(--text-muted)" }}>
              <input type="checkbox" checked={addVeiculo} onChange={e => setAddVeiculo(e.target.checked)} />
              Cadastrar veiculo agora
            </label>
          </div>
          {addVeiculo && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="field">
                  <label className="label">Placa *</label>
                  <input className="input" value={veiculo.placa} onChange={e => setV("placa", e.target.value.toUpperCase())} placeholder="ABC-1234" maxLength={8} style={{ textTransform: "uppercase", letterSpacing: 2, fontWeight: 600 }} />
                </div>
                <div className="field">
                  <label className="label">Ano</label>
                  <input className="input" type="number" value={veiculo.ano} onChange={e => setV("ano", e.target.value)} placeholder="2020" min={1960} max={2030} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="field">
                  <label className="label">Marca</label>
                  <input className="input" value={veiculo.marca} onChange={e => setV("marca", e.target.value)} placeholder="Toyota, Honda, Fiat..." />
                </div>
                <div className="field">
                  <label className="label">Modelo</label>
                  <input className="input" value={veiculo.modelo} onChange={e => setV("modelo", e.target.value)} placeholder="Corolla, Civic, Uno..." />
                </div>
              </div>
              <div className="field">
                <label className="label">Cor</label>
                <input className="input" value={veiculo.cor} onChange={e => setV("cor", e.target.value)} placeholder="Prata, Preto, Branco..." />
              </div>
            </>
          )}
        </div>

        <button type="submit" className="btn btn-primary" disabled={loading} style={{ height: 46 }}>
          {loading ? "Salvando..." : "Salvar Cliente"}
        </button>
      </form>
    </div>
  );
}
