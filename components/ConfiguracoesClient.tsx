"use client";
import { useState } from "react";

export default function ConfiguracoesClient({ config: ini, formas: iniFormas, tenantId, role }: any) {
  const [config, setConfig] = useState(ini ?? {});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const set = (k: string, v: any) => setConfig((c: any) => ({ ...c, [k]: v }));

  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    await fetch("/api/configuracoes", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(config) });
    setSaved(true); setSaving(false); setTimeout(() => setSaved(false), 2000);
  }

  if (role !== "owner") return (
    <div className="card text-center py-12"><p style={{ color:"var(--text-muted)" }}>Apenas o owner pode acessar as configurações.</p></div>
  );

  return (
    <div className="max-w-xl flex flex-col gap-6">
      <h1 className="text-2xl font-bold" style={{ color:"var(--text)" }}>Configurações</h1>
      <form onSubmit={save} className="card flex flex-col gap-4">
        <h2 className="font-semibold" style={{ color:"var(--text)" }}>Dados da Estética</h2>
        <div className="field"><label className="label">Nome Fantasia</label><input className="input" value={config.nome_fantasia ?? ""} onChange={e => set("nome_fantasia", e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-4">
          <div className="field"><label className="label">Vagas por Dia</label><input className="input" type="number" min="1" max="20" value={config.vagas_dia ?? 5} onChange={e => set("vagas_dia", parseInt(e.target.value))} /></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="field"><label className="label">Horário Abertura</label><input className="input" type="time" value={config.horario_abertura ?? "08:00"} onChange={e => set("horario_abertura", e.target.value)} /></div>
          <div className="field"><label className="label">Horário Fechamento</label><input className="input" type="time" value={config.horario_fechamento ?? "18:00"} onChange={e => set("horario_fechamento", e.target.value)} /></div>
        </div>
        <button type="submit" className="btn btn-primary" disabled={saving}>{saved ? "✓ Salvo!" : saving ? "Salvando..." : "Salvar Configurações"}</button>
      </form>
    </div>
  );
}
