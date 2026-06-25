import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const codigo = searchParams.get("codigo");
  if (!codigo) return NextResponse.json(null);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabaseAdmin.from("profiles").select("tenant_id").eq("id", user!.id).single();

  const { data } = await supabaseAdmin
    .from("profiles")
    .select("id, nome, codigo_matricula, comissao_percentual")
    .eq("tenant_id", profile!.tenant_id)
    .eq("codigo_matricula", codigo)
    .eq("ativo", true)
    .single();

  return NextResponse.json(data ?? null);
}
