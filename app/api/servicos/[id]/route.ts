import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { ficha_tecnica, ...body } = await req.json();
  const { data, error } = await supabaseAdmin.from("servicos").update(body).eq("id", params.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (ficha_tecnica) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabaseAdmin.from("profiles").select("tenant_id").eq("id", user!.id).single();
    await supabaseAdmin.from("servico_produtos").delete().eq("servico_id", params.id);
    if (ficha_tecnica.length) {
      await supabaseAdmin.from("servico_produtos").insert(
        ficha_tecnica.map((l: { produto_id: string; quantidade: number }) => ({
          servico_id: params.id, produto_id: l.produto_id,
          quantidade: l.quantidade, tenant_id: profile!.tenant_id,
        }))
      );
    }
  }
  return NextResponse.json(data);
}
