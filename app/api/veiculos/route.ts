import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const clienteId = req.nextUrl.searchParams.get("clienteId");
  if (!clienteId) return NextResponse.json({ data: [] });
  const { data } = await supabaseAdmin.schema("rpm").from("veiculos")
    .select("id, placa, modelo, cor, ano").eq("cliente_id", clienteId);
  return NextResponse.json({ data });
}
