"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import WhatsAppConfig from "@/components/WhatsAppConfig";

const CORES = [
  { label: "Crimson (padrão)", hex: "#C41E3A" },
  { label: "Laranja esportivo", hex: "#E05C00" },
  { label: "Azul petróleo",     hex: "#0D4F6C" },
  { label: "Azul royal",        hex: "#1A3FA0" },
  { label: "Verde escuro",      hex: "#1A5C2A" },
  { label: "Roxo",              hex: "#5B2D8E" },
  { label: "Cinza chumbo",      hex: "#3D4044" },
  { label: "Preto fosco",       hex: "#1a1a1a" },
  { label: "Dourado",           hex: "#B8860B" },
  { label: "Teal",              hex: "#006666" },
  { label: "Bordo",             hex: "#7B1C1C" },
  { label: "Azul neon",         hex: "#0066CC" },
  { label: "Rosa choque",       hex: "#C2185B" },
  { label: "Lima",              hex: "#4A7C00" },
  { label: "Cobre",             hex: "#9C4A1A" },
  { label: "Indigo",            hex: "#3730A3" },
  { label: "Ciano",             hex: "#007B8A" },
  { label: "Granada",           hex: "#8B0000" },
  { label: "Mostarda",          hex: "#B07D00" },
  { label: "Magenta",           hex: "#A0006C" },
  { label: "Marinho",           hex: "#0A1F44" },
  { label: "Verde militar",     hex: "#3B5323" },
  { label: "Carmim",            hex: "#960018" },
  { label: "Turquesa",          hex: "#005F6A" },
  { label: "Bronze",            hex: "#8C5A2B" },
  { label: "Azul cobalto",      hex: "#0047AB" },
  { label: "Vinho",             hex: "#722F37" },
  { label: "Grafite",           hex: "#2C2C2E" },
  { label: "Ambar",             hex: "#B45309" },
  { label: "Esmeralda",         hex: "#065F46" },
];

