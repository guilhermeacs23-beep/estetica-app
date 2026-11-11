import { supabaseAdmin } from "@/lib/supabase/admin";
import { buscarFoto } from "@/lib/whatsapp";

/** O link da foto do WhatsApp expira; renova depois deste prazo. */
const FOTO_VALIDADE_MS = 3 * 24 * 60 * 60 * 1000;

/**
 * Atualiza nome e foto do contato.
 * Nome: o do cadastro de clientes, se o número bater; senão o nome que a pessoa
 * usa no WhatsApp (pushName), quando vier. Nunca apaga um nome já conhecido.
 */
export async function atualizarContato(tenantId: string, numero: string, pushName?: string | null) {
  const { data: atual } = await supabaseAdmin
    .from("whatsapp_contatos").select("nome, foto_url, foto_atualizada_em")
    .eq("tenant_id", tenantId).eq("numero", numero).maybeSingle();

  const { data: cli } = await supabaseAdmin
    .from("clientes").select("nome")
    .eq("tenant_id", tenantId).ilike("whatsapp", "%" + numero.slice(-8))
    .limit(1).maybeSingle();

  const nome = cli?.nome || pushName || atual?.nome || null;

  const fotoVencida = !atual?.foto_atualizada_em ||
    Date.now() - new Date(atual.foto_atualizada_em).getTime() > FOTO_VALIDADE_MS;
  let foto_url = atual?.foto_url ?? null;
  let foto_atualizada_em = atual?.foto_atualizada_em ?? null;
  if (fotoVencida) {
    foto_url = await buscarFoto(numero);
    foto_atualizada_em = new Date().toISOString();
  }

  await supabaseAdmin.from("whatsapp_contatos").upsert({
    tenant_id: tenantId, numero, nome, foto_url, foto_atualizada_em,
    atualizado_em: new Date().toISOString(),
  }, { onConflict: "tenant_id,numero" });

  return { nome, foto_url };
}
