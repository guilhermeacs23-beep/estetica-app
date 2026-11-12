// Lumi do Studio RPM — assistente de negócios do DONO, dentro do painel.
//
// Mesmo desenho da Lumi da Jessica (jc-lumi-dona): ferramentas prontas para o
// que se pergunta todo dia + uma consulta livre para o resto, e a regra de ouro
// de não inventar número. Diferenças de propósito:
//  - quem chama é o próprio painel, com o login do Alex (verify_jwt). A função
//    confere que é DONO e descobre a empresa pelo perfil — nada vem do navegador;
//  - toda leitura passa por public.lumi_consulta, que roda como lumi_leitor:
//    um papel que só enxerga as visões lumi.v_*, já filtradas pela empresa;
//  - a chave da IA fica no Vault do banco, não no código.

import { createClient } from "jsr:@supabase/supabase-js@2";

const SB_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const db = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });

const MODELOS = ["openai/gpt-oss-120b", "openai/gpt-oss-20b"];
const MAX_HIST = 6;
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (d: unknown, status = 200) =>
  new Response(JSON.stringify(d), { status, headers: { ...CORS, "Content-Type": "application/json" } });

// ------------------------------------------------------------------ datas
const DATA = /^\d{4}-\d{2}-\d{2}$/;
const data = (s: unknown, padrao: string) => (typeof s === "string" && DATA.test(s) ? s : padrao);
function hojeSP(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}
function somaDias(iso: string, n: number): string {
  const d = new Date(iso + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// ------------------------------------------------------------------ consulta
async function consulta(tenant: string, sql: string) {
  const { data: r, error } = await db.rpc("lumi_consulta", { p_tenant: tenant, p_sql: sql });
  if (error) return { erro: error.message };
  return r;
}

// ------------------------------------------------------------------ ferramentas
const FERRAMENTAS = [
  { type: "function", function: { name: "resumo_periodo",
    description: "Resumo de um período: faturamento REALIZADO (OS finalizadas/entregues), quantidade de OS, ticket médio, clientes distintos, descontos dados, e à parte o que está EM ANDAMENTO (aguardando, aceito, em atendimento) e o que foi recusado.",
    parameters: { type: "object", properties: {
      de: { type: "string", description: "AAAA-MM-DD" }, ate: { type: "string", description: "AAAA-MM-DD" } },
      required: ["de", "ate"] } } },
  { type: "function", function: { name: "comparativo_mes",
    description: "Compara o mês com o anterior. Se o mês estiver em curso, compara o MESMO número de dias dos dois lados (dia 1 até hoje x dia 1 até o mesmo dia do mês passado). Já traz os dois lados.",
    parameters: { type: "object", properties: { mes: { type: "string", description: "qualquer dia do mês, AAAA-MM-DD" } },
      required: ["mes"] } } },
  { type: "function", function: { name: "os_em_andamento",
    description: "Lista as OS que ainda não foram finalizadas (aguardando, aceito, em atendimento): número, data, cliente, carro, valor, status.",
    parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "servicos_mais_vendidos",
    description: "Serviços realizados no período, com quantidade e valor, do maior para o menor.",
    parameters: { type: "object", properties: {
      de: { type: "string", description: "AAAA-MM-DD" }, ate: { type: "string", description: "AAAA-MM-DD" } },
      required: ["de", "ate"] } } },
  { type: "function", function: { name: "clientes_sem_voltar",
    description: "Clientes que já fizeram serviço e não voltam há X dias (padrão 60), dos que mais gastaram para os que menos.",
    parameters: { type: "object", properties: { dias: { type: "number", description: "mínimo de dias sem voltar" } } } } },
  { type: "function", function: { name: "whatsapp_sem_resposta",
    description: "Contatos do WhatsApp da loja cuja ÚLTIMA mensagem foi do cliente — ou seja, estão esperando resposta. Traz nome, quando escreveu e o que escreveu.",
    parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "whatsapp_movimento",
    description: "Movimento do WhatsApp por dia no período: mensagens recebidas, enviadas e quantos contatos diferentes escreveram.",
    parameters: { type: "object", properties: {
      de: { type: "string", description: "AAAA-MM-DD" }, ate: { type: "string", description: "AAAA-MM-DD" } },
      required: ["de", "ate"] } } },
  { type: "function", function: { name: "orcamentos_abertos",
    description: "Orçamentos que ainda não viraram OS nem foram recusados: cliente, carro, valor, validade.",
    parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "consultar_dados",
    description: "Monte sua própria consulta (só SELECT) quando a pergunta não couber nas ferramentas acima. Visões disponíveis (já filtradas pela loja): " +
      "lumi.v_os (os, data, dow 1=seg..7=dom, dia_semana, mes 'AAAA-MM', status, realizada bool, em_andamento bool, valor_total, desconto, valor_final, cliente, cidade, placa, marca, modelo, categoria_veiculo, forma_pagamento, funcionario, hora_entrada, hora_saida_prevista, created_at); " +
      "lumi.v_os_servicos (os, data, mes, status, realizada, servico, categoria, preco, funcionario, cliente, modelo, categoria_veiculo); " +
      "lumi.v_clientes (cliente, cidade, cadastrado_em, servicos_realizados, ultima_visita, total_gasto, dias_sem_voltar); " +
      "lumi.v_whatsapp (numero, contato, tipo 'recebida'|'enviada', mensagem, quando, dia, lida); " +
      "lumi.v_orcamentos (orcamento, criado_em, validade, status, valor_total, desconto, cliente, modelo, virou_os); " +
      "lumi.v_servicos (servico, categoria, preco_base, duracao_min, ativo). " +
      "Sempre escreva o nome com o prefixo lumi. Dinheiro que entrou = where realizada.",
    parameters: { type: "object", properties: { sql: { type: "string" } }, required: ["sql"] } } },
];

async function executar(tenant: string, nome: string, a: Record<string, any>): Promise<unknown> {
  const hoje = hojeSP();
  switch (nome) {
    case "resumo_periodo": {
      const de = data(a.de, hoje.slice(0, 8) + "01"), ate = data(a.ate, hoje);
      return { periodo: { de, ate }, ...(await consulta(tenant, `select
        count(*) filter (where realizada) as os_realizadas,
        coalesce(sum(valor_final) filter (where realizada),0) as faturamento_realizado,
        round(coalesce(avg(valor_final) filter (where realizada),0),2) as ticket_medio,
        count(distinct cliente) filter (where realizada) as clientes_distintos,
        coalesce(sum(desconto) filter (where realizada),0) as descontos,
        count(*) filter (where em_andamento) as os_em_andamento,
        coalesce(sum(valor_final) filter (where em_andamento),0) as valor_em_andamento,
        count(*) filter (where status = 'recusado') as recusadas
        from lumi.v_os where data between '${de}' and '${ate}'`) as object) };
    }
    case "comparativo_mes": {
      const ref = data(a.mes, hoje);
      const ini = ref.slice(0, 8) + "01";
      const mesmoMes = ref.slice(0, 7) === hoje.slice(0, 7);
      const fimMes = somaDias(somaDias(ini, 32).slice(0, 8) + "01", -1);
      const fim = mesmoMes ? hoje : fimMes;
      const dias = Number(fim.slice(8, 10));
      const iniAnt = somaDias(ini, -1).slice(0, 8) + "01";
      const fimAntMes = somaDias(ini, -1);
      const fimAnt = mesmoMes ? (Number(fimAntMes.slice(8, 10)) < dias ? fimAntMes : iniAnt.slice(0, 8) + String(dias).padStart(2, "0")) : fimAntMes;
      const q = (d1: string, d2: string) => consulta(tenant, `select
        count(*) filter (where realizada) as os_realizadas,
        coalesce(sum(valor_final) filter (where realizada),0) as faturamento_realizado,
        round(coalesce(avg(valor_final) filter (where realizada),0),2) as ticket_medio,
        count(distinct cliente) filter (where realizada) as clientes_distintos
        from lumi.v_os where data between '${d1}' and '${d2}'`);
      return {
        comparacao: mesmoMes ? `dia 1 a ${dias} dos dois meses (mês em curso)` : "meses inteiros",
        atual: { de: ini, ate: fim, ...(await q(ini, fim) as object) },
        anterior: { de: iniAnt, ate: fimAnt, ...(await q(iniAnt, fimAnt) as object) },
      };
    }
    case "os_em_andamento":
      return await consulta(tenant, `select os, data, status, cliente, modelo, placa, valor_final, hora_saida_prevista
        from lumi.v_os where em_andamento order by data, os limit 50`);
    case "servicos_mais_vendidos": {
      const de = data(a.de, hoje.slice(0, 8) + "01"), ate = data(a.ate, hoje);
      return await consulta(tenant, `select servico, count(*) as vezes, sum(preco) as valor
        from lumi.v_os_servicos where realizada and data between '${de}' and '${ate}'
        group by servico order by valor desc limit 20`);
    }
    case "clientes_sem_voltar": {
      const dias = Math.max(1, Math.min(3650, Number(a.dias) || 60));
      return await consulta(tenant, `select cliente, cidade, ultima_visita, dias_sem_voltar, servicos_realizados, total_gasto
        from lumi.v_clientes where dias_sem_voltar >= ${dias} order by total_gasto desc limit 30`);
    }
    case "whatsapp_sem_resposta":
      return await consulta(tenant, `with ult as (
          select distinct on (numero) numero, contato, tipo, mensagem, quando
          from lumi.v_whatsapp order by numero, quando desc)
        select contato, numero, quando, mensagem from ult where tipo = 'recebida' order by quando desc limit 30`);
    case "whatsapp_movimento": {
      const de = data(a.de, somaDias(hoje, -6)), ate = data(a.ate, hoje);
      return await consulta(tenant, `select dia,
          count(*) filter (where tipo='recebida') as recebidas,
          count(*) filter (where tipo='enviada') as enviadas,
          count(distinct numero) filter (where tipo='recebida') as contatos_que_escreveram
        from lumi.v_whatsapp where dia between '${de}' and '${ate}' group by dia order by dia`);
    }
    case "orcamentos_abertos":
      return await consulta(tenant, `select orcamento, criado_em, validade, status, cliente, modelo, valor_total
        from lumi.v_orcamentos where not virou_os and coalesce(status,'') not in ('recusado','aprovado')
        order by criado_em desc limit 30`);
    case "consultar_dados":
      return await consulta(tenant, String(a.sql ?? ""));
    default:
      return { erro: "ferramenta desconhecida" };
  }
}

// ------------------------------------------------------------------ prompt
const PROMPT = `Você é a Lumi, assistente de negócios do Alex, dono do Studio RPM —
estética automotiva (lavação, polimento, vitrificação, higienização e afins).
Você conversa com ele dentro do sistema da loja. Ele quer entender o próprio negócio.

=== A REGRA QUE VALE ACIMA DE TUDO ===
VOCÊ NÃO INVENTA NÚMERO. Todo número que você falar tem que ter vindo de uma
ferramenta chamada nesta conversa. Se não chamou, não sabe. Não estime, não
arredonde de cabeça, não deduza de conversa antiga.
Se a pergunta não couber nas ferramentas prontas, monte a consulta com
consultar_dados. Desistir cedo é tão ruim quanto inventar.
Se o dado não existe no sistema (ex.: custos, estoque, agenda futura), diga isso
com clareza em vez de chutar.

=== REALIZADO NÃO É EM ANDAMENTO ===
realizado   = OS finalizada ou entregue. É dinheiro de serviço feito.
em andamento = OS aguardando, aceita ou em atendimento. Ainda pode mudar.
Ao falar de faturamento, use o REALIZADO. Fale do em andamento separado,
dizendo que é em andamento. Nunca some os dois e chame de faturamento.

=== CLIENTE NÃO É OS ===
O mesmo cliente pode trazer dois carros ou voltar no mês. "Quantos clientes" é
clientes distintos; "quantos serviços/OS" é OS. Diga qual é qual.

=== COMPARAÇÃO ===
"Como está o mês" se responde comparando com o MESMO número de dias do mês
anterior (comparativo_mes faz isso). Diga que a comparação é essa.

=== O SISTEMA AINDA É NOVO ===
A loja começou a lançar OS no sistema em novembro de 2026. Se os números forem
pequenos ou zerados, diga isso de forma natural ("ainda tem pouca OS lançada")
em vez de tirar conclusão de amostra pequena.

=== INFORMAR, NÃO DECIDIR ===
Mostre o número e a leitura dele. A decisão é dele. Se ele pedir sua opinião,
pode dar, deixando claro que é leitura sua e em que número se baseou.

=== COMO RESPONDER ===
Converse, em português do Brasil, direto. Comece pelo número que responde a
pergunta, depois no máximo duas linhas do que ele significa. Se notar algo que
ele não perguntou mas muda a leitura, fale em uma linha.
Reais no formato brasileiro: R$ 2.420,00. Sem jargão.
Pode usar **negrito** e listas com "- ". No máximo 8 linhas.
Nunca mostre SQL, nome de visão ou nome de ferramenta para ele.

=== CONVERSA ===
Responda SÓ a última pergunta. As mensagens anteriores são contexto (para
entender "e no mês passado?" ou "e desses, quem gastou mais?"); nunca repita
uma resposta anterior.

=== DATAS ===
Hoje é {{HOJE}}. "Esse mês", "semana passada" etc. se resolvem a partir daí.
Ao chamar ferramenta, mande datas AAAA-MM-DD.`;

// ------------------------------------------------------------------ IA
async function chaveIA(): Promise<string> {
  const { data: k } = await db.rpc("lumi_chave_ia");
  return String(k ?? "");
}

async function askAI(chave: string, mensagens: any[], comFerramentas: boolean) {
  let ultimo = "sem detalhe";
  for (const modelo of MODELOS) {
    try {
      const corpo: Record<string, unknown> = { model: modelo, temperature: 0.2, max_tokens: 900, messages: mensagens };
      if (comFerramentas) { corpo.tools = FERRAMENTAS; corpo.tool_choice = "auto"; }
      const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json" },
        body: JSON.stringify(corpo),
      });
      const d = await r.json();
      if (d?.error) {
        const m = String(d.error.message ?? "");
        ultimo = `${modelo}: ${m.slice(0, 120)}`;
        // Limite por minuto do Groq (conta compartilhada com a Lumi da Jessica):
        // espera o tempo que ele pede, até 12s, e tenta o mesmo modelo de novo.
        const espera = m.match(/try again in ([\d.]+)s/i);
        if (/rate limit/i.test(m) && espera && Number(espera[1]) <= 12) {
          await new Promise((ok) => setTimeout(ok, Number(espera[1]) * 1000 + 300));
          const r2 = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json" },
            body: JSON.stringify(corpo),
          });
          const d2 = await r2.json();
          const msg2 = d2?.choices?.[0]?.message;
          if (msg2) return { msg: msg2, erro: null as string | null };
          if (d2?.error) ultimo = `${modelo}: ${String(d2.error.message ?? "").slice(0, 120)}`;
        }
        continue;
      }
      const msg = d?.choices?.[0]?.message;
      if (msg) return { msg, erro: null as string | null };
      ultimo = `${modelo}: resposta vazia`;
    } catch (e) { ultimo = `${modelo}: ${String(e).slice(0, 120)}`; }
  }
  return { msg: null, erro: ultimo };
}

