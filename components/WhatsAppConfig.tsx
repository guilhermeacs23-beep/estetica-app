"use client";
import { useState, useEffect, useRef } from "react";

type Status = "open" | "close" | "connecting" | "loading" | "offline";

export default function WhatsAppConfig() {
  const [status, setStatus] = useState<Status>("loading");
  const [qr, setQr] = useState<string | null>(null);
  const [loadingQr, setLoadingQr] = useState(false);
  const [testTel, setTestTel] = useState("");
  const [testMsg, setTestMsg] = useState("Olá! Mensagem de teste do Studio RPM 🚗");
  const [sending, setSending] = useState(false);
  const [log, setLog] = useState<string | null>(null);
  const poolRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function checkStatus() {
    try {
      const res = await fetch("/api/whatsapp?action=status");
      const data = await res.json();
      const state: Status = data?.instance?.state ?? data?.state ?? "offline";
      setStatus(state === "open" ? "open" : state === "close" ? "close" : "connecting");
      if (state === "open") {
        setQr(null);
        if (poolRef.current) clearInterval(poolRef.current);
      }
    } catch {
      setStatus("offline");
    }
  }

  useEffect(() => {
    checkStatus();
  }, []);

  async function conectar() {
    setLoadingQr(true);
    setQr(null);
    try {
      const res = await fetch("/api/whatsapp?action=qrcode");
      const data = await res.json();
      const base64 = data?.base64 ?? data?.qrcode?.base64 ?? null;
      setQr(base64);
      setStatus("connecting");
      // Polling a cada 4s para detectar quando conectar
      if (poolRef.current) clearInterval(poolRef.current);
      poolRef.current = setInterval(checkStatus, 4000);
    } catch {
      setLog("Erro ao buscar QR Code. Verifique a URL da Evolution API.");
    }
    setLoadingQr(false);
  }

  async function desconectar() {
    await fetch("/api/whatsapp?action=status"); // placeholder
    setStatus("close");
    setQr(null);
    setLog("Desconectado.");
  }

  async function enviarTeste() {
    if (!testTel) return alert("Informe o telefone");
    setSending(true);
    const res = await fetch("/api/whatsapp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ telefone: testTel, mensagem: testMsg }),
    });
    const data = await res.json();
    setLog(data.error ? `Erro: ${data.error}` : "✓ Mensagem enviada com sucesso!");
    setSending(false);
  }

  const statusInfo = {
    open:       { label: "Conectado",    color: "#22c55e", bg: "#dcfce7", dot: "#16a34a" },
    close:      { label: "Desconectado", color: "#ef4444", bg: "#fee2e2", dot: "#dc2626" },
    connecting: { label: "Conectando…",  color: "#f59e0b", bg: "#fef3c7", dot: "#d97706" },
    loading:    { label: "Verificando…", color: "#6b7280", bg: "#f3f4f6", dot: "#9ca3af" },
    offline:    { label: "API Offline",  color: "#dc2626", bg: "#fee2e2", dot: "#dc2626" },
  }[status];

  return (
    <div className="flex flex-col gap-6">

      {/* Status */}
      <div className="card flex items-center justify-between flex-wrap gap-4" style={{ padding:"20px 24px" }}>
        <div className="flex items-center gap-3">
          <div style={{ width:12, height:12, borderRadius:"50%", background:statusInfo.dot,
            boxShadow: status==="open" ? `0 0 8px ${statusInfo.dot}` : "none",
            animation: status==="connecting" ? "pulse 1.2s infinite" : "none" }} />
          <div>
            <p className="font-semibold" style={{ color:"var(--text)", fontSize:15 }}>WhatsApp</p>
            <p style={{ fontSize:12, color:statusInfo.color, fontWeight:700 }}>{statusInfo.label}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary btn-sm" onClick={checkStatus}>↺ Atualizar</button>
          {status !== "open"
            ? <button className="btn btn-primary" disabled={loadingQr} onClick={conectar}>
                {loadingQr ? "Gerando QR..." : "Conectar WhatsApp"}
              </button>
            : <button className="btn btn-secondary" onClick={desconectar}>Desconectar</button>
          }
        </div>
      </div>

      {/* QR Code */}
      {(qr || loadingQr) && status !== "open" && (
        <div className="card flex flex-col items-center gap-4" style={{ padding:"32px" }}>
          <h3 className="font-semibold" style={{ color:"var(--text)" }}>Escaneie com o WhatsApp</h3>
          <p style={{ fontSize:13, color:"var(--text-muted)", textAlign:"center" }}>
            Abra o WhatsApp → Dispositivos conectados → Conectar dispositivo
          </p>
          {loadingQr
            ? <div style={{ width:240, height:240, background:"var(--surface)", borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <p style={{ color:"var(--text-muted)", fontSize:13 }}>Gerando QR Code…</p>
              </div>
            : qr && <img src={qr} alt="QR Code WhatsApp" style={{ width:240, height:240, borderRadius:8, border:"4px solid var(--border)" }} />
          }
          <p style={{ fontSize:11, color:"var(--text-muted)" }}>O QR Code expira em 30 segundos. Clique em "Conectar" para gerar um novo.</p>
        </div>
      )}

      {/* Conectado */}
      {status === "open" && (
        <div className="card" style={{ padding:"20px 24px", borderLeft:"4px solid #22c55e" }}>
          <p style={{ color:"var(--text)", fontWeight:600 }}>✓ WhatsApp conectado e pronto para envios automáticos</p>
          <p style={{ fontSize:13, color:"var(--text-muted)", marginTop:4 }}>
            Disparos ativos: OS finalizada · Recap de Clientes
          </p>
        </div>
      )}

      {/* Teste de envio */}
      {status === "open" && (
        <div className="card flex flex-col gap-4" style={{ padding:"20px 24px" }}>
          <h3 className="font-semibold" style={{ color:"var(--text)" }}>Testar envio</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="field">
              <label className="label">Telefone (com DDD)</label>
              <input className="input" placeholder="41999999999" value={testTel} onChange={e=>setTestTel(e.target.value)} />
            </div>
            <div className="field col-span-2">
              <label className="label">Mensagem</label>
              <textarea className="input" rows={2} value={testMsg} onChange={e=>setTestMsg(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end">
            <button className="btn btn-primary" disabled={sending} onClick={enviarTeste}>
              {sending ? "Enviando…" : "💬 Enviar teste"}
            </button>
          </div>
          {log && <p style={{ fontSize:13, color: log.startsWith("✓") ? "#16a34a" : "#dc2626" }}>{log}</p>}
        </div>
      )}

      {/* Config */}
      <div className="card flex flex-col gap-2" style={{ padding:"16px 24px" }}>
        <p style={{ fontSize:12, fontWeight:700, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.05em" }}>Configuração Evolution API</p>
        <p style={{ fontSize:13, color:"var(--text-muted)" }}>
          Variáveis necessárias no Vercel:
        </p>
        <div style={{ background:"var(--surface)", borderRadius:6, padding:"12px 16px", fontFamily:"monospace", fontSize:12, color:"var(--text)", lineHeight:1.8 }}>
          EVOLUTION_API_URL = https://seu-app.railway.app<br/>
          EVOLUTION_API_KEY = sua-chave-secreta<br/>
          EVOLUTION_INSTANCE = studiorpm
        </div>
        <p style={{ fontSize:11, color:"var(--text-muted)" }}>
          Após adicionar no Vercel → Settings → Environment Variables, faça um novo deploy.
        </p>
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>
    </div>
  );
}
