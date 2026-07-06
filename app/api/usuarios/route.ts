import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: profile } = await supabaseAdmin.from("profiles").select("tenant_id, role").eq("id", user.id).single();
  if (profile?.role !== "owner") return NextResponse.json({ error: "Sem permissao" }, { status: 403 });
  const { data } = await supabaseAdmin.from("profiles")
    .select("id, nome, email, role, ativo, created_at")
    .eq("tenant_id", profile.tenant_id)
    .order("nome");
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: ownerProfile } = await supabaseAdmin.from("profiles")
    .select("tenant_id, role").eq("id", user.id).single();
  if (ownerProfile?.role !== "owner") return NextResponse.json({ error: "Sem permissao" }, { status: 403 });

  const { nome, email, senha, role } = await req.json();
  if (!nome || !email || !senha) return NextResponse.json({ error: "Nome, e-mail e senha sao obrigatorios" }, { status: 400 });

  const { data: existing } = await supabaseAdmin.from("profiles").select("id").eq("email", email).maybeSingle();
  if (existing) return NextResponse.json({ error: "E-mail ja cadastrado no sistema" }, { status: 400 });

  const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
    email, password: senha, email_confirm: true,
  });
  if (authErr) return NextResponse.json({ error: authErr.message }, { status: 400 });

  const { data: newProfile, error: profileErr } = await supabaseAdmin.from("profiles").insert({
    id: authData.user.id,
    tenant_id: ownerProfile.tenant_id,
    nome, email,
    role: role || "atendente",
    ativo: true,
  }).select().single();

  if (profileErr) {
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
    return NextResponse.json({ error: profileErr.message }, { status: 500 });
  }
  return NextResponse.json(newProfile);
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: ownerProfile } = await supabaseAdmin.from("profiles").select("tenant_id, role").eq("id", user.id).single();
  if (ownerProfile?.role !== "owner") return NextResponse.json({ error: "Sem permissao" }, { status: 403 });
  const { id, role, ativo } = await req.json();
  const { data, error } = await supabaseAdmin.from("profiles")
    .update({ role, ativo }).eq("id", id).eq("tenant_id", ownerProfile.tenant_id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
