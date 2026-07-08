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

const GATILHOS = [
  {
    key: "wpp_os_criada" as keyof Toggles,
    label: "OS Criada",
    desc: "Quando uma nova ordem de serviço é aberta",
    preview: (nome: string) => `Olá ${nome}! 🚗\n\nRecebemos seu veículo e abrimos uma OS para você.\nAcompanhe o andamento pelo nosso sistema.\n\n— Studio RPM`,
  },
  {
    key: "wpp_os_execucao" as keyof Toggles,
    label: "Em Execução",
    desc: "Quando o técnico inicia o serviço",
    preview: (nome: string) => `Olá ${nome}! 🔧\n\nSeu veículo já está com nosso técnico e o serviço começou!\n\n— Studio RPM`,
  },
  {
    key: "wpp_os_finalizada" as keyof Toggles,
    label: "OS Finalizada",
    desc: "Quando o serviço é concluído e pronto para retirada",
    preview: (nome: string) => `Olá ${nome}! ✨\n\nSeu veículo está *pronto* para retirada!\nPassando por aqui, pode vir buscar.\n\nObrigado pela preferência 🙏\n— Studio RPM`,
  },
  {
    key: "wpp_agendamento" as keyof Toggles,
    label: "Lembrete de Agendamento",
    desc: "1 dia antes do agendamento marcado na Agenda",
    preview: (nome: string) => `Olá ${nome}! 📅\n\nLembrando que seu veículo tem um agendamento *amanhã* conosco!\n\nQualquer dúvida, estamos à disposição.\n— Studio RPM`,
  },
  {
    key: "wpp_recap" as keyof Toggles,
    label: "Recap (Recaptura)",
    desc: "Antecipa o cliente antes do prazo de retorno do serviço vencer",
    preview: (nome: string) => `Olá ${nome}! 🚗✨\n\nTá chegando a hora de cuidar do seu veículo!\nAgende agora e garanta sua vaga.\n\n— Studio RPM`,
  },
];

