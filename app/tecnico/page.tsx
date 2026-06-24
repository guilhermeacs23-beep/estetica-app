import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import Link from "next/link";

const STATUS_LABEL: Record<string, string> = {
  aguardando:"Aguardando",aceito:"Aceito",em_atendimento:"Em Atendimento",finalizado:"Finalizado",entregue:"Entregue",recusado:"Recusado",
};

export default async function TecnicoPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabaseAdmin.schema("rpm").from("profiles").select("tenant_id, nome").eq("id", user!.id).single();
  const hoje = new Date().toISOString().split("T")[0];

  const { data: ordens } = await supabaseAdmin.schema("rpm").from("ordens_servico")
    .select("id, numero, status, hora_entrada, clientes(nome), veiculos(placa, modelo, cor), os_servicos(nome)")
    .eq("tenant_id", profile!.tenant_id).eq("data_entrada", hoje)
    .neq("status", "entregue").neq("status", "recusado").order("hora_entrada");

  return (
    <div className="p-4 flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-bold" style={{ color: "var(--text)" }}>Olá, {profile?.nome?.split(" ")[0]} 👋</h1>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })} · {ordens?.length ?? 0} OS
        </p>
      </div>

      {!ordens?.length ? (
        <div className="card text-center py-12">
          <p className="text-4xl mb-3">🚗</p>
          <p className="font-medium" style={{ color: "var(--text)" }}>Nenhuma OS para hoje</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {ordens.map((os: any) => (
            <Link key={os.id} href={`/tecnico/os/${os.id}`} className="card flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm" style={{ color: "var(--primary)" }}>OS #{os.numero}</span>
                <span className={`badge badge-${os.status.replace("_","-")}`}>{STATUS_LABEL[os.status]}</span>
              </div>
              <div>
                <p className="font-semibold" style={{ color: "var(--text)" }}>{os.veiculos?.placa} · {os.veiculos?.modelo}</p>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>{os.clientes?.nome} · {os.hora_entrada ?? "--:--"}</p>
              </div>
              {os.os_servicos?.length > 0 && (
                <p className="text-xs" style={{ color: "var(--text-subtle)" }}>
                  {os.os_servicos.map((s: any) => s.nome).join(" · ")}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