// ------------------------------------------------------------------ handler
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ erro: "use POST" }, 405);

  // Quem é e se é dono — pelo login, nunca pelo corpo do pedido.
  const jwt = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: u } = await db.auth.getUser(jwt);
  if (!u?.user) return json({ erro: "nao_autorizado" }, 401);
  const { data: perfil } = await db.from("profiles").select("tenant_id, role, nome").eq("id", u.user.id).single();
  if (!perfil?.tenant_id || perfil.role !== "owner") return json({ erro: "so_dono" }, 403);
  const tenant = perfil.tenant_id as string;

  let corpo: any = {};
  try { corpo = await req.json(); } catch { /* vazio */ }

  if (corpo?.acao === "historico") {
    const { data: h } = await db.from("lumi_conversas").select("role, conteudo, criado_em")
      .eq("user_id", u.user.id).order("criado_em", { ascending: false }).limit(30);
    return json({ mensagens: (h ?? []).reverse() });
  }
  if (corpo?.acao === "limpar") {
    await db.from("lumi_conversas").delete().eq("user_id", u.user.id);
    return json({ ok: true });
  }

  const pergunta = String(corpo?.pergunta ?? "").trim().slice(0, 1500);
  if (!pergunta) return json({ erro: "faltou a pergunta" }, 400);

  const chave = await chaveIA();
  if (!chave) return json({ erro: "ia_sem_chave" }, 500);

  const hoje = new Date().toLocaleDateString("pt-BR", {
    weekday: "long", day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Sao_Paulo" });

  const { data: hist } = await db.from("lumi_conversas").select("role, conteudo")
    .eq("user_id", u.user.id).order("criado_em", { ascending: false }).limit(MAX_HIST);

  const mensagens: any[] = [
    { role: "system", content: PROMPT.replace("{{HOJE}}", hoje) },
    ...((hist ?? []).reverse().map((m: any) => ({ role: m.role, content: String(m.conteudo).slice(0, 800) }))),
    { role: "user", content: pergunta },
  ];

  // Até 4 rodadas de ferramenta e uma volta final sem ferramenta
  // (lição da Lumi da Jessica: sem ela o modelo às vezes termina querendo chamar mais uma).
  const chamadas: string[] = [];
  let resposta: any = null, erroIA: string | null = null, aindaQuer = false;
  for (let volta = 0; volta < 4; volta++) {
    const r = await askAI(chave, mensagens, true);
    resposta = r.msg; erroIA = r.erro;
    if (!resposta) break;
    const tools = resposta.tool_calls ?? [];
    if (!tools.length) { aindaQuer = false; break; }
    aindaQuer = true;
    mensagens.push(resposta);
    for (const t of tools) {
      let args: Record<string, any> = {};
      try { args = JSON.parse(t.function?.arguments ?? "{}"); } catch { /* vazio */ }
      chamadas.push(t.function?.name);
      const saida = await executar(tenant, t.function?.name, args);
      mensagens.push({ role: "tool", tool_call_id: t.id, name: t.function?.name,
        content: JSON.stringify(saida).slice(0, 6000) });
    }
  }
  if (aindaQuer || !(resposta?.content ?? "").trim()) {
    const r = await askAI(chave, mensagens, false);
    if (r.msg) resposta = r.msg; else erroIA = r.erro;
  }

  const final = (resposta?.content ?? "").trim()
    || "Não consegui puxar esse número agora. Tenta de novo em instantes?";

  await db.from("lumi_conversas").insert([
    { tenant_id: tenant, user_id: u.user.id, role: "user", conteudo: pergunta },
    { tenant_id: tenant, user_id: u.user.id, role: "assistant", conteudo: final },
  ]);

  return json({ resposta: final, ferramentas: chamadas, erro_ia: erroIA });
});
