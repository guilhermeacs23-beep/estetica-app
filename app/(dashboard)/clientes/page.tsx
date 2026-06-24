import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import Link from "next/link";

export default async function ClientesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabaseAdmin.schema("rpm").from("profiles").select("tenant_id").eq("id", user!.id).single();
  const { data: clientes } = await supabaseAdmin.schema("rpm").from("clientes")
    .select("id, nome, telefone, whatsapp, email, created_at")
    .eq("tenant_id", profile!.tenant_id).order("nome");

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>Clientes</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>{clientes?.length ?? 0} clientes cadastrados</p>
        </div>
        <Link href="/clientes/novo" className="btn btn-primary">+ Novo Cliente</Link>
      </div>
      <div className="table-wrapper">
        <table>
          <thead><tr><th>Nome</th><th>Telefone</th><th>E-mail</th><th>Cadastrado em</th><th></th></tr></thead>
          <tbody>
            {!clientes?.length ? (
              <tr><td colSpan={5} className="text-center py-12" style={{ color: "var(--text-muted)" }}>Nenhum cliente ainda.</td></tr>
            ) : clientes.map(c => (
              <tr key={c.id}>
                <td className="font-medium" style={{ color: "var(--text)" }}>{c.nome}</td>
                <td style={{ color: "var(--text-muted)" }}>{c.telefone ?? "-"}</td>
                <td style={{ color: "var(--text-muted)" }}>{c.email ?? "-"}</td>
                <td style={{ color: "var(--text-muted)" }}>{new Date(c.created_at).toLocaleDateString("pt-BR")}</td>
                <td><Link href={`/clientes/${c.id}`} className="btn btn-sm btn-ghost">Ver →</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
