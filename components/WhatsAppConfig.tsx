"use client";
import { useState, useEffect, useCallback } from "react";

type Toggles = {
  wpp_os_criada: boolean;
  wpp_os_execucao: boolean;
  wpp_os_finalizada: boolean;
  wpp_agendamento: boolean;
  wpp_recap: boolean;
  wpp_recap_antecedencia_dias: number;
};

type Msgs = {
  wpp_msg_os_criada: string;
  wpp_msg_os_execucao: string;
  wpp_msg_os_finalizada: string;
  wpp_msg_agendamento: string;
  wpp_msg_recap: string;
};

const DEFAULTS: Msgs = {
  wpp_msg_os_criada:
    "Ola {nome}! Recebemos seu {modelo} e ja abrimos uma OS.\nAcompanhe o andamento pelo sistema.\n\n-- {nomeLoja}",
  wpp_msg_os_execucao:
    "Ola {nome}! Seu {modelo} ({placa}) ja esta com nosso tecnico e o servico comecou!\n\n-- {nomeLoja}",
  wpp_msg_os_finalizada:
    "Ola {nome}! Seu {modelo} ({placa}) esta *pronto* para retirada!\n\nObrigado pela preferencia!\n-- {nomeLoja}",
  wpp_msg_agendamento:
    "Ola {nome}! Lembrando que seu veiculo tem agendamento *amanha* conosco.\n\nAte la!\n-- {nomeLoja}",
  wpp_msg_recap:
    "Ola {nome}! Ta chegando a hora de cuidar do seu {modelo}.\nAgende agora e garanta sua vaga!\n\n-- {nomeLoja}",
};

const GATILHOS = [
  { key: "wpp_os_criada"     as const, msgKey: "wpp_msg_os_criada"     as const, label: "OS Criada",              desc: "Quando uma nova OS e aberta" },
  { key: "wpp_os_execucao"   as const, msgKey: "wpp_msg_os_execucao"   as const, label: "Em Execucao",            desc: "Quando o tecnico inicia o servico" },
  { key: "wpp_os_finalizada" as const, msgKey: "wpp_msg_os_finalizada" as const, label: "OS Finalizada",          desc: "Quando o servico e concluido" },
  { key: "wpp_agendamento"   as const, msgKey: "wpp_msg_agendamento"   as const, label: "Lembrete de Agendamento",desc: "1 dia antes do agendamento" },
  { key: "wpp_recap"         as const, msgKey: "wpp_msg_recap"         as const, label: "Recap (Recaptura)",      desc: "Antes do prazo de retorno vencer" },
];

const VARS = ["{nome}", "{modelo}", "{placa}", "{nomeLoja}"];

