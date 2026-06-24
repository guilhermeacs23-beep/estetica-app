"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const STATUSES = ["aguardando", "aceito", "em_atendimento", "finalizado", "entregue", "recusado"];
const STATUS_LABEL: Record<string, string> = {
  aguardando: "Aguardando", aceito: "Aceito", em_atendimento: "Em Atendimento",
  finalizado: "Finalizado", entregue: "Entregue", recusado: "Recusado",
};

export default function OSDetalheClient({ os, profile, funcionarios }: any) {
  const router = useRouter();
  const [status, setStatus] = useState(os.status);
  const [uploading, setUploading] = useState(false);
  const [fotos, setFotos] = useState<any[]>(os.os_fotos ?? []);
  const supabase = createClient();

  async function updateStatus(novoStatus: string) {
    await fetch(`/api/ordens-servico/${os.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: novoStatus }),
    });
    setStatus(novoStatus);
    router.refresh();
  }

  async function uploadFoto(file: File, tipo: string) {
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${os.tenant_id}/os/${os.id}/${tipo}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("rpm-fotos").upload(path, file);
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from("rpm-fotos").getPublicUrl(path);
      await fetch(`/api/ordens-servico/${os.id}/fotos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo, url: publicUrl }),
      });
      setFotos(prev => [...prev, { tipo, url: publicUrl, id: Date.now() }]);
    }
    setUploading(false);
  }

  const PROX_STATUS: Record<string, string | null> = {
    aguardando: "aceito", aceito: "em_atendimento", em_atendimento: "finalizado",
    finalizado: "entregue", entregue: null, recusado: null,
  };

  const proxStatus = PROX_STATUS[status];

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link href="/ordens-de-servico" className="text-sm" style={{ color: "var(--text-muted)" }}>← OS</Link>
            <span style={{ color: "var(--text-muted)" }}>/</span>
            <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>OS #{os.numero}</span>
          </div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>OS #{os.numero}</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            {new Date(os.data_entrada + "T00:00").toLocaleDateString("pt-BR")} · {os.hora_entrada ?? ""} · Vaga {os.vaga ?? "-"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`badge badge-${status.replace("_", "-")} text-sm py-1.5 px-3`}>{STATUS_LABEL[status]}</span>
          {proxStatus && (
            <button className="btn btn-primary" onClick={() => updateStatus(proxStatus)}>
              → {STATUS_LABEL[proxStatus]}
            </button>
          )}
          {status === "aguardando" && profile.role !== "tecnico" && (
            <button className="btn btn-danger btn-sm" onClick={() => updateStatus("recusado")}>Recusar</button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Cliente */}
        <div className="card flex flex-col gap-3">
          <h2 className="font-semibold text-sm uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Cliente</h2>
          <p className="font-semibold" style={{ color: "var(--text)" }}>{os.clientes?.nome}</p>
          {os.clientes?.telefone && <p className="text-sm" style={{ color: "var(--text-muted)" }}>📞 {os.clientes.telefone}</p>}
          {os.clientes?.whatsapp && (
            <a href={`https://wa.me/55${os.clientes.whatsapp.replace(/\D/g, "")}`} target="_blank" className="btn btn-sm btn-secondary w-fit">
              💬 WhatsApp
            </a>
          )}
        </div>

        {/* Veículo */}
        <div className="card flex flex-col gap-2">
          <h2 className="font-semibold text-sm uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Veículo</h2>
          <p className="text-xl font-bold" style={{ color: "var(--primary)" }}>{os.veiculos?.placa}</p>
          <p className="font-medium" style={{ color: "var(--text)" }}>{os.veiculos?.marca} {os.veiculos?.modelo}</p>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>{os.veiculos?.cor} · {os.veiculos?.ano ?? "-"}</p>
        </div>
      </div>

      {/* Serviços */}
      <div className="card">
        <h2 className="font-semibold mb-4" style={{ color: "var(--text)" }}>Serviços</h2>
        <div className="flex flex-col gap-2">
          {os.os_servicos?.map((s: any) => (
            <div key={s.id} className="flex items-center justify-between p-3 rounded-lg" style={{ background: "var(--bg)" }}>
              <div>
                <p className="text-sm font-medium" style={{ color: "var(--text)" }}>{s.nome}</p>
                {s.funcionarios && <p className="text-xs" style={{ color: "var(--text-muted)" }}>👷 {s.funcionarios.nome}</p>}
              </div>
              <p className="font-semibold" style={{ color: "var(--primary)" }}>R$ {s.preco.toFixed(2).replace(".", ",")}</p>
            </div>
          ))}
        </div>
        <div className="divider" />
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-sm"><span style={{ color: "var(--text-muted)" }}>Subtotal</span><span>R$ {(os.valor_total ?? 0).toFixed(2).replace(".", ",")}</span></div>
          {(os.desconto ?? 0) > 0 && <div className="flex justify-between text-sm"><span style={{ color: "var(--text-muted)" }}>Desconto</span><span style={{ color: "var(--danger)" }}>- R$ {os.desconto.toFixed(2).replace(".", ",")}</span></div>}
          <div className="flex justify-between font-bold text-base mt-1">
            <span style={{ color: "var(--text)" }}>Total</span>
            <span style={{ color: "var(--primary)" }}>R$ {(os.valor_final ?? 0).toFixed(2).replace(".", ",")}</span>
          </div>
          {os.formas_pagamento && <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>💳 {os.formas_pagamento.nome}</p>}
        </div>
      </div>

      {/* Checklist */}
      {os.checklist_entrada && Object.keys(os.checklist_entrada).length > 0 && (
        <div className="card">
          <h2 className="font-semibold mb-3" style={{ color: "var(--text)" }}>Checklist de Entrada</h2>
          <div className="grid grid-cols-2 gap-1.5">
            {Object.entries(os.checklist_entrada).filter(([k]) => k !== "observacoes").map(([k, v]) => (
              <div key={k} className="flex items-center gap-2 text-sm">
                <span style={{ color: v ? "var(--danger)" : "var(--success)" }}>{v ? "⚠️" : "✓"}</span>
                <span style={{ color: v ? "var(--text)" : "var(--text-subtle)" }}>{k}</span>
              </div>
            ))}
          </div>
          {os.checklist_entrada.observacoes && (
            <p className="mt-3 text-sm p-3 rounded-lg" style={{ background: "var(--bg)", color: "var(--text-muted)" }}>
              {os.checklist_entrada.observacoes}
            </p>
          )}
        </div>
      )}

      {/* Fotos */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold" style={{ color: "var(--text)" }}>Fotos</h2>
          <div className="flex gap-2">
            {["antes", "depois"].map(tipo => (
              <label key={tipo} className="btn btn-sm btn-secondary cursor-pointer">
                📷 {tipo === "antes" ? "Antes" : "Depois"}
                <input type="file" accept="image/*" className="hidden"
                  onChange={e => e.target.files?.[0] && uploadFoto(e.target.files[0], tipo)} />
              </label>
            ))}
          </div>
        </div>
        {uploading && <p className="text-sm mb-3" style={{ color: "var(--text-muted)" }}>Enviando foto...</p>}
        {fotos.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Nenhuma foto adicionada.</p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {fotos.map((f: any) => (
              <div key={f.id} className="relative group">
                <img src={f.url} alt={f.tipo} className="w-full aspect-square object-cover rounded-lg" style={{ border: "1px solid var(--border)" }} />
                <span className="absolute bottom-1 left-1 text-xs px-1.5 py-0.5 rounded" style={{ background: "rgba(0,0,0,0.7)", color: "#fff" }}>{f.tipo}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
