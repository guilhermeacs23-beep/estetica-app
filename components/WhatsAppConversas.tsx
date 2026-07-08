"use client";
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

type Msg = {
  id: string; numero: string; nome_contato: string | null;
  mensagem: string; tipo: "enviada" | "recebida"; lida: boolean; timestamp: string;
};
type Conv = { numero: string; nome: string; ultimaMensagem: string; timestamp: string; naoLidas: number; };

export default function WhatsAppConversas() {
  const [conversas, setConversas] = useState<Conv[]>([]);
  const [sel, setSel] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function carregarConversas() {
    const r = await fetch("/api/whatsapp/inbox");
    const d = await r.json();
    if (d.conversas) setConversas(d.conversas);
    setLoading(false);
  }

  async function abrirConversa(numero: string) {
    setSel(numero);
    const r = await fetch("/api/whatsapp/inbox?numero=" + encodeURIComponent(numero));
    const d = await r.json();
    if (d.mensagens) setMsgs(d.mensagens);
    await fetch("/api/whatsapp/inbox", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ numero }) });
    setConversas(c => c.map(cv => cv.numero === numero ? { ...cv, naoLidas: 0 } : cv));
  }

  async function enviar() {
    if (!sel || !texto.trim()) return;
    setEnviando(true);
    await fetch("/api/whatsapp", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ telefone: sel, mensagem: texto }),
    });
    // Inserir localmente enquanto webhook nao retorna
    const nova: Msg = { id: Date.now().toString(), numero: sel, nome_contato: null,
      mensagem: texto, tipo: "enviada", lida: true, timestamp: new Date().toISOString() };
    setMsgs(m => [...m, nova]);
    setConversas(c => c.map(cv => cv.numero === sel ? { ...cv, ultimaMensagem: texto, timestamp: nova.timestamp } : cv));
    setTexto("");
    setEnviando(false);
  }

  useEffect(() => {
    carregarConversas();
    const supabase = createClient();
    const channel = supabase
      .channel("wpp_inbox_rt")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "whatsapp_inbox" }, (payload) => {
        const nova = payload.new as Msg;
        setConversas(prev => {
          const arr = prev.filter(c => c.numero !== nova.numero);
          const exist = prev.find(c => c.numero === nova.numero);
          return [{
            numero: nova.numero,
            nome: nova.nome_contato || nova.numero,
            ultimaMensagem: nova.mensagem,
            timestamp: nova.timestamp,
            naoLidas: nova.tipo === "recebida" ? (exist ? exist.naoLidas + 1 : 1) : (exist?.naoLidas ?? 0),
          }, ...arr];
        });
        setSel(current => {
          if (current === nova.numero) {
            setMsgs(m => [...m, nova]);
          }
          return current;
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const convSel = conversas.find(c => c.numero === sel);

  return (
    <div style={{ display:"flex", height:580, border:"1px solid var(--border)", borderRadius:12, overflow:"hidden" }}>
      {/* Lista */}
      <div style={{ width:260, borderRight:"1px solid var(--border)", display:"flex", flexDirection:"column", background:"var(--bg)" }}>
        <div style={{ padding:"10px 14px", borderBottom:"1px solid var(--border)", background:"var(--surface)" }}>
          <p style={{ fontSize:12, fontWeight:700, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.05em" }}>Conversas</p>
        </div>
        <div style={{ flex:1, overflowY:"auto" }}>
          {loading && <p style={{ padding:16, fontSize:13, color:"var(--text-muted)" }}>Carregando...</p>}
          {!loading && conversas.length === 0 && (
            <div style={{ padding:24, textAlign:"center" }}>
              <p style={{ fontSize:24, marginBottom:8 }}>💬</p>
              <p style={{ fontSize:13, color:"var(--text-muted)" }}>Nenhuma conversa ainda</p>
              <p style={{ fontSize:11, color:"var(--text-muted)", marginTop:4 }}>Mensagens recebidas aparecem aqui</p>
            </div>
          )}
          {conversas.map(c => (
            <div key={c.numero} onClick={() => abrirConversa(c.numero)}
              style={{ padding:"10px 14px", cursor:"pointer", borderBottom:"1px solid var(--border)",
                background: sel === c.numero ? "rgba(0,0,0,0.04)" : "transparent",
                borderLeft: sel === c.numero ? "3px solid var(--primary)" : "3px solid transparent" }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ width:36, height:36, borderRadius:"50%", background:"var(--surface)", flexShrink:0,
                  display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, fontWeight:700,
                  color:"var(--primary)", border:"1px solid var(--border)" }}>
                  {(c.nome || c.numero)[0]?.toUpperCase()}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <span style={{ fontSize:13, fontWeight:600, color:"var(--text)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      {c.nome}
                    </span>
                    {c.naoLidas > 0 && (
                      <span style={{ background:"var(--primary)", color:"#fff", borderRadius:"50%",
                        width:18, height:18, fontSize:10, display:"flex", alignItems:"center",
                        justifyContent:"center", fontWeight:700, flexShrink:0 }}>
                        {c.naoLidas}
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize:11, color:"var(--text-muted)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", marginTop:1 }}>
                    {c.ultimaMensagem}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Thread */}
      {sel ? (
        <div style={{ flex:1, display:"flex", flexDirection:"column" }}>
          <div style={{ padding:"10px 16px", borderBottom:"1px solid var(--border)", background:"var(--surface)", display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:32, height:32, borderRadius:"50%", background:"var(--bg)",
              display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:700,
              color:"var(--primary)", border:"1px solid var(--border)" }}>
              {(convSel?.nome || sel)[0]?.toUpperCase()}
            </div>
            <div>
              <p style={{ fontSize:13, fontWeight:700, color:"var(--text)" }}>{convSel?.nome || sel}</p>
              <p style={{ fontSize:11, color:"var(--text-muted)" }}>{sel}</p>
            </div>
          </div>

          <div style={{ flex:1, overflowY:"auto", padding:16, display:"flex", flexDirection:"column", gap:8, background:"var(--bg)" }}>
            {msgs.map(m => (
              <div key={m.id} style={{ display:"flex", justifyContent: m.tipo === "enviada" ? "flex-end" : "flex-start" }}>
                <div style={{
                  maxWidth:"72%", padding:"8px 12px",
                  borderRadius: m.tipo === "enviada" ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                  background: m.tipo === "enviada" ? "var(--primary)" : "var(--surface)",
                  color: m.tipo === "enviada" ? "#fff" : "var(--text)",
                  fontSize:13, lineHeight:1.5,
                  border: m.tipo === "recebida" ? "1px solid var(--border)" : "none",
                }}>
                  <p style={{ margin:0 }}>{m.mensagem}</p>
                  <p style={{ fontSize:10, opacity:0.65, marginTop:3, textAlign:"right", margin:"3px 0 0" }}>
                    {new Date(m.timestamp).toLocaleTimeString("pt-BR", { hour:"2-digit", minute:"2-digit" })}
                  </p>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          <div style={{ padding:"10px 14px", borderTop:"1px solid var(--border)", background:"var(--surface)", display:"flex", gap:8 }}>
            <input className="input" style={{ flex:1, fontSize:13 }}
              placeholder="Digite uma mensagem... (Enter para enviar)"
              value={texto} onChange={e => setTexto(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), enviar())} />
            <button onClick={enviar} disabled={enviando || !texto.trim()} className="btn btn-primary" style={{ fontSize:12 }}>
              {enviando ? "..." : "Enviar"}
            </button>
          </div>
        </div>
      ) : (
        <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", background:"var(--bg)" }}>
          <div style={{ textAlign:"center", color:"var(--text-muted)" }}>
            <p style={{ fontSize:36, marginBottom:8 }}>💬</p>
            <p style={{ fontSize:14 }}>Selecione uma conversa</p>
          </div>
        </div>
      )}
    </div>
  );
}