export default function WhatsAppConfig() {
  const [status, setStatus] = useState<"loading"|"connected"|"disconnected"|"error">("loading");
  const [qrCode, setQrCode] = useState<string|null>(null);
  const [polling, setPolling] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const [testMsg, setTestMsg] = useState("Teste de conexao do Studio RPM!");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<string|null>(null);
  const [openKey, setOpenKey] = useState<string|null>(null);

  const [toggles, setToggles] = useState<Toggles>({
    wpp_os_criada: false, wpp_os_execucao: false, wpp_os_finalizada: true,
    wpp_agendamento: false, wpp_recap: false, wpp_recap_antecedencia_dias: 2,
  });
  const [msgs, setMsgs] = useState<Msgs>({ ...DEFAULTS });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const checkStatus = useCallback(async () => {
    try {
      const r = await fetch("/api/whatsapp?action=status");
      const d = await r.json();
      const state = d?.instance?.state ?? d?.state ?? "unknown";
      setStatus(state === "open" ? "connected" : "disconnected");
      return state === "open";
    } catch { setStatus("error"); return false; }
  }, []);

  useEffect(() => {
    checkStatus();
    fetch("/api/configuracoes").then(r => r.json()).then(d => {
      if (!d) return;
      setToggles({
        wpp_os_criada: d.wpp_os_criada ?? false,
        wpp_os_execucao: d.wpp_os_execucao ?? false,
        wpp_os_finalizada: d.wpp_os_finalizada ?? true,
        wpp_agendamento: d.wpp_agendamento ?? false,
        wpp_recap: d.wpp_recap ?? false,
        wpp_recap_antecedencia_dias: d.wpp_recap_antecedencia_dias ?? 2,
      });
      setMsgs({
        wpp_msg_os_criada:     d.wpp_msg_os_criada     || DEFAULTS.wpp_msg_os_criada,
        wpp_msg_os_execucao:   d.wpp_msg_os_execucao   || DEFAULTS.wpp_msg_os_execucao,
        wpp_msg_os_finalizada: d.wpp_msg_os_finalizada  || DEFAULTS.wpp_msg_os_finalizada,
        wpp_msg_agendamento:   d.wpp_msg_agendamento    || DEFAULTS.wpp_msg_agendamento,
        wpp_msg_recap:         d.wpp_msg_recap          || DEFAULTS.wpp_msg_recap,
      });
    }).catch(() => {});
  }, [checkStatus]);

  async function conectar() {
    setQrCode(null); setPolling(true);
    try {
      const r = await fetch("/api/whatsapp?action=qrcode");
      const d = await r.json();
      if (d.base64) {
        setQrCode(d.base64);
      } else {
        setQrCode("debug:" + JSON.stringify(d).slice(0, 300));
      }
      const interval = setInterval(async () => {
        const ok = await checkStatus();
        if (ok) { clearInterval(interval); setQrCode(null); setPolling(false); }
      }, 4000);
      setTimeout(() => { clearInterval(interval); setPolling(false); }, 120000);
    } catch { setPolling(false); setStatus("error"); }
  }

  async function enviarTeste() {
    setSending(true); setSendResult(null);
    try {
      const r = await fetch("/api/whatsapp", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telefone: testPhone, mensagem: testMsg }),
      });
      const d = await r.json();
      setSendResult(d.ok ? "Mensagem enviada!" : "Erro: " + (d.error ?? "falha"));
    } catch { setSendResult("Erro de conexao"); }
    setSending(false);
  }

  async function salvar() {
    setSaving(true);
    await fetch("/api/configuracoes", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...toggles, ...msgs }),
    });
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  const COR   = { connected:"#16a34a", disconnected:"#d97706", error:"#dc2626", loading:"#6b7280" };
  const LABEL = { connected:"Conectado", disconnected:"Desconectado", error:"Erro de conexao", loading:"Verificando..." };

  return (
    <div className="flex flex-col gap-6">

      {/* Status / QR */}
      <div className="card flex flex-col gap-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div style={{ width:10, height:10, borderRadius:"50%", background:COR[status],
              boxShadow: status==="connected" ? ("0 0 8px " + COR[status]) : "none" }} />
            <div>
              <div className="font-semibold" style={{ color:"var(--text)", fontSize:15 }}>WhatsApp Business</div>
              <div className="text-xs font-bold" style={{ color:COR[status] }}>{LABEL[status]}</div>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={checkStatus} className="btn btn-secondary" style={{ fontSize:12 }}>Atualizar</button>
            {status !== "connected" && (
              <button onClick={conectar} disabled={polling} className="btn btn-primary" style={{ fontSize:12 }}>
                {polling ? "Aguardando QR..." : "Conectar WhatsApp"}
              </button>
            )}
          </div>
        </div>

        {qrCode && (
          <div className="flex flex-col items-center gap-3 p-4 rounded-xl"
            style={{ background:"var(--bg)", border:"1px solid var(--border)" }}>
            <p className="text-sm font-semibold" style={{ color:"var(--text)" }}>Escaneie com o WhatsApp</p>
            {qrCode.startsWith("debug:") ? (
              <div className="text-xs p-3 rounded w-full"
                style={{ background:"#1a1a2e", color:"#ff6b6b", fontFamily:"monospace", wordBreak:"break-all" }}>
                <strong>Resposta bruta da API:</strong><br/>{qrCode.replace("debug:", "")}
              </div>
            ) : (
              <img src={qrCode.startsWith("data:") ? qrCode : ("data:image/png;base64," + qrCode)}
                alt="QR Code" style={{ width:220, height:220, borderRadius:8 }} />
            )}
            <p className="text-xs text-center" style={{ color:"var(--text-muted)" }}>
              WhatsApp &rarr; Menu &rarr; Dispositivos conectados &rarr; Conectar dispositivo
            </p>
          </div>
        )}

        {status === "connected" && (
          <div className="flex flex-col gap-2 pt-3" style={{ borderTop:"1px solid var(--border)" }}>
            <p className="text-xs font-semibold" style={{ color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.05em" }}>
              Enviar mensagem de teste
            </p>
            <input className="input" placeholder="5541999999999" value={testPhone}
              onChange={e => setTestPhone(e.target.value)} />
            <textarea className="input" rows={2} value={testMsg} onChange={e => setTestMsg(e.target.value)} />
            <div className="flex items-center justify-between">
              <button onClick={enviarTeste} disabled={sending || !testPhone} className="btn btn-primary" style={{ fontSize:12 }}>
                {sending ? "Enviando..." : "Enviar teste"}
              </button>
              {sendResult && (
                <p className="text-xs" style={{ color: sendResult.startsWith("Mensagem") ? "#16a34a" : "#dc2626" }}>{sendResult}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Automacoes */}
      <div className="card flex flex-col gap-2">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-semibold" style={{ color:"var(--text)" }}>Automacoes de Mensagem</h2>
            <p className="text-xs mt-0.5" style={{ color:"var(--text-muted)" }}>
              Ative e edite o texto de cada disparador
            </p>
          </div>
          <button onClick={salvar} disabled={saving} className="btn btn-primary" style={{ fontSize:12 }}>
            {saved ? "Salvo!" : saving ? "Salvando..." : "Salvar tudo"}
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {GATILHOS.map(g => {
            const ativo = toggles[g.key];
            const aberto = openKey === g.key;
            return (
              <div key={g.key} className="rounded-xl overflow-hidden"
                style={{ border:"1px solid var(--border)", background:"var(--bg)" }}>

                <div className="flex items-center gap-3 px-4 py-3">
                  {/* Toggle switch */}
                  <button
                    onClick={() => setToggles(t => ({ ...t, [g.key]: !t[g.key] }))}
                    style={{
                      width:42, height:24, borderRadius:12, border:"none", cursor:"pointer", flexShrink:0,
                      background: ativo ? "var(--primary)" : "var(--border)", position:"relative", transition:"background 0.2s",
                    }}>
                    <span style={{
                      position:"absolute", top:3, left: ativo ? 21 : 3,
                      width:18, height:18, borderRadius:"50%", background:"#fff",
                      transition:"left 0.2s", display:"block",
                    }} />
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold" style={{ color:"var(--text)" }}>{g.label}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                        style={{ background: ativo ? "rgba(22,163,74,0.12)" : "var(--surface)", color: ativo ? "#16a34a" : "var(--text-muted)" }}>
                        {ativo ? "ativo" : "inativo"}
                      </span>
                    </div>
                    <p className="text-xs" style={{ color:"var(--text-muted)" }}>{g.desc}</p>
                  </div>

                  <button
                    onClick={() => setOpenKey(aberto ? null : g.key)}
                    style={{ fontSize:11, color:"var(--primary)", background:"none",
                      border:"1px solid var(--border)", borderRadius:6, padding:"4px 10px",
                      cursor:"pointer", flexShrink:0, fontWeight:600 }}>
                    {aberto ? "Fechar" : "Editar texto"}
                  </button>
                </div>

                {/* Editor de mensagem */}
                {aberto && (
                  <div className="px-4 pb-4 flex flex-col gap-2" style={{ borderTop:"1px solid var(--border)" }}>
                    <div className="flex items-center justify-between pt-3 pb-1">
                      <p className="text-xs font-semibold" style={{ color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.05em" }}>
                        Texto da mensagem
                      </p>
                      <button
                        onClick={() => setMsgs(m => ({ ...m, [g.msgKey]: DEFAULTS[g.msgKey] }))}
                        style={{ fontSize:10, color:"var(--text-muted)", background:"none", border:"none", cursor:"pointer", textDecoration:"underline" }}>
                        Restaurar padrao
                      </button>
                    </div>

                    <textarea
                      rows={5}
                      className="input"
                      style={{ fontFamily:"monospace", fontSize:13, lineHeight:1.7, resize:"vertical" }}
                      value={msgs[g.msgKey]}
                      onChange={e => setMsgs(m => ({ ...m, [g.msgKey]: e.target.value }))}
                    />

                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs" style={{ color:"var(--text-muted)" }}>Inserir variavel:</span>
                      {VARS.map(v => (
                        <button key={v}
                          onClick={() => setMsgs(m => ({ ...m, [g.msgKey]: m[g.msgKey] + v }))}
                          style={{ fontSize:11, fontFamily:"monospace", padding:"2px 8px", borderRadius:4,
                            background:"var(--surface)", border:"1px solid var(--border)", color:"var(--primary)", cursor:"pointer" }}>
                          {v}
                        </button>
                      ))}
                    </div>

                    {/* Preview ao vivo */}
                    <div className="p-3 rounded-lg text-xs whitespace-pre-line"
                      style={{ background:"#1a2e1a", color:"#4ade80", fontFamily:"monospace", border:"1px solid #166534", lineHeight:1.7 }}>
                      {msgs[g.msgKey]
                        .replace(/\{nome\}/g, "Maria Silva")
                        .replace(/\{modelo\}/g, "Civic Preto")
                        .replace(/\{placa\}/g, "ABC-1234")
                        .replace(/\{nomeLoja\}/g, "Studio RPM")}
                    </div>
                  </div>
                )}

                {/* Campo antecedencia do recap */}
                {g.key === "wpp_recap" && ativo && !aberto && (
                  <div className="flex items-center gap-2 px-4 pb-3 pt-2" style={{ borderTop:"1px solid var(--border)" }}>
                    <span className="text-xs" style={{ color:"var(--text-muted)" }}>Enviar</span>
                    <input type="number" min={1} max={14} value={toggles.wpp_recap_antecedencia_dias}
                      onChange={e => setToggles(t => ({ ...t, wpp_recap_antecedencia_dias: parseInt(e.target.value)||2 }))}
                      className="input" style={{ width:56, fontSize:13 }} />
                    <span className="text-xs" style={{ color:"var(--text-muted)" }}>dias antes do vencimento</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-2 p-3 rounded-lg text-xs"
          style={{ background:"rgba(217,119,6,0.08)", border:"1px solid rgba(217,119,6,0.2)", color:"#d97706" }}>
          As automacoes so disparam se o WhatsApp estiver conectado. O Recap e processado diariamente as 8h (Brasilia).
        </div>
      </div>
    </div>
  );
}
