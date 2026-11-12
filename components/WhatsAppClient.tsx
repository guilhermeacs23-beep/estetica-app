"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import WhatsAppConfig from "@/components/WhatsAppConfig";
import WhatsAppConversas from "@/components/WhatsAppConversas";

export default function WhatsAppClient({ podeConfigurar }: { podeConfigurar: boolean }) {
  const searchParams = useSearchParams();
  const [aba, setAba] = useState<"conversas" | "mensagens">(
    podeConfigurar && searchParams.get("aba") === "mensagens" ? "mensagens" : "conversas"
  );
  const abas = podeConfigurar
    ? ([["conversas", "Conversas"], ["mensagens", "Configurações de mensagens"]] as const)
    : ([["conversas", "Conversas"]] as const);

  return (
    <div className="flex flex-col gap-6">
      {abas.length > 1 && (
        <div className="flex gap-2" style={{ borderBottom: "1px solid var(--border)" }}>
          {abas.map(([key, label]) => (
            <button key={key} onClick={() => setAba(key)}
              style={{ padding: "10px 20px", fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer",
                borderBottom: aba === key ? "2px solid var(--primary)" : "2px solid transparent",
                color: aba === key ? "var(--primary)" : "var(--text-muted)", background: "none" }}>
              {label}
            </button>
          ))}
        </div>
      )}
      {aba === "conversas" && <WhatsAppConversas />}
      {aba === "mensagens" && <WhatsAppConfig />}
    </div>
  );
}
