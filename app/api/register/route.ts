import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

function slugify(text: string) {
  return text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

export async function POST(req: NextRequest) {
  try {
    const { nomeEstetica, nomeResponsavel, email, senha, telefone } = await req.json();
    if (!nomeEstetica || !email || !senha || !nomeResponsavel)
      return NextResponse.json({ error: "Campos obrigatórios faltando." }, { status: 400 });

    // 1. Criar usuário no Auth
    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email, password: senha, email_confirm: true,
    });
    if (authErr) return NextResponse.json({ error: authErr.message }, { status: 400 });

    const userId = authData.user.id;

    // 2. Criar tenant
    const slug = slugify(nomeEstetica) + "-" + Math.random().toString(36).slice(2, 6);
    const { data: tenant, error: tenantErr } = await supabaseAdmin
      .from("tenants").insert({ nome: nomeEstetica, slug }).select().single();
    if (tenantErr) { await supabaseAdmin.auth.admin.deleteUser(userId); return NextResponse.json({ error: tenantErr.message }, { status: 500 }); }

    // 3. Criar profile
    const { error: profileErr } = await supabaseAdmin
      .from("profiles").insert({
        id: userId, tenant_id: tenant.id, nome: nomeResponsavel,
        email, role: "owner", ativo: true,
      });
    if (profileErr) return NextResponse.json({ error: profileErr.message }, { status: 500 });

    // 4. Criar configuração padrão
    await supabaseAdmin.from("configuracoes").insert({
      tenant_id: tenant.id, nome_fantasia: nomeEstetica,
      vagas_dia: 5, horario_abertura: "08:00", horario_fechamento: "18:00",
    });

    // 5. Criar formas de pagamento padrão
    const formas = ["Dinheiro", "PIX", "Cartão Crédito", "Cartão Débito"].map((nome, i) => ({
      tenant_id: tenant.id, nome,
      tipo: ["dinheiro", "pix", "credito", "debito"][i],
    }));
    await supabaseAdmin.from("formas_pagamento").insert(formas);

    // 6. Sign in para setar cookie de sessão
    const { error: signInErr } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink", email,
    });

    return NextResponse.json({ ok: true, tenantId: tenant.id });
  } catch (err) {
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
