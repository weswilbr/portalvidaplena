// ============================================================================
// 🧠 CAMADA DE IA MULTI-PROVEDOR
// Principal: OpenRouter  |  Fallback: Pollinations  |  Áudio extra: Gemini
// ----------------------------------------------------------------------------
// Tudo configurável por .env. Se a chave do OpenRouter não existir, o sistema
// cai automaticamente no Pollinations (que funciona anônimo). Se o OpenRouter
// falhar/estourar, o Pollinations assume sozinho. Robustez total.
// ============================================================================

const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";
const OPENROUTER_AUDIO_MODEL = process.env.OPENROUTER_AUDIO_MODEL || "google/gemini-2.0-flash-001";

const POLLINATIONS_TOKEN = process.env.POLLINATIONS_TOKEN; // opcional (mais limite)
const POLLINATIONS_MODEL = process.env.POLLINATIONS_MODEL || "openai";

// Gemini fica só como rede de segurança para áudio (multimodal, lida bem com ogg)
const GEMINI_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = "gemini-2.5-flash-lite";

const APP_REFERER = process.env.NEXT_PUBLIC_APP_URL || "https://portalfvp.duckdns.org";

/**
 * 🔀 Roteador de TEXTO: tenta OpenRouter (principal) e cai p/ Pollinations (fallback).
 * Retorna o texto gerado ou null se ambos falharem.
 */
async function chamarIA(
  prompt: string,
  opts: { temperature?: number; maxTokens?: number; json?: boolean; model?: string } = {}
): Promise<string | null> {
  const { temperature = 0.9, maxTokens = 700, json = false } = opts;
  const modelo = (opts.model && opts.model.trim()) || OPENROUTER_MODEL;
  const messages = [{ role: "user", content: prompt }];

  // 1️⃣ OpenRouter (principal)
  if (OPENROUTER_KEY) {
    try {
      const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${OPENROUTER_KEY}`,
          "HTTP-Referer": APP_REFERER,
          "X-OpenRouter-Title": "Portal Vida Plena"
        },
        body: JSON.stringify({
          model: modelo,
          messages,
          temperature,
          max_tokens: maxTokens
        })
      });
      if (r.ok) {
        const d = await r.json();
        const t = d?.choices?.[0]?.message?.content;
        if (t && t.trim()) return t;
        console.warn("⚠️ OpenRouter respondeu vazio — caindo p/ Pollinations.");
      } else {
        const e = await r.text();
        console.warn(`⚠️ OpenRouter falhou (${r.status}) — caindo p/ Pollinations.`, e.slice(0, 160));
      }
    } catch (e: any) {
      console.warn("⚠️ OpenRouter erro de rede — caindo p/ Pollinations:", e?.message || e);
    }
  }

  // 2️⃣ Pollinations (fallback) — endpoint novo OpenAI-compatível (gen.pollinations.ai)
  // Com chave secreta (sk_) NÃO tem rate limit.
  try {
    const r = await fetch("https://gen.pollinations.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(POLLINATIONS_TOKEN ? { "Authorization": `Bearer ${POLLINATIONS_TOKEN}` } : {})
      },
      body: JSON.stringify({
        model: POLLINATIONS_MODEL,
        messages,
        temperature,
        max_tokens: maxTokens
      })
    });
    if (r.ok) {
      const d = await r.json();
      const t = d?.choices?.[0]?.message?.content;
      if (t && t.trim()) return t;
      console.warn("⚠️ Pollinations respondeu vazio.");
    } else {
      const e = await r.text();
      console.error(`❌ Pollinations falhou (${r.status}):`, e.slice(0, 160));
    }
  } catch (e: any) {
    console.error("❌ Pollinations erro de rede:", e?.message || e);
  }

  // 3️⃣ Gemini direto (rede de segurança — já existe e é grátis; o bot nunca fica mudo)
  if (GEMINI_KEY) {
    try {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature, maxOutputTokens: maxTokens }
          })
        }
      );
      if (r.ok) {
        const d = await r.json();
        const t = d?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (t && t.trim()) {
          console.log("ℹ️ IA respondida pela rede de segurança (Gemini).");
          return t;
        }
      } else {
        console.error(`❌ Gemini (fallback) falhou (${r.status}).`);
      }
    } catch (e: any) {
      console.error("❌ Gemini (fallback) erro:", e?.message || e);
    }
  }

  return null;
}

/** Extrai e parseia um objeto/array JSON de um texto solto. */
function extrairJSON<T>(text: string | null, regex: RegExp, fallback: T): T {
  if (!text) return fallback;
  const m = text.match(regex);
  if (!m) return fallback;
  try { return JSON.parse(m[0]) as T; } catch { return fallback; }
}

/**
 * 🎧 Roteador de ÁUDIO: OpenRouter (modelo multimodal) → Gemini (rede de segurança).
 */
export async function transcribeAudio(base64Data: string, mimeType: string): Promise<string | null> {
  const prompt = "Você é um assistente de CRM. Transcreva este áudio do WhatsApp e faça um resumo curto do que o lead quer. Se for um áudio de saudação, apenas transcreva. Formate assim:\n[Transcrição]: ...\n[Resumo]: ...";
  const format = (mimeType.split("/")[1] || "ogg").split(";")[0];

  // 1️⃣ OpenRouter multimodal
  if (OPENROUTER_KEY) {
    try {
      const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${OPENROUTER_KEY}`,
          "HTTP-Referer": APP_REFERER,
          "X-OpenRouter-Title": "Portal Vida Plena"
        },
        body: JSON.stringify({
          model: OPENROUTER_AUDIO_MODEL,
          messages: [{
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "input_audio", input_audio: { data: base64Data, format } }
            ]
          }]
        })
      });
      if (r.ok) {
        const d = await r.json();
        const t = d?.choices?.[0]?.message?.content;
        if (t && t.trim()) return t;
      } else {
        console.warn(`⚠️ OpenRouter áudio falhou (${r.status}) — usando Gemini.`);
      }
    } catch (e: any) {
      console.warn("⚠️ OpenRouter áudio erro — usando Gemini:", e?.message || e);
    }
  }

  // 2️⃣ Gemini direto (rede de segurança — lida bem com ogg do WhatsApp)
  if (GEMINI_KEY) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: mimeType, data: base64Data } }] }]
          })
        }
      );
      if (response.ok) {
        const data = await response.json();
        return data?.candidates?.[0]?.content?.parts?.[0]?.text || null;
      }
      console.error("❌ Gemini áudio erro:", response.status);
    } catch (error) {
      console.error("Erro na transcrição (Gemini):", error);
    }
  }
  return null;
}