export default function WhatsAppConfig() {
  const [status, setStatus] = useState<"loading"|"connected"|"disconnected"|"error">("loading");
  const [qrCode, setQrCode] = useState<string|null>(null);
  const [polling, setPolling] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const [testMsg, setTestMsg] = useState("Teste de conexão do Studio RPM! 🚗");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<string|null>(null);
  const [previewKey, setPreviewKey] = useState<string|null>(null);

  const [toggles, setToggles] = useState<Toggles>({
    wpp_os_criada: false,
    wpp_os_execucao: false,
    wpp_os_finalizada: true,
    wpp_agendamento: false,
    wpp_recap: false,
    wpp_recap_antecedencia_dias: 2,
  });
  const [savingToggles, setSavingToggles] = useState(false);
  const [savedToggles, setSavedToggles] = useState(false);

  const checkStatus = useCallback(async () => {
    try {
      const r = await fetch("/api/whatsapp?action=status");
      const d = await r.json();
      const state = d?.instance?.state ?? d?.state ?? "unknown";
      setStatus(state === "open" ? "connected" : "disconnected");
      return state === "open";
    } catch {
      setStatus("error");
      return false;
    }
  }, []);

  useEffect(() => {
    checkStatus();
    // Carregar toggles
    fetch("/api/configuracoes").then(r => r.json()).then(d => {
      if (d) setToggles({
        wpp_os_criada: d.wpp_os_criada ?? false,
        wpp_os_execucao: d.wpp_os_execucao ?? false,
        wpp_os_finalizada: d.wpp_os_finalizada ?? true,
        wpp_agendamento: d.wpp_agendamento ?? false,
        wpp_recap: d.wpp_recap ?? false,
        wpp_recap_antecedencia_dias: d.wpp_recap_antecedencia_dias ?? 2,
      });
    }).catch(() => {});
  }, [checkStatus]);

  async function conectar() {
    setQrCode(null);
    setPolling(true);
    try {
      const r = await fetch("/api/whatsapp?action=qrcode");
      const d = await r.json();
      if (d.base64) setQrCode(d.base64);
      // Polling a cada 4s
      const interval = setInterval(async () => {
        const connected = await checkStatus();
        if (connected) {
          clearInterval(interval);
          setQrCode(null);
          setPolling(false);
        }
      }, 4000);
      setTimeout(() => { clearInterval(interval); setPolling(false); }, 120000);
    } catch {
      setPolling(false);
      setStatus("error");
    }
  }

  async function enviarTeste() {
    setSending(true); setSendResult(null);
    try {
      const r = await fetch("/api/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telefone: testPhone, mensagem: testMsg }),
      });
      const d = await r.json();
      setSendResult(d.ok ? "Enviado!" : "Erro: " + (d.error ?? "falha"));
    } catch { setSendResult("Erro de conexao"); }
    setSending(false);
  }

  async function salvarToggles() {
    setSavingToggles(true);
    await fetch("/api/configuracoes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(toggles),
    });
    setSavingToggles(false); setSavedToggles(true);
    setTimeout(() => setSavedToggles(false), 2000);
  }

  const COR = { connected: "#16a34a", disconnected: "#d97706", error: "#dc2626", loading: "#6b7280" };
  const LABEL = { connected: "Conectado", disconnected: "Desconectado", error: "Erro", loading: "Verificando..." };

  return (
    <div className="flex flex-col gap-6">

      {/* Status card */}
      <div className="card flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div style={{ width:10, height:10, borderRadius:"50%", background: COR[status],
              boxShadow: status==="connected" ? `0 0 8px ${COR[status]}` : "none" }} />
            <div>
              <div className="font-semibold" style={{ color:"var(--text)" }}>WhatsApp Business</div>
              <div className="text-xs" style={{ color: COR[status] }}>{LABEL[status]}</div>
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
          <div className="flex flex-col items-center gap-3 p-4 rounded-xl" style={{ background:"var(--bg)", border:"1px solid var(--border)" }}>
            <p className="text-sm font-semibold" style={{ color:"var(--text)" }}>Escaneie com o WhatsApp</p>
            <img src={qrCode.startsWith("data:") ? qrCode : `data:image/png;base64,${qrCode}`}
              alt="QR Code" style={{ width:200, height:200, borderRadius:8 }} />
            <p className="text-xs text-center" style={{ color:"var(--text-muted)" }}>
              Abra o WhatsApp → Dispositivos Conectados → Conectar dispositivo
            </p>
          </div>
        )}

        {status === "connected" && (
          <div className="flex flex-col gap-3 pt-3" style={{ borderTop:"1px solid var(--border)" }}>
            <p className="text-xs font-semibold" style={{ color:"var(--text-muted)", textTransform:"uppercase" }}>Enviar mensagem de teste</p>
            <div className="flex gap-2">
              <input className="input flex-1" placeholder="55119..." value={testPhone}
                onChange={e => setTestPhone(e.target.value)} />
              <button onClick={enviarTeste} disabled={sending || !testPhone} className="btn btn-primary" style={{ fontSize:12 }}>
                {sending ? "..." : "Enviar"}
              </button>
            </div>
            <textarea className="input" rows={2} value={testMsg} onChange={e => setTestMsg(e.target.value)} />
            {sendResult && <p className="text-xs" style={{ color: sendResult.startsWith("Env") ? "#16a34a" : "#dc2626" }}>{sendResult}</p>}
          </div>
        )}
      </div>

      {/* Toggles de automacao */}
      <div className="card flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold" style={{ color:"var(--text)" }}>Automacoes de Mensagem</h2>
          <button onClick={salvarToggles} disabled={savingToggles} className="btn btn-primary" style={{ fontSize:12 }}>
            {savedToggles ? "Salvo!" : savingToggles ? "Salvando..." : "Salvar"}
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {GATILHOS.map(g => (
            <div key={g.key}>
              <div className="flex items-start justify-between gap-4 p-3 rounded-lg"
                style={{ background:"var(--bg)", border:"1px solid var(--border)" }}>
                <div className="flex flex-col gap-1 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold" style={{ color:"var(--text)" }}>{g.label}</span>
                    <button onClick={() => setPreviewKey(previewKey===g.key ? null : g.key)}
                      style={{ fontSize:10, color:"var(--text-muted)", background:"none", border:"none", cursor:"pointer", textDecoration:"underline" }}>
                      {previewKey===g.key ? "ocultar preview" : "ver preview"}
                    </button>
                  </div>
                  <span className="text-xs" style={{ color:"var(--text-muted)" }}>{g.desc}</span>
                  {g.key === "wpp_recap" && (toggles.wpp_recap as boolean) && (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs" style={{ color:"var(--text-muted)" }}>Antecipar</span>
                      <input type="number" min={1} max={14} value={toggles.wpp_recap_antecedencia_dias}
                        onChange={e => setToggles(t => ({ ...t, wpp_recap_antecedencia_dias: parseInt(e.target.value)||2 }))}
                        className="input" style={{ width:60, fontSize:13 }} />
                      <span className="text-xs" style={{ color:"var(--text-muted)" }}>dias antes do vencimento</span>
                    </div>
                  )}
                </div>
                <div>
                  <button
                    onClick={() => setToggles(t => ({ ...t, [g.key]: !t[g.key as keyof Toggles] }))}
                    style={{
                      width:44, height:24, borderRadius:12, border:"none", cursor:"pointer",
                      background: toggles[g.key as keyof Toggles] ? "var(--primary)" : "var(--border)",
                      position:"relative", transition:"background 0.2s",
                    }}>
                    <span style={{
                      position:"absolute", top:3, left: toggles[g.key as keyof Toggles] ? 23 : 3,
                      width:18, height:18, borderRadius:"50%", background:"#fff",
                      transition:"left 0.2s", display:"block",
                    }} />
                  </button>
                </div>
              </div>
              {previewKey === g.key && (
                <div className="mt-1 p-3 rounded-lg text-xs whitespace-pre-line"
                  style={{ background:"#1a2e1a", color:"#4ade80", fontFamily:"monospace", border:"1px solid #166534" }}>
                  {g.preview("[Nome do Cliente]")}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="p-3 rounded-lg text-xs" style={{ background:"rgba(217,119,6,0.08)", border:"1px solid rgba(217,119,6,0.2)", color:"#d97706" }}>
          As automacoes so disparam se o WhatsApp estiver conectado. O Recap roda diariamente as 8h.
        </div>
      </div>
    </div>
  );
}
