import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

interface ImportRow {
  nome: string; telefone?: string; whatsapp?: string; email?: string; cpf?: string;
  placa?: string; modelo?: string; cor?: string; ano?: string;
  ultimo_servico?: string; data_ultimo_servico?: string;
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

  const { data: profile } = await supabaseAdmin.from("profiles").select("tenant_id").eq("id", user.id).single();
  if (!profile?.tenant_id) return NextResponse.json({ error: "Tenant nao encontrado" }, { status: 400 });
  const tenant_id = profile.tenant_id;

  const { rows }: { rows: ImportRow[] } = await request.json();
  if (!rows?.length) return NextResponse.json({ error: "Nenhuma linha" }, { status: 400 });

  let clientes_criados = 0, veiculos_criados = 0, os_criadas = 0, erros = 0;
  const detalhes_erros: string[] = [];

  for (const row of rows) {
    try {
      if (!row.nome?.trim()) { erros++; continue; }
      let cliente_id: string | null = null;

      if (row.telefone) {
        const { data: ex } = await supabaseAdmin.from("clientes").select("id")
          .eq("tenant_id", tenant_id).eq("telefone", row.telefone.replace(/\D/g, "")).maybeSingle();
        if (ex) cliente_id = ex.id;
      }
      if (!cliente_id && row.email) {
        const { data: ex } = await supabaseAdmin.from("clientes").select("id")
          .eq("tenant_id", tenant_id).eq("email", row.email.trim().toLowerCase()).maybeSingle();
        if (ex) cliente_id = ex.id;
      }
      if (!cliente_id) {
        const tel = row.telefone ? row.telefone.replace(/\D/g, "") : null;
        const { data: novo, error: e } = await supabaseAdmin.from("clientes")
          .insert({ tenant_id, nome: row.nome.trim(), telefone: tel, whatsapp: row.whatsapp ? row.whatsapp.replace(/\D/g, "") : tel, email: row.email?.trim().toLowerCase() || null, cpf: row.cpf?.replace(/\D/g, "") || null })
          .select("id").single();
        if (e || !novo) { erros++; detalhes_erros.push(`${row.nome}: ${e?.message}`); continue; }
        cliente_id = novo.id;
        clientes_criados++;
      }

      let veiculo_id: string | null = null;
      if (row.placa || row.modelo) {
        if (row.placa) {
          const placa = row.placa.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
          const { data: ex } = await supabaseAdmin.from("veiculos").select("id").eq("tenant_id", tenant_id).eq("placa", placa).maybeSingle();
          if (ex) veiculo_id = ex.id;
        }
        if (!veiculo_id) {
          const { data: nv } = await supabaseAdmin.from("veiculos")
            .insert({ tenant_id, cliente_id, placa: row.placa ? row.placa.replace(/[^a-zA-Z0-9]/g, "").toUpperCase() : null, modelo: row.modelo?.trim() || null, cor: row.cor?.trim() || null, ano: row.ano ? parseInt(row.ano) || null : null })
            .select("id").single();
          if (nv) { veiculo_id = nv.id; veiculos_criados++; }
        }
      }

      if (row.ultimo_servico && veiculo_id) {
        let data_os = new Date();
        if (row.data_ultimo_servico) {
          const p = row.data_ultimo_servico.split(/[\/\-]/);
          if (p.length === 3) data_os = p[0].length === 4 ? new Date(`${p[0]}-${p[1]}-${p[2]}`) : new Date(`${p[2]}-${p[1]}-${p[0]}`);
        }
        const { error: eos } = await supabaseAdmin.from("ordens_servico")
          .insert({ tenant_id, cliente_id, veiculo_id, status: "entregue", observacoes: `Importado: ${row.ultimo_servico}`, created_at: isNaN(data_os.getTime()) ? new Date().toISOString() : data_os.toISOString() });
        if (!eos) os_criadas++;
      }
    } catch (e: unknown) { erros++; if (e instanceof Error) detalhes_erros.push(e.message); }
  }

  return NextResponse.json({ clientes_criados, veiculos_criados, os_criadas, erros, total: rows.length, detalhes_erros: detalhes_erros.slice(0, 10) });
}
