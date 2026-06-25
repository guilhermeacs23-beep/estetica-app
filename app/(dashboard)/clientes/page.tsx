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
              <tr><td colSpan={7} className="text-center py-12" style={{ color: "var(--text-muted)" }}>Nenhum cliente ainda. <Link href="/importar" style={{ color: "var(--primary)" }}>Importar via XLSX</Link></td></tr>
            ) : clientes.map(c => {
              const v = Array.isArray(c.veiculos) ? c.ve