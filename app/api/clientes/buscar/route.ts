import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json([], { status: 401 });

  const { data: profile } = await supabaseAdmin
    .from("profiles").select("tenant_id").eq("id", user.id).single();

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json([]);

  // busca por nome OU telefone/whatsapp
  const { data } = await supabaseAdmin
    .from("clientes")
    .select("id,nome,telefone,whatsapp")
    .eq("tenant_id", profile!.tenant_id)
    .or(`nome.ilike.%${q}%,telefone.ilike.%${q}%,whatsapp.ilike.%${q}%`)
    .order("nome")
    .limit(8);

  return NextResponse.json(data ?? []);
}