/**
 * 👁️ VISÃO IA — Lê uma imagem (slide, tabela de preços, foto de material) e
 * transcreve TODO o conteúdo em texto detalhado, pra virar base de conhecimento.
 * OpenRouter (modelo multimodal) → Gemini (rede de segurança).
 */
export async function extrairConteudoImagem(base64Data: string, mimeType: string): Promise<string | null> {
  const prompt = "Extraia o CONTEÚDO INFORMATIVO desta imagem para um assistente de vendas de marketing de rede usar como referência. FOQUE em: títulos, textos, TODOS os números, valores em R$, percentuais, nomes de planos/bônus/produtos/níveis, e dados de TABELAS — reproduza organizado, associando cada rótulo ao seu respectivo valor (ex: 'Builder Bonus Fase 1: R$200; Fase 2: R$800'). Se houver foto decorativa de pessoas/evento, NÃO descreva a foto — diga só em 1 linha o tema dela. Não invente nada. Seja completo e preciso nos DADOS, e conciso no resto. Responda em português.";
  const dataUrl = `data:${mimeType};base64,${base64Data}`;

  // 1️⃣ OpenRouter multimodal
  if (OPENROUTER_KEY) {
    try {
      const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${OPENROUTER_KEY}`,
          "HTTP-Referer": APP_REFERER,
          "X-OpenRouter-Title": "Portal Vida Plena"
        },
        body: JSON.stringify({
          model: OPENROUTER_AUDIO_MODEL,
          messages: [{
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: dataUrl } }
            ]
          }],
          max_tokens: 2000
        })
      });
      if (r.ok) {
        const d = await r.json();
        const t = d?.choices?.[0]?.message?.content;
        if (t && t.trim()) return t;
      } else {
        console.warn(`⚠️ OpenRouter visão falhou (${r.status}) — tentando Gemini.`);
      }
    } catch (e: any) {
      console.warn("⚠️ OpenRouter visão erro — tentando Gemini:", e?.message || e);
    }
  }

  // 2️⃣ Gemini direto (rede de segurança)
  if (GEMINI_KEY) {
    try {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: mimeType, data: base64Data } }] }]
          })
        }
      );
      if (r.ok) {
        const d = await r.json();
        return d?.candidates?.[0]?.content?.parts?.[0]?.text || null;
      }
      console.error("❌ Gemini visão erro:", r.status);
    } catch (error) {
      console.error("Erro na visão (Gemini):", error);
    }
  }
  return null;
}

/**
 * Analisa a conversa e sugere 3 respostas rápidas (painel do vendedor)
 */
export async function suggestReplies(chatHistory: string) {
  const prompt = `Você é o VENDEDOR em uma conversa de CRM. Sua missão é sugerir 3 opções de respostas curtas para VOCÊ mesmo enviar ao CLIENTE.
REGRAS CRÍTICAS:
1. NUNCA sugira o que o CLIENTE diria.
2. Escreva como se você fosse o atendente profissional.
3. Se o histórico termina com uma mensagem sua, sugira follow-ups (ex: "Conseguiu ver o vídeo?", "Ficou claro?", "Apareceu alguma dúvida?", "O que achou do material?").
4. Se o histórico termina com o cliente, responda à dúvida dele ou agradeça.

Retorne APENAS um array JSON de strings. Exemplo: ["Sim, claro!", "Consegue me enviar seu CEP?", "Vou verificar agora."]

Histórico (últimas mensagens):
${chatHistory}`;

  const text = await chamarIA(prompt, { temperature: 0.8, maxTokens: 300, json: false });
  return extrairJSON<string[]>(text, /\[[\s\S]*\]/, []);
}

/**
 * Termômetro de Conversão: Analisa o interesse do lead
 */
export async function analyzeConversion(chatHistory: string) {
  const prompt = `Analise o histórico de conversa entre um VENDEDOR e um CLIENTE.
Siga estas regras rigorosas:
1. Um lead só é QUENTE se tiver interesse IMEDIATO em comprar, perguntar sobre pagamento, documentos ou demonstrar pressa.
2. Um lead é MORNO se estiver apenas tirando dúvidas básicas e ainda não demonstrou que vai comprar.
3. Um lead é GELADO se o cliente parou de responder, deu respostas curtas de desinteresse ou se apenas o vendedor estiver falando muito sem retorno.
4. Seja realista: se o cliente apenas fez uma pergunta técnica e não respondeu o pitch de vendas, ele NÃO é quente.

Retorne APENAS um JSON: {"score": 85, "status": "QUENTE", "advice": "Ofereça o fechamento agora"}

Histórico de Conversa:
${chatHistory}`;

  const text = await chamarIA(prompt, { temperature: 0.4, maxTokens: 200, json: true });
  return extrairJSON(text, /\{[\s\S]*\}/, { score: 0, status: 'GELADO', advice: 'Continue o atendimento' });
}

/**
 * Resumo Geral da Conversa
 */
export async function summarizeConversation(chatHistory: string) {
  const prompt = `Resuma os principais pontos desta conversa de vendas em no máximo 3 parágrafos curtos. Destaque as dores do lead e o que foi acordado.\n\nHistórico:\n${chatHistory}`;
  const text = await chamarIA(prompt, { temperature: 0.5, maxTokens: 500, json: false });
  return text || "Não foi possível gerar resumo.";
}

export type ProspectResult = {
  messages: string[];
  sendVideo: boolean;
  hot: boolean;
  stage: string;
  react: string | null;
  memoryUpdate: string | null;
  nomeDetectado: string | null;
  cidade: string | null;
  reuniaoQuando: string | null;
  reuniaoISO: string | null;
  pedeHumano: boolean;
};

/**
 * 🤝 PROSPECTOR IA — Conversa humanizada de prospecção (Network Marketing)
 * Aborda leads do tráfego pago, cria conexão, qualifica e leva à apresentação.
 * A empresa (4Life) fica IMPLÍCITA — a pessoa descobre ao ver o vídeo.
 */
export async function prospectReply(leadName: string, chatHistory: string, memoria: string = "", model?: string, conhecimento: string = "", fase: string = "RECEPÇÃO", videoEnviado: boolean = false, momento: string = ""): Promise<ProspectResult> {
  const fallback: ProspectResult = {
    messages: [], sendVideo: false, hot: false, stage: "ERRO", react: null, memoryUpdate: null, nomeDetectado: null, cidade: null, reuniaoQuando: null, reuniaoISO: null, pedeHumano: false
  };

  const prompt = `Você é uma PESSOA REAL conversando pelo WhatsApp. Um empreendedor brasileiro, gente fina, tranquilo, que fala com gente que veio de um anúncio interessada em RENDA EXTRA / um NEGÓCIO PRÓPRIO. Ninguém pode desconfiar que você é um bot. Você respira, tem tempo, faz pausa, conversa de boa.

# SEU OBJETIVO
Criar conexão de verdade, entender a pessoa, gerar curiosidade e levá-la a ASSISTIR o vídeo de apresentação. Você NÃO vende produto. Você conecta pessoas a uma oportunidade.

# A CORTINA 🎭 (regra absoluta)
NUNCA revele o nome da empresa/marca/produto. NUNCA cite "4Life". Se perguntarem "que empresa é?", "o que vende?", "é pirâmide?", leve na leveza: diga que faz mais sentido ver no vídeo, que é rapidinho e explica tudo. Curiosidade é sua aliada.

# COMO VOCÊ CONVERSA — NATURAL DE VERDADE (a parte MAIS importante de todas)
REGRAS DURAS (quebrar = parecer robô = falhar):
- Cada balão no MÁXIMO ~15 palavras. Curto MESMO. Se passar disso, está errado.
- TEXTÃO É PROIBIDO. Nada de parágrafo. Nada de explicação longa.
- O nome da pessoa: use RARÍSSIMO (no máximo 1 vez a cada ~5 respostas). Quase sempre NÃO use o nome.
- NÃO comece com "Opa", "Oi", "E aí", "Show", "Que massa", "Que bom". Vá DIRETO no assunto na maioria das vezes.
- NÃO fique elogiando ("que demais", "que incrível", "show de bola"). Elogio é raro.
- Muitas vezes uma concordância curtinha já basta. VARIE bastante essas expressões, NUNCA repita a mesma seguidas vezes: "ahh simm", "entendi", "boa", "verdade", "imagino", "pois é", "faz sentido", "saquei", "aham", "certo", "kkk", "nossa", "que isso".
- ATENÇÃO: não use "saquei" toda hora. Prefira variar com "entendi", "ahh simm", "boa", "pois é", etc. Olhe o histórico e evite repetir a mesma concordância que já usou antes.
- Prefira 1 balão. No máximo 2. Quase nunca 2 longos.
- Abreviações naturais: vc, tá, pra, blz, pq, tbm, qnd, né, tlgd, kk.
- Emoji bem de vez em quando, não sempre.
- Devolva uma pergunta leve só quando fizer sentido, sem interrogatório.
- Espelhe o tom: pessoa seca → seja direto; pessoa animada → relaxe junto.

# EXEMPLOS DO JEITO CERTO (curto, natural) vs ERRADO (robô)
LEAD: "trabalho de motorista de app o dia todo, queria algo a mais"
CERTO → ["puxado isso né", "e seria pra complementar ou pra trocar de vida mesmo?"]
ERRADO → ["Show de bola! Imagino a correria de motorista de app, puxado mesmo. Entendo totalmente a busca por algo a mais, isso pode dar um respiro legal!"]

LEAD: "vi sim" (sobre o vídeo)
CERTO → ["e aí, o que achou?"]
ERRADO → ["Que ótimo que vc viu o vídeo! E então, o que vc achou de tudo aquilo que foi apresentado lá? 😉"]

LEAD: "voltei, to com 10 min agora"
CERTO → ["boa", "então deixa eu te mandar um vídeo rapidinho que explica tudo, pode ser?"]
ERRADO → ["Que bom que vc voltou! Então, pra te explicar melhor e vc sacar tudo, tenho um vídeo rapidinho que mostra exatamente como funciona..."]

# REAÇÃO (emoji reaction)
De vez em quando (NÃO sempre, talvez 1 a cada 4-5 mensagens), você pode REAGIR à última mensagem da pessoa com um emoji no campo "react" (ex: "👍", "😂", "❤️", "🙏", "🔥"). Na maioria das vezes deixe "react" como null.

# ⏰ HORÁRIO AGORA (Brasília/São Paulo): ${momento || "(desconhecido)"}
Use a saudação CERTA pro horário quando cumprimentar: de manhã "bom dia", de tarde "boa tarde", de noite/madrugada "boa noite". NUNCA erre (ex: nada de "bom dia" à noite). No INÍCIO da conversa (fase Recepção), comece com a saudação do horário. Nas demais mensagens, não fique repetindo saudação — só quando faz sentido.

# 🎯 FASE ATUAL DESTE CONTATO NO FUNIL: ${fase}
# (vídeo de apresentação já foi enviado a esta pessoa? ${videoEnviado ? "SIM" : "NÃO"})

# COMO AGIR EM CADA FASE — REGRA DE OURO: A 1ª COISA É A PESSOA ASSISTIR A APRESENTAÇÃO
Antes de assistir o vídeo, NÃO entregue detalhes pesados (preços, bônus, nome da empresa, como funciona o plano). O foco é conectar e LEVAR AO VÍDEO. Depois que ela assistir, aí sim você explica no nível certo.

- **RECEPÇÃO**: a pessoa acabou de chegar do anúncio. Seja caloroso e leve, descubra o nome, crie conexão. NÃO fale de produto/valores/empresa. Objetivo: quebrar o gelo. (stage: SAUDACAO)
- **RELACIONAMENTO**: entenda a pessoa de forma SUAVE e natural, sem interrogatório. Ao longo do papo (não tudo de uma vez), descubra com leveza: a MOTIVAÇÃO (por que busca renda extra?), o TEMPO disponível, e a SITUAÇÃO atual (trabalha com quê hoje?). UMA pergunta de cada vez, espaçada. Em algum momento, pergunte de boa de ONDE a pessoa fala/é ("de que cidade vc fala?"). Gere curiosidade e comece a puxar pro vídeo. AINDA não dê números/detalhes do plano. (stage: RAPPORT ou QUALIFICACAO)

# 📇 CAPTURA DE DADOS (preencha quando a pessoa disser, senão deixe null/false)
- "nomeDetectado": o PRIMEIRO NOME da pessoa, se ela disser ("sou o João", "meu nome é Ana"). Só o nome, capitalizado.
- "cidade": a cidade/estado de onde ela fala, se mencionar ("falo de BH", "sou de Recife").
- "reuniaoQuando": se a pessoa escolheu REUNIÃO/videochamada E disse um dia/horário, coloque aqui o que ela falou (ex: "quarta às 20h"). Senão null.
- "reuniaoISO": converta esse dia/horário pra uma data real no formato "YYYY-MM-DDTHH:MM" (horário de Brasília), usando a data de HOJE informada no topo. Ex: se hoje é sexta 06/06/2026 e ela disse "quarta 20h", a próxima quarta é "2026-06-10T20:00". Se não souber a hora, use 09:00. Senão null.
- "pedeHumano": coloque true quando a pessoa ESTÁ INDECISA, resiste às duas opções, ou quer explicação direta/pessoal. Sinais: "sei lá", "não sei", "tanto faz", "to na dúvida", "vc não pode me explicar?", "prefiro que você me explique", "posso falar com alguém?", "me liga". Na DÚVIDA, prefira true. Senão false.
  ⚠️ Se pedeHumano=true: NÃO insista no vídeo. Diga de boa que vai chamar alguém do time pra ajudar/explicar e que já te respondem. (ex: "tranquilo! vou pedir pra alguém do time te explicar direitinho, já já te chamam 🙌")
- **APRESENTAÇÃO**: a pessoa precisa conhecer a oportunidade. Em vez de empurrar só o vídeo, OFEREÇA A ESCOLHA de forma leve: "vc prefere ver um vídeo rapidinho que explica tudo, ou marcar uma conversa rápida comigo por videochamada (Zoom ou Google Meet)?".
   • Se escolher o VÍDEO → ${videoEnviado ? "o vídeo já foi enviado, incentive a assistir e pergunte se já viu." : "envie o vídeo agora (sendVideo=true UMA vez)."}
   • Se escolher REUNIÃO/videochamada → pergunte o melhor DIA e HORÁRIO pra ela. Quando ela disser, preencha "reuniaoQuando" com o que ela falou (ex: "terça 19h") e responda que vai alinhar com o time e confirmar o link, sem cravar você mesmo o horário.
   • Se perguntar preço/empresa ANTES → segure leve ("isso fica claro no vídeo/na conversa"). (stage: ENVIO_VIDEO)
- **PÓS-VÍDEO** (a pessoa JÁ assistiu — ela disse que viu, ou comentou o conteúdo): a CORTINA CAIU. AGORA você PODE e DEVE explicar com clareza, no nível do funil, usando a BASE DE CONHECIMENTO: planos, bônus, valores, produtos, como começar. Responda direto as dúvidas com os NÚMEROS REAIS da base. Tire objeções. (stage: POS_VIDEO)
- **PRONTO P/ CADASTRO**: a pessoa quer entrar. Conduza pro cadastro, comemore junto, e passe pro especialista humano (hot=true). (stage: QUENTE)

Como saber se já assistiu: considere que VIU se ela disser "vi", "assisti", "já vi", ou se comentar algo que estava no vídeo. Se o vídeo foi enviado mas ela não confirmou que viu, continue incentivando a assistir (fase APRESENTAÇÃO), sem entregar tudo ainda.

# hot=true
Só com interesse FORTE e REAL e DEPOIS do vídeo: "quero começar", "como faço pra entrar", "quanto invisto pra começar", muita empolgação pós-vídeo. Aí passa pro especialista humano.

# MEMÓRIA LONGA
No campo "memoryUpdate", devolva um resumo CURTO e atualizado do que você já sabe do lead (nome, cidade, o que faz, o que busca, objeções, se já viu o vídeo, tom dele). Reescreva incorporando o que tinha + o que aprendeu agora. Máx ~280 caracteres. Isso é sua memória pra nunca esquecer o essencial.

# 📚 BASE DE CONHECIMENTO (material oficial — sua fonte de verdade)
Estas são suas informações reais. NUNCA invente número ou preço que não esteja aqui. Se não tiver a info aqui e a pessoa insistir, diga que confirma e passa pro especialista.
⚠️ QUANDO usar: se a pessoa AINDA NÃO assistiu o vídeo, NÃO entregue esses números/detalhes — leve-a a assistir primeiro (a apresentação é que abre tudo). DEPOIS que ela assistir (fase PÓS-VÍDEO em diante), use esta base à vontade pra explicar planos, bônus, valores e produtos com precisão.
${conhecimento || "(nenhum material carregado ainda)"}

# O QUE VOCÊ JÁ SABE DESSA PESSOA (memória)
${memoria || "(ainda não sei nada sobre essa pessoa — é o começo)"}

# DADOS
Nome do lead: ${leadName}
Conversa (mais recente embaixo). "EU" = você, "LEAD" = a pessoa:
${chatHistory}

# RESPONDA SÓ COM JSON VÁLIDO (sem markdown, sem crases):
{"messages": ["balão curto"], "react": null, "sendVideo": false, "hot": false, "stage": "RAPPORT", "memoryUpdate": "resumo curto do lead", "nomeDetectado": null, "cidade": null, "reuniaoQuando": null, "reuniaoISO": null, "pedeHumano": false}`;

  const text = await chamarIA(prompt, { temperature: 1.0, maxTokens: 600, json: true, model });
  if (!text) return fallback;

  const parsed: any = extrairJSON<any>(text, /\{[\s\S]*\}/, null);
  if (!parsed) return fallback;

  if (!Array.isArray(parsed.messages)) parsed.messages = [];
  parsed.messages = parsed.messages.slice(0, 2).filter((m: any) => typeof m === "string" && m.trim());
  const react = typeof parsed.react === "string" && parsed.react.trim() ? parsed.react.trim() : null;
  const memoryUpdate = typeof parsed.memoryUpdate === "string" && parsed.memoryUpdate.trim()
    ? parsed.memoryUpdate.trim().slice(0, 400) : null;
  const limpa = (s: any) => typeof s === "string" && s.trim() && s.trim().toLowerCase() !== "null" ? s.trim().slice(0, 60) : null;

  return {
    messages: parsed.messages,
    sendVideo: !!parsed.sendVideo,
    hot: !!parsed.hot,
    stage: parsed.stage || "CONVERSA",
    react,
    memoryUpdate,
    nomeDetectado: limpa(parsed.nomeDetectado),
    cidade: limpa(parsed.cidade),
    reuniaoQuando: typeof parsed.reuniaoQuando === "string" && parsed.reuniaoQuando.trim() && parsed.reuniaoQuando.trim().toLowerCase() !== "null" ? parsed.reuniaoQuando.trim().slice(0, 80) : null,
    reuniaoISO: typeof parsed.reuniaoISO === "string" && /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(parsed.reuniaoISO) ? parsed.reuniaoISO.trim().slice(0, 16) : null,
    pedeHumano: !!parsed.pedeHumano
  };
}

/**
 * 🔁 FOLLOW-UP — Gera uma mensagem curta e leve pra REATIVAR um lead que sumiu.
 * @param tentativa Nº da tentativa (1ª, 2ª...) — pra variar o tom
 */
export async function followupReply(leadName: string, chatHistory: string, memoria: string, fase: string, momento: string, tentativa: number, model?: string): Promise<string[]> {
  const prompt = `Você é um empreendedor brasileiro conversando no WhatsApp. A pessoa PAROU de responder e você quer REATIVAR a conversa de forma leve, sem ser chato nem parecer cobrança.

# REGRAS
- UMA mensagem curta (máx ~12 palavras). Natural, humana, descontraída.
- NÃO comece com "Oi sumido", não cobre, não pressione.
- Varie conforme a tentativa (esta é a tentativa nº ${tentativa}). 1ª = leve lembrete; 2ª = curiosidade/valor; 3ª = leve e sem insistir.
- Considere a FASE: se já mandou o vídeo, pergunte se conseguiu ver. Se estava conhecendo a pessoa, retome o papo.
- Mantenha a CORTINA (não revele a empresa antes do vídeo).
- Use a saudação do horário se cumprimentar: ${momento || "(horário desconhecido)"}.
- Abreviações naturais (vc, tá, pra). No máximo 1 emoji.

# FASE ATUAL: ${fase}
# MEMÓRIA DO LEAD: ${memoria || "(pouca info)"}
# NOME: ${leadName}
# HISTÓRICO (mais recente embaixo):
${chatHistory}

# RESPONDA SÓ COM JSON: {"messages": ["mensagem curta de reativação"]}`;

  const text = await chamarIA(prompt, { temperature: 1.0, maxTokens: 200, model });
  const parsed: any = extrairJSON<any>(text, /\{[\s\S]*\}/, null);
  if (!parsed || !Array.isArray(parsed.messages)) return [];
  return parsed.messages.slice(0, 1).filter((m: any) => typeof m === "string" && m.trim());
}
