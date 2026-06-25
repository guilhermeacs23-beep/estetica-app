"use server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import Link from "next/link";

export default async function ClientesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabaseAdmin.from("profiles").select("tenant_id").eq("id", user!.id).single();
  const { data: clientes } = await supabaseAdmin.from("clientes")
    .select("id, nome, telefone, whatsapp, email, endereco, cidade, estado, created_at, veiculos(placa, modelo, ano, marca, cor)")
    .eq("tenant_id", profile!.tenant_id).order("nome");

  return (
    <div className="flex flex-col gap-6" style={{ maxWidth: 1200 }}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>Clientes</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>{clientes?.length ?? 0} clientes cadastrados</p>
        </div>
        <div className="flex gap-2">
          <Link href="/importar" className="btn btn-ghost" style={{ fontSize: 13 }}>Importar XLSX</Link>
          <Link href="/clientes/novo" className="btn btn-primary">+ Novo Cliente</Link>
        </div>
      </div>
      <div className="table-wrapper" style={{ overflowX: "auto" }}>
        <table style={{ minWidth: 900 }}>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Telefone</th>
              <th>E-mail</th>
              <th>Endereco</th>
              <th>Veiculo / Placa</th>
              <th>Cadastrado em</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {!clientes?.length ? (
              <tr><td colSpan={7} className="text-center py-12" style={{ color: "var(--text-muted)" }}>
                Nenhum cliente ainda.{" "}
                <Link href="/importar" style={{ color: "var(--primary)" }}>Importar via XLSX</Link>
              </td></tr>
            ) : clientes.map(c => {
              const v = Array.isArray(c.veiculos) ? c.veiculos[0] : c.veiculos;
              const veiculo = v ? `${v.modelo ?? ""}${v.ano ? ` ${v.ano}` : ""}${v.cor ? ` (${v.cor})` : ""}` : null;
              const endereco = [c.endereco, c.cidade, c.estado].filter(Boolean).join(", ") || null;
              return (
                <tr key={c.id}>
                  <td className="font-medium" style={{ color: "var(--text)" }}>{c.nome}</td>
                  <td style={{ color: "var(--text-muted)", whiteSpace: "nowrap" }}>{c.telefone ?? c.whatsapp ?? "-"}</td>
                  <td style={{ color: "var(--text-muted)" }}>{c.email ?? "-"}</td>
                  <td style={{ color: "var(--text-muted)", fontSize: 13 }}>{endereco ?? "-"}</td>
                  <td style={{ color: "var(--text-muted)", fontSize: 13 }}>
                    {veiculo ? (
                      <span>{veiculo}<br /><span style={{ color: "var(--primary)", fontWeight: 600, letterSpacing: 1 }}>{v!.placa}</span></span>
                    ) : "-"}
                  </td>
                  <td style={{ color: "var(--text-muted)", whiteSpace: "nowrap" }}>{new Date(c.created_at).toLocaleDateString("pt-BR")}</td>
                  <td><Link href={`/clientes/${c.id}`} className="btn btn-sm btn-ghost">Ver</Link></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
