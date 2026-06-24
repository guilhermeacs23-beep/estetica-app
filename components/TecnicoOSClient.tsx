"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

const PROX_STATUS: Record<string, string | null> = {
  aguardando: "aceito", aceito: "em_atendimento", em_atendimento: "finalizado", finalizado: "entregue", entregue: null,
};
const BTN_LABEL: Record<string, string> = {
  aguardando: "✓ Aceitar", aceito: "▶ Iniciar Atendimento", em_atendimento: "✓ Finalizar", finalizado: "📦 Marcar Entregue",
};

export default function TecnicoOSClient({ os }: { os: any }) {
  const router = useRouter();
  const [status, setStatus] = useState(os.status);
  const [fotos, setFotos] = useState<any[]>(os.os_fotos ?? []);
  const [uploading, setUploading] = useState(false);
  const supabase = createClient();
  const prox = PROX_STATUS[status];

  async function avancar() {
    if (!prox) return;
    await fetch(`/api/ordens-servico/${os.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: prox }) });
    setStatus(prox);
    router.refresh();
  }

  async function uploadFoto(file: File, tipo: string) {
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${os.tenant_id}/os/${os.id}/${tipo}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("rpm-fotos").upload(path, file);
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from("rpm-fotos").getPublicUrl(path);
      await fetch(`/api/ordens-servico/${os.id}/fotos`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tipo, url: publicUrl }) });
      setFotos(p => [...p, { tipo, url: publicUrl, id: Date.now() }]);
    }
    setUploading(false);
  }

  return (
    <div className="p-4 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Link href="/tecnico" className="text-sm" style={{ color: "var(--text-muted)" }}>← Voltar</Link>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <span className="font-bold text-lg" style={{ color: "var(--primary)" }}>OS #{os.numero}</span>
          <span className={`badge badge-${status.replace("_","-")}`}>{status}</span>
        </div>
        <p className="text-xl font-bold" style={{ color: "var(--text)" }}>{os.veiculos?.placa}</p>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>{os.veiculos?.modelo} · {os.veiculos?.cor}</p>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>👤 {os.clientes?.nome}</p>
      </div>

      {/* Serviços */}
      <div className="card">
        <h2 className="font-semibold mb-2" style={{ color: "var(--text)" }}>Serviços</h2>
        {os.os_servicos?.map((s: any, i: number) => (
          <p key={i} className="text-sm py-1.5 border-b last:border-0" style={{ color: "var(--text-muted)", borderColor: "var(--border)" }}>• {s.nome}</p>
        ))}
      </div>

      {/* Fotos */}
      <div className="card">
        <h2 className="font-semibold mb-3" style={{ color: "var(--text)" }}>Fotos</h2>
        <div className="grid grid-cols-2 gap-2 mb-3">
          {["antes", "depois"].map(tipo => (
            <label key={tipo} className="btn btn-secondary cursor-pointer justify-center">
              📷 {tipo === "antes" ? "Antes" : "Depois"}
              <input type="file" accept="image/*" capture="environment" className="hidden"
                onChange={e => e.target.files?.[0] && uploadFoto(e.target.files[0], tipo)} />
            </label>
          ))}
        </div>
        {uploading && <p className="text-xs text-center mb-2" style={{ color: "var(--text-muted)" }}>Enviando...</p>}
        {fotos.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {fotos.map((f: any) => (
              <div key={f.id} className="relative">
                <img src={f.url} alt={f.tipo} className="w-full aspect-square object-cover rounded-lg" />
                <span className="absolute bottom-1 left-1 text-xs px-1 rounded" style={{ background: "rgba(0,0,0,0.7)", color: "#fff" }}>{f.tipo}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Botão de ação */}
      {prox && (
        <button onClick={avancar} className="btn btn-primary btn-lg w-full fixed bottom-20 left-0 right-0 mx-4 rounded-xl" style={{ width: "calc(100% - 2rem)" }}>
          {BTN_LABEL[status]}
        </button>
      )}
    </div>
  );
}