export default function ConfiguracoesClient({ config: ini, formas: iniFormas, tenantId, role }: any) {
  const [config, setConfig] = useState(ini ?? {});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [corSelecionada, setCorSelecionada] = useState(ini?.cor_primaria ?? "#C41E3A");
  const [corCustom, setCorCustom] = useState(ini?.cor_primaria ?? "#C41E3A");
  const [savingCor, setSavingCor] = useState(false);
  const [savedCor, setSavedCor] = useState(false);
  const searchParams = useSearchParams();
  const [aba, setAba] = useState<"config"|"whatsapp">(
    searchParams.get("aba") === "whatsapp" ? "whatsapp" : "config"
  );

  const set = (k: string, v: any) => setConfig((c: any) => ({ ...c, [k]: v }));

  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    await fetch("/api/configuracoes", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(config) });
    setSaved(true); setSaving(false); setTimeout(() => setSaved(false), 2500);
  }

  async function salvarCor() {
    setSavingCor(true);
    await fetch("/api/configuracoes", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cor_primaria: corSelecionada }),
    });
    document.documentElement.style.setProperty("--primary", corSelecionada);
    setSavingCor(false); setSavedCor(true);
    setTimeout(() => { setSavedCor(false); setShowColorPicker(false); }, 1500);
  }

  if (role !== "owner") return (
    <div className="card text-center py-12"><p style={{ color:"var(--text-muted)" }}>Apenas o owner pode acessar as configuracoes.</p></div>
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-2" style={{ borderBottom:"1px solid var(--border)", paddingBottom:0 }}>
        {([["config","Configuracoes"],["whatsapp","WhatsApp"]] as const).map(([key,label])=>(
          <button key={key} onClick={()=>setAba(key)}
            style={{ padding:"10px 20px", fontSize:13, fontWeight:600, border:"none", cursor:"pointer", borderBottom: aba===key ? "2px solid var(--primary)" : "2px solid transparent", color: aba===key ? "var(--primary)" : "var(--text-muted)", background:"none" }}>
            {label}
          </button>
        ))}
      </div>

      {aba === "whatsapp" && <WhatsAppConfig />}
      {aba === "config" && (
        <div className="max-w-xl flex flex-col gap-6">
          <h1 className="text-2xl font-bold" style={{ color:"var(--text)" }}>Configuracoes</h1>

          <form onSubmit={save} className="card flex flex-col gap-4">
            <h2 className="font-semibold" style={{ color:"var(--text)" }}>Dados da Estetica</h2>
            <div className="field">
              <label className="label">Nome Fantasia</label>
              <input className="input" value={config.nome_fantasia ?? ""} onChange={e => set("nome_fantasia", e.target.value)} />
            </div>
            <div className="field">
              <label className="label">Logo da Empresa (URL da imagem)</label>
              <input className="input" value={config.logo_url ?? ""} onChange={e => set("logo_url", e.target.value)} placeholder="https://..." />
              {config.logo_url && (
                <img src={config.logo_url} alt="Preview" style={{ height:56, marginTop:8, borderRadius:8, objectFit:"contain", border:"1px solid var(--border)", padding:4 }} />
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="field">
                <label className="label">WhatsApp</label>
                <input className="input" value={config.whatsapp ?? ""} onChange={e => set("whatsapp", e.target.value)} placeholder="(41) 99999-0000" />
              </div>
              <div className="field">
                <label className="label">Instagram</label>
                <input className="input" value={config.instagram ?? ""} onChange={e => set("instagram", e.target.value)} placeholder="@studio.rpm" />
              </div>
              <div className="field">
                <label className="label">Cidade</label>
                <input className="input" value={config.cidade ?? ""} onChange={e => set("cidade", e.target.value)} placeholder="Curitiba, PR" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="field">
                <label className="label">Vagas por Dia</label>
                <input className="input" type="number" min="1" max="20" value={config.vagas_dia ?? 5} onChange={e => set("vagas_dia", parseInt(e.target.value))} />
              </div>
              <div className="field">
                <label className="label">Webhook n8n / WhatsApp</label>
                <input className="input" value={config.webhook_n8n ?? ""} onChange={e => set("webhook_n8n", e.target.value)} placeholder="https://..." />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="field">
                <label className="label">Horario Abertura</label>
                <input className="input" type="time" value={config.horario_abertura ?? "08:00"} onChange={e => set("horario_abertura", e.target.value)} />
              </div>
              <div className="field">
                <label className="label">Horario Fechamento</label>
                <input className="input" type="time" value={config.horario_fechamento ?? "18:00"} onChange={e => set("horario_fechamento", e.target.value)} />
              </div>
            </div>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saved ? "Salvo!" : saving ? "Salvando..." : "Salvar Configuracoes"}
            </button>
          </form>

          <div className="card flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold" style={{ color:"var(--text)" }}>Cor da Marca</h2>
                <p className="text-xs mt-1" style={{ color:"var(--text-muted)" }}>Aplica em botoes, badges e destaques do sistema</p>
              </div>
              <div className="flex items-center gap-3">
                <div style={{ width:32, height:32, borderRadius:8, background:corSelecionada, border:"2px solid var(--border)", flexShrink:0 }} />
                <button onClick={() => setShowColorPicker(!showColorPicker)} className="btn btn-secondary" style={{ fontSize:13 }}>
                  {showColorPicker ? "Fechar" : "Personalizar cores"}
                </button>
              </div>
            </div>

            {showColorPicker && (
              <div className="flex flex-col gap-4 pt-2" style={{ borderTop:"1px solid var(--border)" }}>
                <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background:"var(--bg)" }}>
                  <div style={{ width:40, height:40, borderRadius:10, background:corSelecionada, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, fontSize:18, color:"#fff" }}>R</div>
                  <div>
                    <div className="text-sm font-semibold" style={{ color:"var(--text)" }}>Studio RPM</div>
                    <div className="text-xs" style={{ color:corSelecionada }}>Cor selecionada: {corSelecionada}</div>
                  </div>
                  <button className="btn btn-sm ml-auto" style={{ background:corSelecionada, color:"#fff", border:"none", fontSize:12 }}>Exemplo</button>
                </div>

                <div>
                  <p className="text-xs font-semibold mb-2" style={{ color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.05em" }}>Cores prontas</p>
                  <div className="flex flex-wrap gap-2">
                    {CORES.map(c => (
                      <button key={c.hex} type="button" title={c.label}
                        onClick={() => { setCorSelecionada(c.hex); setCorCustom(c.hex); }}
                        style={{ width:30, height:30, borderRadius:"50%", background:c.hex, cursor:"pointer", border:"none", outline: corSelecionada===c.hex ? "3px solid var(--text)" : "2px solid transparent", outlineOffset:2, transform: corSelecionada===c.hex ? "scale(1.2)" : "scale(1)", transition:"all 0.15s" }}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-xs font-semibold mb-1" style={{ color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.05em" }}>Cor personalizada</p>
                    <div className="flex items-center gap-2">
                      <input type="color" value={corCustom}
                        onChange={e => { setCorCustom(e.target.value); setCorSelecionada(e.target.value); }}
                        style={{ width:40, height:36, borderRadius:6, border:"1px solid var(--border)", cursor:"pointer", padding:2, background:"var(--bg-input)" }}
                      />
                      <input className="input" value={corCustom}
                        onChange={e => { setCorCustom(e.target.value); if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) setCorSelecionada(e.target.value); }}
                        placeholder="#C41E3A" style={{ width:110, fontFamily:"monospace" }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowColorPicker(false)}>Cancelar</button>
                  <button type="button" className="btn btn-primary" disabled={savingCor} onClick={salvarCor}
                    style={{ background:corSelecionada, borderColor:corSelecionada }}>
                    {savedCor ? "Cor aplicada!" : savingCor ? "Salvando..." : "Aplicar cor"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
