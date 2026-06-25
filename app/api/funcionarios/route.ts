import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const { data: profile } = await supabaseAdmin.from("profiles").select("tenant_id").eq("id", user.id).single();
  const body = await req.json();

  // Criar auth user para funcionário (email gerado automaticamente)
  const slug = body.nome.toLowerCase().replace(/\s+/g, ".").replace(/[^a-z.]/g, "");
  const email = `${slug}.${Date.now()}@interno.studiorpm.com`;
  const { data: authUser } = await supabaseAdmin.auth.admin.createUser({
    email, password: Math.random().toString(36).slice(2) + "Aa1!",
    email_confirm: true,
  });

  if (!authUser?.user) return NextResponse.json({ error: "Erro ao criar usuário" }, { status: 400 });

  const { data, error } = await supabaseAdmin.from("profiles").insert({
    id: authUser.user.id,
    tenant_id: profile!.tenant_id,
    nome: body.nome,
    email,
    role: "tecnico",
    codigo_matricula: body.codigo_matricula ?? null,
    comissao_percentual: body.comissao_percentual ?? 0,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ...data, profissao: body.profissao });
}
