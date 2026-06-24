"use client";
import { useEffect, useState } from "react";

const STATUS_LABEL: Record<string, string> = {
  aguardando:"Aguardando",aceito:"Aceito",em_atendimento:"Em Atendimento",finalizado:"Finalizado",entregue:"Entregue",
};
const STATUS_COLOR: Record<string, string> = {
  aguardando:"#eab308",aceito:"#3b82f6",em_atendimento:"#C41E3A",finalizado:"#22c55e",entregue:"#a855f7",
};

function Clock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(t); }, []);
  return (
    <div className="text-right">
      <div className="text-5xl font-bold tabular-nums" style={{ color: "#fff", letterSpacing: "-1px" }}>
        {time.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
      </div>
      <div className="text-sm mt-1 capitalize" style={{ color: "#888" }}>
        {time.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
      </div>
    </div>
  );
}

function getProgresso(os: any): number {
  const itens = os.os_servicos?.length ?? 0;
  if (!itens) return os.status === "finalizado" ? 100 : os.status === "em_atendimento" ? 50 : 0;
  return os.status === "finalizado" ? 100 : os.status === "em_atendimento" ? 65 : 0;
}

export default function PainelTVClient({ ordens, nomeTenant }: { ordens: any[]; nomeTenant: string }) {
  const [os, setOs] = useState(ordens);
  
  useEffect(() => {
    const interval = setInterval(async () => {
      const res = await fetch("/api/painel-tv");
      if (res.ok) { const json = await res.json(); setOs(json.ordens); }
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const counts = {
    aguardando: os.filter(o => o.status === "aguardando").length,
    aceito: os.filter(o => o.status === "aceito").length,
    em_atendimento: os.filter(o => o.status === "em_atendimento").length,
    finalizado: os.filter(o => o.status === "finalizado").length,
    entregue: os.filter(o => o.status === "entregue").length,
  };

  const emAtendimento = os.filter(o => o.status === "em_atendimento");
  const aguardando = os.filter(o => o.status === "aguardando" || o.status === "aceito");

  return (
    <div className="min-h-screen flex flex-col p-6 gap-6" style={{ background: "#0a0a0a" }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xl text-white" style={{ background: "#C41E3A" }}>R</div>
          <div>
            <p className="text-xs font-medium" style={{ color: "#666" }}>PAINEL DE ATENDIMENTO</p>
            <p className="text-lg font-bold" style={{ color: "#fff" }}>{nomeTenant}</p>
          </div>
        </div>
        <Clock />
      </div>

      {/* Contadores de status */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { key: "aguardando",    label: "Aguardando",    color: "#eab308" },
          { key: "aceito",        label: "Aceito",        color: "#3b82f6" },
          { key: "em_atendimento",label: "Em Atendimento",color: "#C41E3A" },
          { key: "finalizado",    label: "Finalizado",    color: "#22c55e" },
          { key: "entregue",      label: "Entregue",      color: "#a855f7" },
        ].map(s => (
          <div key={s.key} className="rounded-xl p-4 text-center" style={{ background: "#111", border: `1px solid ${s.color}22` }}>
            <p className="text-4xl font-bold" style={{ color: s.color }}>{counts[s.key as keyof typeof counts]}</p>
            <p className="text-xs mt-1 font-medium" style={{ color: "#666" }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Em atendimento agora */}
      {emAtendimento.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "#C41E3A" }}>Em Atendimento Agora</p>
          <div className="grid grid-cols-2 gap-4">
            {emAtendimento.map(o => {
              const prog = getProgresso(o);
              const servicos = o.os_servicos?.map((s: any) => s.nome).join(", ");
              const tecnico = o.os_servicos?.find((s: any) => s.funcionarios)?.funcionarios?.nome;
              return (
                <div key={o.id} className="rounded-xl p-5" style={{ background: "#111", border: "1px solid #C41E3A22" }}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-xs" style={{ color: "#666" }}>{o.hora_entrada} → {o.hora_saida_prevista ?? "--:--"}</p>
                      <p className="text-lg font-bold mt-1" style={{ color: "#fff" }}>{servicos || "—"}</p>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full font-semibold" style={{ background: "#C41E3A22", color: "#C41E3A" }}>Em Atendimento</span>
                  </div>
                  <div className="flex items-center gap-2 mb-1 text-sm" style={{ color: "#aaa" }}>
                    <span>🚗</span><span className="font-bold" style={{ color: "#fff" }}>{o.veiculos?.placa}</span>
                    <span>{o.clientes?.nome}</span>
                  </div>
                  {tecnico && <p className="text-xs mb-3" style={{ color: "#666" }}>👷 {tecnico}</p>}
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: "#222" }}>
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${prog}%`, background: "#C41E3A" }} />
                  </div>
                  <p className="text-xs text-right mt-1" style={{ color: "#666" }}>{prog}%</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Fila de espera */}
      {aguardando.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "#666" }}>Fila de Espera</p>
          <div className="grid grid-cols-3 gap-3">
            {aguardando.map(o => (
              <div key={o.id} className="rounded-xl p-4 flex items-center gap-3" style={{ background: "#111", border: "1px solid #2a2a2a" }}>
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: STATUS_COLOR[o.status] }} />
                <div>
                  <p className="text-sm font-bold" style={{ color: "#fff" }}>{o.veiculos?.placa}</p>
                  <p className="text-xs" style={{ color: "#666" }}>{o.clientes?.nome} · {o.hora_entrada ?? "--:--"}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {os.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3" style={{ color: "#333" }}>
          <span className="text-6xl">🚗</span>
          <p className="text-xl font-semibold">Nenhum veículo hoje</p>
        </div>
      )}
    </div>
  );
}
