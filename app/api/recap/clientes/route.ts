import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  const tenantSlug = searchParams.get("tenant");

  if (!token || token !== (process.env.RECAP_WEBHOOK_TOKEN ?? "studio-rpm-recap")) {
    return NextResponse.json({ error: "Token inválido" }, { status: 401 });
  }

  let tenantId: string | null = null;
  if (tenantSlug) {
    const { data: tenant } = await supabaseAdmin.from("tenants").select("id").eq("slug", tenantSlug).single();
    tenantId = tenant?.id ?? null;
  }

  const query = supabaseAdmin.from("vw_clientes_recap").select("*");
  const { data, error } = tenantId
    ? await query.eq("tenant_id", tenantId).order("dias_atrasado", { ascending: false })
    : await query.order("dias_atrasado", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    total: data?.length ?? 0,
    gerado_em: new Date().toISOString(),
    clientes: (data ?? []).map((c: any) => ({
      id: c.cliente_id,
      nome: c.cliente_nome,
      telefone: c.telefone,
      ultima_visita: c.ultima_visita,
      retorno_previsto: c.data_retorno_prevista,
      dias_atrasado: c.dias_atrasado,
      whatsapp_link: c.telefone ? `https://wa.me/55${String(c.telefone).replace(/\D/g,"")}` : null,
    })),
  });
}
