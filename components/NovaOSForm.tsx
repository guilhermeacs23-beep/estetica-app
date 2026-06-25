"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const CHECKLIST_ITENS = [
  "Riscos na lataria", "Amassados", "Para-choque dianteiro", "Para-choque traseiro",
  "Retrovisores", "Vidros", "Rodas/calotas", "Interior", "Documentos no carro",
  "Tapetes", "Estepe", "Macaco/triangulo",
];

interface Props {
  tenantId: string; userId: string;
  clientes: any[]; servicos: any[]; formas: any[]; funcionarios: any[];
}

export default function NovaOSForm({ tenantId, userId, clientes, servicos, formas, funcionarios }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  const [clienteId, setClienteId] = useState("");
  const [novoCliente, setNovoCliente] = useState(false);
  const [nomeCliente, setNomeCliente] = useState("");
  const [telCliente, setTelCliente] = useState("");
  const [veiculos, setVeiculos] = useState<any[]>([]);
  const [veiculoId, setVeiculoId] = useState("");
  const [novoVeiculo, setNovoVeiculo] = useState(false);
  const [placa, setPlaca] = useState("");
  const [modelo, setModelo] = useState("");
  const [marca, setMarca] = useState("");
  const [cor, setCor] = useState("");
  const [ano, setAno] = useState("");

  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [obsChecklist, setObsChecklist] = useState("");

  const [itensOS, setItensOS] = useState<Array<{ servicoId: string; nome: string; preco: number; funcionarioId: string }>>([]);
  const [dataEntrada, setDataEntrada] = useState(new Date().toISOString().split("T")[0]);
  const [horaEntrada, setHoraEntrada] = useState("08:00");
  const [obs, setObs] = useState("");

  const [formaPagamentoId, setFormaPagamentoId] = useState("");
  const [desconto, setDesconto] = useState("");

  async function buscarVeiculos(cId: string) {
    const res = await fetch(`/api/veiculos?clienteId=${cId}`);
    const json = await res.json();
    setVeiculos(json.data ?? []);
  }

  function adicionarServico(s: any) {
    if (itensOS.find(i => i.servicoId === s.id)) return;
    setItensOS(prev => [...prev, { servicoId: s.id, nome: s.nome, preco: s.preco_base, funcionarioId: "" }]);
  }

  const totalServicos = itensOS.reduce((a, i) => a + i.preco, 0);
  const descontoNum = parseFloat(desconto) || 0;
  const valorFinal = Math.max(0, totalServicos - descontoNum);

  async function handleSubmit() {
    setLoading(true);
    const res = await fetch("/api/ordens-servico", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenantId, userId,
        clienteId: novoCliente ? null : clienteId,
        novoCliente: novoCliente ? { nome: nomeCliente, telefone: telCliente, whatsapp: telCliente } : null,
        veiculoId: novoVeiculo ? null : veiculoId,
        novoVeiculo: novoVeiculo ? { placa: placa.toUpperCase(), modelo, marca, cor, ano: ano ? parseInt(ano) : null } : null,
        checklist: { ...checklist, observacoes: obsChecklist },
        itens: itensOS, dataEntrada, horaEntrada, observacoes: obs,
        formaPagamentoId, desconto: descontoNum, valorTotal: totalServicos, valorFinal,
      }),
    });
    const json = await res.json();
    if (json.osId) router.push(`/ordens-de-servico/${json.osId}`);
    else { alert(json.error ?? "Erro ao criar OS"); setLoading(false); }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        {["Cliente/Veiculo", "Checklist", "Servicos", "Pagamento"].map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ background: step > i + 1 ? "var(--success)" : step === i + 1 ? "var(--primary)" : "var(--border)",
                       color: step <= i + 1 ? (step === i + 1 ? "white" : "var(--text-muted)") : "white" }}>
              {step > i + 1 ? "v" : i + 1}
            </div>
            <span className="text-sm hidden sm:block" style={{ color: step === i + 1 ? "var(--text)" : "var(--text-muted)", fontWeight: step === i + 1 ? 600 : 400 }}>{s}</span>
            {i < 3 && <div className="w-6 h-px" style={{ background: "var(--border)" }} />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="card flex flex-col gap-5">
          <h2 className="font-semibold" style={{ color: "var(--text)" }}>Cliente</h2>
          <div className="flex gap-2 mb-2">
            <button onClick={() => setNovoCliente(false)} className={`btn btn-sm ${!novoCliente ? "btn-primary" : "btn-secondary"}`}>Existente</button>
            <button onClick={() => setNovoCliente(true)} className={`btn btn-sm ${novoCliente ? "btn-primary" : "btn-secondary"}`}>Novo Cliente</button>
          </div>
          {!novoCliente ? (
            <div className="field">
              <label className="label">Selecionar cliente</label>
              <select className="input" value={clienteId} onChange={e => { setClienteId(e.target.value); buscarVeiculos(e.target.value); }}>
                <option value="">-- Selecione --</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div className="field col-span-2"><label className="label">Nome *</label><input className="input" value={nomeCliente} onChange={e => setNomeCliente(e.target.value)} placeholder="Nome do cliente" /></div>
              <div className="field col-span-2"><label className="label">Telefone/WhatsApp</label><input className="input" value={telCliente} onChange={e => setTelCliente(e.target.value)} placeholder="(11) 99999-9999" /></div>
            </div>
          )}

          <hr style={{ border: "none", borderTop: "1px solid var(--border)" }} />
          <h2 className="font-semibold" style={{ color: "var(--text)" }}>Veiculo</h2>
          {clienteId && veiculos.length > 0 && (
            <div className="flex gap-2 mb-2">
              <button onClick={() => setNovoVeiculo(false)} className={`btn btn-sm ${!novoVeiculo ? "btn-primary" : "btn-secondary"}`}>Existente</button>
              <button onClick={() => setNovoVeiculo(true)} className={`btn btn-sm ${novoVeiculo ? "btn-primary" : "btn-secondary"}`}>Novo Veiculo</button>
            </div>
          )}
          {(!clienteId || novoVeiculo || novoCliente || veiculos.length === 0) ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="field"><label className="label">Placa *</label><input className="input uppercase" value={placa} onChange={e => setPlaca(e.target.value)} placeholder="AAA-0000" /></div>
              <div className="field"><label className="label">Ano</label><input className="input" type="number" value={ano} onChange={e => setAno(e.target.value)} placeholder="2020" /></div>
              <div className="field"><label className="label">Marca *</label><input className="input" value={marca} onChange={e => setMarca(e.target.value)} placeholder="Honda" /></div>
              <div className="field"><label className="label">Modelo *</label><input className="input" value={modelo} onChange={e => setModelo(e.target.value)} placeholder="Civic" /></div>
              <div className="field col-span-2"><label className="label">Cor</label><input className="input" value={cor} onChange={e => setCor(e.target.value)} placeholder="Prata" /></div>
            </div>
          ) : (
            <div className="field">
              <label className="label">Selecionar veiculo</label>
              <select className="input" value={veiculoId} onChange={e => setVeiculoId(e.target.value)}>
                <option value="">-- Selecione --</option>
                {veiculos.map(v => <option key={v.id} value={v.id}>{v.placa} - {v.modelo} - {v.cor}</option>)}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 mt-2">
            <div className="field"><label className="label">Data *</label><input className="input" type="date" value={dataEntrada} onChange={e => setDataEntrada(e.target.value)} /></div>
            <div className="field"><label className="label">Horario de entrada</label><input className="input" type="time" value={horaEntrada} onChange={e => setHoraEntrada(e.target.value)} /></div>
          </div>

          <button className="btn btn-primary self-end" onClick={() => setStep(2)}>Proximo</button>
        </div>
      )}

      {step === 2 && (
        <div className="card flex flex-col gap-4">
          <h2 className="font-semibold" style={{ color: "var(--text)" }}>Checklist de Entrada</h2>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Marque os itens com avarias ou problemas na entrada</p>
          <div className="grid grid-cols-2 gap-2">
            {CHECKLIST_ITENS.map(item => (
              <label key={item} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg" style={{ background: checklist[item] ? "var(--danger-bg, #fee)" : undefined }}>
                <input type="checkbox" checked={checklist[item] ?? false}
                  onChange={e => setChecklist(p => ({ ...p, [item]: e.target.checked }))} />
                <span className="text-sm" style={{ color: checklist[item] ? "var(--danger)" : "var(--text-muted)" }}>{item}</span>
              </label>
            ))}
          </div>
          <div className="field">
            <label className="label">Observacoes gerais</label>
            <textarea className="input min-h-20 resize-none" value={obsChecklist} onChange={e => setObsChecklist(e.target.value)} placeholder="Estado geral do veiculo..." />
          </div>
          <div className="flex gap-3 justify-between">
            <button className="btn btn-secondary" onClick={() => setStep(1)}>Voltar</button>
            <button className="btn btn-primary" onClick={() => setStep(3)}>Proximo</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="card flex flex-col gap-4">
          <h2 className="font-semibold" style={{ color: "var(--text)" }}>Servicos</h2>
          {servicos.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>Nenhum servico cadastrado. Acesse /servicos para cadastrar.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {servicos.map(s => {
                const sel = itensOS.find(i => i.servicoId === s.id);
                return (
                  <button key={s.id} onClick={() => sel ? setItensOS(p => p.filter(i => i.servicoId !== s.id)) : adicionarServico(s)}
                    className="card text-left transition-colors"
                    style={{ borderColor: sel ? "var(--primary)" : undefined, borderWidth: sel ? 2 : 1 }}>
                    <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>{s.nome}</p>
                    <p className="text-xs mt-1" style={{ color: "var(--primary)" }}>R$ {s.preco_base.toFixed(2).replace(".", ",")}</p>
                  </button>
                );
              })}
            </div>
          )}
          {itensOS.length > 0 && (
            <div className="flex flex-col gap-2 mt-2">
              <h3 className="text-sm font-semibold" style={{ color: "var(--text)" }}>Servicos selecionados</h3>
              {itensOS.map((item, idx) => (
                <div key={item.servicoId} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: "var(--bg)" }}>
                  <span className="flex-1 text-sm" style={{ color: "var(--text)" }}>{item.nome}</span>
                  <input type="number" className="input w-28 text-right text-sm" value={item.preco}
                    onChange={e => setItensOS(p => p.map((i, j) => j === idx ? { ...i, preco: parseFloat(e.target.value) || 0 } : i))} />
                  <select className="input w-36 text-sm" value={item.funcionarioId}
                    onChange={e => setItensOS(p => p.map((i, j) => j === idx ? { ...i, funcionarioId: e.target.value } : i))}>
                    <option value="">Tecnico</option>
                    {funcionarios.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
                  </select>
                  <button onClick={() => setItensOS(p => p.filter((_, j) => j !== idx))} className="btn btn-icon btn-ghost" style={{ color: "var(--danger)" }}>X</button>
                </div>
              ))}
              <div className="flex justify-end pt-2">
                <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>Total: R$ {totalServicos.toFixed(2).replace(".", ",")}</span>
              </div>
            </div>
          )}
          <div className="field">
            <label className="label">Observacoes da OS</label>
            <textarea className="input min-h-16 resize-none" value={obs} onChange={e => setObs(e.target.value)} placeholder="Observacoes adicionais..." />
          </div>
          <div className="flex gap-3 justify-between">
            <button className="btn btn-secondary" onClick={() => setStep(2)}>Voltar</button>
            <button className="btn btn-primary" onClick={() => setStep(4)} disabled={itensOS.length === 0}>Proximo</button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="card flex flex-col gap-4">
          <h2 className="font-semibold" style={{ color: "var(--text)" }}>Pagamento</h2>
          <div className="field">
            <label className="label">Forma de Pagamento</label>
            <select className="input" value={formaPagamentoId} onChange={e => setFormaPagamentoId(e.target.value)}>
              <option value="">-- Selecione (opcional) --</option>
              {formas.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </select>
          </div>
          <div className="field">
            <label className="label">Desconto (R$)</label>
            <input className="input" type="number" value={desconto} onChange={e => setDesconto(e.target.value)} placeholder="0,00" min="0" />
          </div>
          <div className="card" style={{ background: "var(--bg)" }}>
            <div className="flex justify-between text-sm mb-2"><span style={{ color: "var(--text-muted)" }}>Subtotal</span><span style={{ color: "var(--text)" }}>R$ {totalServicos.toFixed(2).replace(".", ",")}</span></div>
            <div className="flex justify-between text-sm mb-3"><span style={{ color: "var(--text-muted)" }}>Desconto</span><span style={{ color: "var(--danger)" }}>- R$ {descontoNum.toFixed(2).replace(".", ",")}</span></div>
            <div className="flex justify-between font-bold"><span style={{ color: "var(--text)" }}>Total</span><span style={{ color: "var(--primary)" }}>R$ {valorFinal.toFixed(2).replace(".", ",")}</span></div>
          </div>
          <div className="flex gap-3 justify-between">
            <button className="btn btn-secondary" onClick={() => setStep(3)}>Voltar</button>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
              {loading ? "Abrindo OS..." : "Abrir OS"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
