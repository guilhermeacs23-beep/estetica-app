/**
 * Ponte WhatsApp (Evolution API) — fonte única de configuração e envio.
 *
 * Trazida do Rustic Burger, onde cada uma destas regras custou um problema real:
 *  - todo envio passa por paraEnvio(): número sem 55 a Evolution aceita e NÃO entrega;
 *  - o corpo do sendText muda entre a v1 e a v2 do servidor, então perguntamos a versão;
 *  - o webhook só aceita quem traz o token (a URL é pública e previsível);
 *  - a empresa da mensagem sai da instância (configuracoes.wpp_instancia), não de
 *    "a primeira configuração que aparecer" — o banco tem mais de uma empresa.
 */
import { createHash } from "crypto";

export const EVO_URL = (process.env.EVOLUTION_API_URL ?? "").replace(/\/$/, "");
export const EVO_KEY = process.env.EVOLUTION_API_KEY ?? "";
export const INSTANCE = (process.env.EVOLUTION_INSTANCE ?? "studiorpm").trim();

export const configurado = () => Boolean(EVO_URL && EVO_KEY && INSTANCE);

/**
 * Token do webhook. Derivado da chave da Evolution (que só existe no servidor),
 * para não depender de mais uma variável na Vercel. Pode ser trocado por
 * PONTE_TOKEN se um dia alguém quiser girar sem trocar a chave.
 */
export function ponteToken(): string {
  if (process.env.PONTE_TOKEN) return process.env.PONTE_TOKEN;
  if (!EVO_KEY) return "";
  return createHash("sha256").update(`${EVO_KEY}:${INSTANCE}:ponte-studio-rpm`).digest("hex").slice(0, 40);
}

/** Comparação em tempo constante: token não se compara com === em rota pública. */
export function tokenConfere(recebido: string): boolean {
  const t = ponteToken();
  if (!t || recebido.length !== t.length) return false;
  let diff = 0;
  for (let i = 0; i < t.length; i++) diff |= t.charCodeAt(i) ^ recebido.charCodeAt(i);
  return diff === 0;
}

export function webhookUrl(origin: string): string {
  return `${origin.replace(/\/$/, "")}/api/whatsapp/webhook?t=${ponteToken()}`;
}

/** Não inventa o dígito 9 — a Evolution resolve o JID sozinha. Só garante o 55. */
export function paraEnvio(t: string): string {
  let n = String(t || "").replace(/\D/g, "").replace(/^0+/, "");
  if (!n.startsWith("55")) n = "55" + n;
  return n;
}

export async function evo(path: string, method = "GET", body?: unknown) {
  const res = await fetch(`${EVO_URL}${path}`, {
    method,
    headers: { "Content-Type": "application/json", apikey: EVO_KEY },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const dado = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, dado };
}

let versaoCache: { valor: string; quando: number } | null = null;
export async function versaoServidor(): Promise<string> {
  if (versaoCache && Date.now() - versaoCache.quando < 10 * 60 * 1000) return versaoCache.valor;
  try {
    const r = await fetch(EVO_URL, { cache: "no-store" });
    const d = await r.json();
    const v = String(d?.version ?? "2");
    versaoCache = { valor: v, quando: Date.now() };
    return v;
  } catch {
    return "2";
  }
}

/** Envia texto no dialeto do servidor. Devolve ok de verdade e o id da mensagem. */
export async function enviarTexto(telefone: string, texto: string) {
  if (!configurado()) return { ok: false, numero: "", waId: null as string | null, erro: "Evolution não configurada" };
  const numero = paraEnvio(telefone);
  const v = await versaoServidor();
  const corpo = v.startsWith("1")
    ? { number: numero, options: { delay: 0, presence: "composing" }, textMessage: { text: texto } }
    : { number: numero, text: texto };
  try {
    const r = await evo(`/message/sendText/${INSTANCE}`, "POST", corpo);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const d = r.dado as any;
    const waId: string | null = d?.key?.id ?? null;
    const ok = r.ok && !d?.error;
    return { ok, numero, waId, erro: ok ? null : JSON.stringify(d ?? r.status).slice(0, 300) };
  } catch (e) {
    return { ok: false, numero, waId: null, erro: (e as Error).message };
  }
}

/** Aponta o webhook da instância para cá, no formato da versão do servidor. */
export async function configurarWebhook(url: string) {
  const v = await versaoServidor();
  const corpo = v.startsWith("1")
    ? { url, enabled: true, webhook_by_events: false, webhook_base64: false, events: ["MESSAGES_UPSERT", "CHATS_UPDATE"] }
    : { webhook: { enabled: true, url, byEvents: false, base64: false, events: ["MESSAGES_UPSERT", "CHATS_UPDATE"] } };
  const r = await evo(`/webhook/set/${INSTANCE}`, "POST", corpo);
  return { ...r, versao: v };
}

/** O que o servidor realmente tem gravado como webhook desta instância. */
export async function webhookAtual(): Promise<string | null> {
  const { ok, dado } = await evo(`/webhook/find/${INSTANCE}`);
  if (!ok || !dado) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = dado as any;
  return (d?.url ?? d?.webhook?.url ?? null) as string | null;
}

/** Foto de perfil do contato (se ele deixa visível). null quando não tem. */
export async function buscarFoto(numero: string): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch(`${EVO_URL}/chat/fetchProfilePictureUrl/${INSTANCE}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: EVO_KEY },
      body: JSON.stringify({ number: paraEnvio(numero) }),
      cache: "no-store",
      signal: ctrl.signal,
    });
    clearTimeout(t);
    const d = await res.json().catch(() => null);
    const url = d?.profilePictureUrl ?? d?.profilePicUrl ?? null;
    return typeof url === "string" && url.startsWith("http") ? url : null;
  } catch {
    return null;
  }
}
