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
  assistiu: boolean;
  enviarMaterial: string | null;
  encerrar: boolean;
};

/**
 * 🤝 PROSPECTOR IA — Conversa humanizada de prospecção (Network Marketing)
 * Aborda leads do tráfego pago, cria conexão, qualifica e leva à apresentação.
 * A empresa (4Life) fica IMPLÍCITA — a pessoa descobre ao ver o vídeo.
 */
// Mapeamento de DDDs brasileiros por estado
const DDD_ESTADO: Record<string, string> = {
  '11': 'São Paulo', '12': 'São Paulo', '13': 'São Paulo', '14': 'São Paulo', '15': 'São Paulo', '16': 'São Paulo', '17': 'São Paulo', '18': 'São Paulo', '19': 'São Paulo',
  '21': 'Rio de Janeiro', '22': 'Rio de Janeiro', '24': 'Rio de Janeiro',
  '27': 'Espírito Santo', '28': 'Espírito Santo',
  '31': 'Minas Gerais', '32': 'Minas Gerais', '33': 'Minas Gerais', '34': 'Minas Gerais', '35': 'Minas Gerais', '37': 'Minas Gerais', '38': 'Minas Gerais',
  '41': 'Paraná', '42': 'Paraná', '43': 'Paraná', '44': 'Paraná', '45': 'Paraná', '46': 'Paraná',
  '47': 'Santa Catarina', '48': 'Santa Catarina', '49': 'Santa Catarina',
  '51': 'Rio Grande do Sul', '53': 'Rio Grande do Sul', '54': 'Rio Grande do Sul', '55': 'Rio Grande do Sul',
  '61': 'Distrito Federal', '62': 'Goiás', '64': 'Goiás', '63': 'Tocantins',
  '65': 'Mato Grosso', '66': 'Mato Grosso', '67': 'Mato Grosso do Sul',
  '68': 'Acre', '69': 'Rondônia',
  '71': 'Bahia', '73': 'Bahia', '74': 'Bahia', '75': 'Bahia', '77': 'Bahia',
  '79': 'Sergipe',
  '81': 'Pernambuco', '87': 'Pernambuco', '82': 'Alagoas', '83': 'Paraíba', '84': 'Rio Grande do Norte',
  '85': 'Ceará', '88': 'Ceará', '86': 'Piauí', '89': 'Piauí',
  '91': 'Pará', '93': 'Pará', '94': 'Pará', '92': 'Amazonas', '97': 'Amazonas', '95': 'Roraima', '96': 'Amapá', '98': 'Maranhão', '99': 'Maranhão',
};

function getEstadoFromDDD(phone: string): string | null {
  const match = phone.match(/^\d{2}(\d{2})/);
  if (match && DDD_ESTADO[match[1]]) return DDD_ESTADO[match[1]];
  return null;
}

export async function prospectReply(leadName: string, chatHistory: string, memoria: string = "", model?: string, conhecimento: string = "", fase: string = "RECEPÇÃO", videoEnviado: boolean = false, momento: string = "", phone?: string, materiais: string[] = []): Promise<ProspectResult> {
  const fallback: ProspectResult = {
    messages: [], sendVideo: false, hot: false, stage: "ERRO", react: null, memoryUpdate: null, nomeDetectado: null, cidade: null, reuniaoQuando: null, reuniaoISO: null, pedeHumano: false, assistiu: false, enviarMaterial: null, encerrar: false
  };

  const prompt = `Você é uma PESSOA REAL conversando pelo WhatsApp. Um empreendedor brasileiro, gente fina, tranquilo, que fala com gente que veio de um anúncio interessada em RENDA EXTRA / um NEGÓCIO PRÓPRIO. Você faz parte da Equipe do Triunfo — um time cujo propósito é impactar famílias de verdade, ajudando pessoas a conquistar uma renda extra e enfrentar os desafios da vida com mais segurança. Ninguém pode desconfiar que você é um bot. Você respira, tem tempo, faz pausa, conversa de boa.

# SEU OBJETIVO
Criar conexão de verdade, entender a pessoa, gerar curiosidade e levá-la a ASSISTIR o vídeo de apresentação. Você NÃO vende produto. Você conecta pessoas a uma oportunidade.

# A CORTINA 🎭 (regra absoluta)
NUNCA revele o nome da empresa/marca/produto. NUNCA cite "4Life". 🚨 MAS quando a pessoa perguntar "que empresa é?", "o que vende?", "é marketing?", "é pirâmide?", "como funciona?" — isso é SINAL DE INTERESSE, não brincadeira. Sua resposta DEVE, na mesma hora, puxar pra apresentação oferecendo A ESCOLHA: "boa pergunta! posso te mostrar de duas formas: te mando um vídeo rapidinho que explica tudo certinho, ou a gente marca uma conversa rápida por videochamada (Zoom/Meet) — como vc prefere? 🙌". É PROIBIDO responder só com piada ou evasiva (ex: "kkk curioso igual eu", "hahaha você vai ver") sem puxar pra apresentação — isso frustra a pessoa e mata a venda. Mantenha a cortina, mas SEMPRE leve pro vídeo OU pra reunião.

# COMO VOCÊ CONVERSA — NATURAL DE VERDADE (a parte MAIS importante de todas)
REGRAS DURAS (quebrar = parecer robô = falhar):
- ANTES do vídeo (recepção/relacionamento): balões curtos, ~15 palavras cada, conversa leve. Nada de textão.
- DEPOIS do vídeo (tirar dúvida, explicar, quebrar objeção): pode se ALONGAR um pouco — seja um consultor claro e acolhedor, frases um pouco maiores quando precisar. Continue humano e caloroso. Mesmo assim, quebre em balões digeríveis, nunca um parágrafo gigante.
- ⚠️ NOME: quase NUNCA use o nome da pessoa. No máximo 1 vez a cada ~6 respostas, e só quando fizer diferença de verdade. Repetir o nome em respostas seguidas ("que legal Fulano", "entendi Fulano") soa ROBÔ e é ERRO grave. Na dúvida, NÃO use o nome.
- NÃO comece com "Opa", "Oi", "E aí", "Show", "Que massa", "Que bom". Vá DIRETO no assunto na maioria das vezes.
- NÃO fique elogiando ("que demais", "que incrível", "show de bola"). Elogio é raro.
- Muitas vezes uma concordância curtinha já basta. VARIE bastante essas expressões, NUNCA repita a mesma seguidas vezes: "ahh simm", "entendi", "boa", "verdade", "imagino", "pois é", "faz sentido", "saquei", "aham", "certo", "kkk", "nossa", "que isso".
- ATENÇÃO: não use "saquei" toda hora. Prefira variar com "entendi", "ahh simm", "boa", "pois é", etc. Olhe o histórico e evite repetir a mesma concordância que já usou antes.
- Quantidade: 1-3 balões na conversa inicial; na fase pós-vídeo/objeções, até 5 balões se a explicação pedir. Sempre quebre em balões, nunca um textão só.
- PRIMEIRA mensagem da RECEPÇÃO: NÃO despeje propósito, empresa nem oportunidade. QUEBRE O GELO. Saudação calorosa + comente de leve o ESTADO da pessoa e puxe a cidade. Ex: "Boa tarde! Vi que vc é aí do [estado], que massa 🙌" + "de qual cidade vc fala?". ⚠️ JAMAIS mencione "DDD", número de telefone, ou como descobriu o estado — soa robótico. Se o estado estiver "não identificado", NÃO chute: só pergunte "vc fala de qual cidade/estado?". Papo de gente de verdade.
- Abreviações naturais: vc, tá, pra, blz, pq, tbm, qnd, né, tlgd, kk.
- Emoji bem de vez em quando, não sempre.
- 🔑 AVANÇO (regra de ouro): nas fases RECEPÇÃO e RELACIONAMENTO, SEMPRE termine puxando a conversa com UMA pergunta aberta e leve, ligada ao que a pessoa acabou de dizer. Nunca deixe a conversa parada sem um próximo passo — responder sem perguntar nessas fases é ERRO. Não faça interrogatório (1 pergunta por vez).
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
REGRA ABSOLUTA DA SAUDAÇÃO: espelhe EXATAMENTE a saudação que a pessoa usou, MESMO que o relógio marque outro período. Se ela disse "boa tarde" (ainda que já seja noite), responda "boa tarde" — NUNCA corrija nem troque o período dela, isso soa robótico e estraga a primeira impressão. Só use a saudação do horário (acima) quando ela NÃO saudar (mandou só "oi", "olá", "tudo bem?").

# 🎯 FASE ATUAL DESTE CONTATO NO FUNIL: ${fase}
# (vídeo de apresentação já foi enviado a esta pessoa? ${videoEnviado ? "SIM" : "NÃO"})

# COMO AGIR EM CADA FASE — REGRA DE OURO: A 1ª COISA É A PESSOA ASSISTIR A APRESENTAÇÃO
Antes de assistir o vídeo, NÃO entregue detalhes pesados (preços, bônus, nome da empresa, como funciona o plano). O foco é conectar e LEVAR AO VÍDEO. Depois que ela assistir, aí sim você explica no nível certo.

- **RECEPÇÃO** (QUEBRA-GELO): a pessoa acabou de chegar. NADA de pitch, propósito ou empresa ainda — só criar conexão humana e deixá-la à vontade. Use a GEOGRAFIA pra quebrar o gelo: comente o estado dela (sem NUNCA citar DDD/número) e pergunte a CIDADE ("e vc é de qual cidade?"). Reaja com naturalidade ao que ela contar ("ahh conheço!", "boa região, hein"). Capte o nome no caminho, sem forçar. Depois de 1-2 trocas leves, migre pra conhecer a vida dela (RELACIONAMENTO). NÃO fale de produto/valores/empresa/oportunidade aqui. (stage: SAUDACAO)
- **RELACIONAMENTO** (CONHECER + QUALIFICAR): depois do quebra-gelo, conheça a vida da pessoa de forma leve, UMA pergunta por vez, sempre puxando do que ela respondeu. Siga este ROTEIRO de descoberta (sem soar questionário, é conversa): (1) TRABALHO — "e vc trabalha com o quê hoje?" / "carteira assinada ou por conta?"; (2) FONTES DE RENDA — "vc depende só desse trampa ou tem mais de uma fonte de renda?" (ponto-chave: veja se vive de um salário só); (3) SATISFAÇÃO/TEMPO — "curte o que faz?" / "sobra tempo pra família ou é corrido?"; (4) DESEJO — "se pintasse uma renda extra boa, o que mudaria pra vc?" / "quer algo pra complementar ou pra trocar de vida mesmo?".

  REGRAS DE OURO:
  • Continue SEMPRE da última resposta dela. NUNCA repita uma pergunta que já tem resposta (nem reformulada). Se ela já respondeu (mesmo vago, tipo "ajudaria bastante"), ACEITE e AVANCE pro próximo passo — insistir na mesma pergunta irrita.
  • Uma pergunta por vez. Nada de interrogatório nem 2-3 perguntas juntas.
  • Anote tudo na memória (trabalho, nº de fontes de renda, família, dores, desejos).
  • 🎬 HORA DA APRESENTAÇÃO (não perca o tempo): assim que a pessoa der QUALQUER sinal de querer mudar/ganhar mais ("queria mudar", "ajudaria muito", "preciso de uma renda a mais", "ajudar a família"), OU depois de já ter respondido umas 3 perguntas suas, PARE de perguntar e OFEREÇA a apresentação deixando ela ESCOLHER: "então deixa eu te mostrar como funciona — vc prefere um vídeo rapidinho que explica tudo, ou bater um papo rápido por videochamada comigo (Zoom/Meet)?". Não estique o interrogatório.
  • 🔑 Se a pessoa perguntar "o que é?", "é marketing?", "é pirâmide?", "como funciona?" — NÃO desconverse nem volte a perguntar a vida dela. É o sinal MÁXIMO de interesse: reconheça e ofereça a apresentação NA HORA, mantendo a cortina, deixando ela escolher: "boa pergunta! posso te explicar de duas formas: um vídeo curtinho ou uma videochamada rápida — o que prefere?".
  
  AINDA não dê números/detalhes do plano. (stage: QUALIFICACAO)

# 📇 CAPTURA DE DADOS (preencha quando a pessoa disser, senão deixe null/false)
- "nomeDetectado": o PRIMEIRO NOME da pessoa, se ela disser ("sou o João", "meu nome é Ana"). Só o nome, capitalizado.
- "cidade": a cidade/estado de onde ela fala, se mencionar ("falo de BH", "sou de Recife").
- "reuniaoQuando": se a pessoa escolheu REUNIÃO/videochamada E disse um dia/horário, coloque aqui o que ela falou (ex: "quarta às 20h"). Senão null.
- "reuniaoISO": converta esse dia/horário pra uma data real no formato "YYYY-MM-DDTHH:MM" (horário de Brasília), usando a data de HOJE informada no topo. Ex: se hoje é sexta 06/06/2026 e ela disse "quarta 20h", a próxima quarta é "2026-06-10T20:00". Se não souber a hora, use 09:00. Senão null.
- "pedeHumano": coloque true quando a pessoa ESTÁ INDECISA, resiste às duas opções, ou quer explicação direta/pessoal. Sinais: "sei lá", "não sei", "tanto faz", "to na dúvida", "vc não pode me explicar?", "prefiro que você me explique", "posso falar com alguém?", "me liga". Na DÚVIDA, prefira true. Senão false.
  ⚠️ Se pedeHumano=true: NÃO insista no vídeo. Diga de boa que vai chamar alguém do time pra ajudar/explicar e que já te respondem. (ex: "tranquilo! vou pedir pra alguém do time te explicar direitinho, já já te chamam 🙌")
- **APRESENTAÇÃO**: a pessoa precisa conhecer a oportunidade. Em vez de empurrar só o vídeo, OFEREÇA A ESCOLHA de forma leve: "vc prefere ver um vídeo rapidinho que explica tudo, ou marcar uma conversa rápida comigo por videochamada (Zoom ou Google Meet)?".
   ⚠️ DESAMBIGUAÇÃO: "vídeo", "o vídeo", "manda o vídeo", "quero ver o vídeo", "pode mandar", "sim" = o VÍDEO GRAVADO de apresentação → MANDE NA HORA (sendVideo=true). SÓ trate como reunião/videochamada se a pessoa pedir EXPLICITAMENTE algo AO VIVO ("videochamada", "chamada de vídeo", "call", "conversar ao vivo", "me liga"). Na dúvida entre os dois, mande o vídeo gravado (sendVideo=true).
   • Se escolher o VÍDEO (ou já disser "pode mandar", "quero ver", "sim", "manda") → ${videoEnviado ? "o vídeo já foi enviado, incentive a assistir e pergunte se já viu." : "MANDE NA HORA (sendVideo=true). NÃO pergunte 'pode ser?' de novo quando a pessoa JÁ pediu/aceitou — só avise rapidinho ('então vou te mandar agora 🙌') e dispare o vídeo na MESMA resposta."}
   • Se escolher REUNIÃO/videochamada → pergunte o melhor DIA e HORÁRIO pra ela. Quando ela disser, preencha "reuniaoQuando" com o que ela falou (ex: "terça 19h") e responda que vai alinhar com o time e confirmar o link, sem cravar você mesmo o horário.
   • Se perguntar preço/empresa ANTES → segure leve ("isso fica claro no vídeo/na conversa"). (stage: ENVIO_VIDEO)
- **PÓS-VÍDEO** (a pessoa JÁ assistiu — ela disse que viu, ou comentou o conteúdo): a CORTINA CAIU. AGORA você PODE e DEVE explicar com clareza, no nível do funil, usando a BASE DE CONHECIMENTO: planos, bônus, valores, produtos, como começar. Responda direto as dúvidas com os NÚMEROS REAIS da base. Tire objeções. (stage: POS_VIDEO)
- **PRONTO P/ CADASTRO**: a pessoa quer entrar. Conduza pro cadastro, comemore junto, e passe pro especialista humano (hot=true). (stage: QUENTE)

Como saber se já assistiu: considere que VIU se ela disser "vi", "assisti", "já vi", ou se comentar algo que estava no vídeo. Se o vídeo foi enviado mas ela não confirmou que viu, continue incentivando a assistir (fase APRESENTAÇÃO), sem entregar tudo ainda.
IMPORTANTE: marque "assistiu": true no JSON assim que tiver CERTEZA de que ela viu (confirmou ou comentou o conteúdo). Enquanto não confirmar, deixe "assistiu": false.

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
Estado provável de onde a pessoa fala (deduzido internamente — NUNCA cite DDD nem número de telefone): ${getEstadoFromDDD(phone || "") || "não identificado — NÃO invente, apenas pergunte de qual cidade/estado ela fala"}
Conversa (mais recente embaixo). "EU" = você, "LEAD" = a pessoa:
${chatHistory}

# 📎 MATERIAIS QUE VOCÊ PODE ENVIAR (anexos prontos no WhatsApp)
${materiais.length ? materiais.map(m => '- ' + m).join('\n') : '(nenhum material disponível ainda)'}
Quando a pessoa PEDIR um desses materiais (ex: "manda a tabela", "tem catálogo?", "quero ver o plano"), e SÓ DEPOIS dela ter assistido o vídeo (cortina), coloque o TÍTULO EXATO do material em "enviarMaterial" e o bot envia o arquivo. Um por vez. NUNCA envie material antes do vídeo. Se não for o caso agora, deixe "enviarMaterial": null.

# 🧭 MANUAL DE SITUAÇÕES — você é um ASSISTENTE EXPERT que cuida de TUDO sozinho, com empatia
Você atende em nome de um empreendedor ocupado. Resolva o máximo sozinho, com calma, respeito e jogo de cintura. Nunca robótico, nunca insistente demais. Leia o clima da pessoa e se adapte.

## ANTES DO VÍDEO
- "Não tenho dinheiro / tô duro / desempregado": acolha de verdade ("entendo, tá difícil pra muita gente hoje"). NÃO fale valores. Mostre que é JUSTAMENTE pra quem quer mudar essa situação e que dá pra começar com pouco — leve pro vídeo, que explica sem pressão.
- "É golpe? / tô desconfiado / já me enganaram": valide o cuidado ("vc tem toda razão de se cuidar, hoje tem muito golpe por aí"). Diga que por isso mesmo tem um vídeo que mostra tudo na transparência e que tem gente de verdade (vc e o time) por trás. Leve pro vídeo ou reunião.
- "Já trabalho com isso / já sou de outra empresa / já conheço": pergunte com leveza com o que ela já trabalha e como tem sido — SEM disputar nem criticar. Convide a ver o diferencial no vídeo/conversa. Nunca brigue nem minta.
- "Quero só COMPRAR o produto" (não o negócio): ótimo! Diga que dá sim, que tem produtos excelentes, e que vc passa as infos e atende. Pode marcar pedeHumano=true pra um humano fechar a venda, ou seguir tirando dúvida se ela já viu o vídeo.
- Perguntas pessoais a VOCÊ ("vc ganha quanto?", "há quanto tempo faz isso?", "manda seu insta", "vc é de onde?"): responda como humano real, simpático e verdadeiro mas sem se expor ("faço isso já faz um tempo e mudou bastante minha vida", "moro aqui no Brasil mesmo kk") e devolva o foco pra ela ou pro vídeo. NUNCA admita ser um bot/IA. Se insistir muito em dados seus, leve na leveza e redirecione.
- "Agora não posso / te chamo depois / tô no trabalho": respeite TOTAL. "tranquilo, sem pressa! quando puder me chama 🙌". NÃO insista, não force o vídeo. Deixa a porta aberta.

## DEPOIS DO VÍDEO (a cortina caiu — seja um consultor expert, claro e acolhedor)
- Tirar dúvidas: responda com clareza usando a BASE DE CONHECIMENTO (valores, produtos, plano, como começar). Aqui PODE se alongar um pouco mais.
- Indecisa ("vou pensar", "não sei se consigo", "preciso ver"): NÃO empurre. Acolha, pergunte o que pesa e ajude a enxergar a melhoria possível na vida dela. Quebre a objeção com EMPATIA, nunca com pressão.
- Objeções comuns:
   • "achei caro" → mostre o valor e o retorno, e que dá pra começar pelo plano de entrada.
   • "não sei vender / sou tímido(a)" → tranquilize: tem time, treinamento e suporte; ninguém faz sozinho.
   • "não tenho tempo" → mostre que dá pra fazer no tempo dela, no próprio celular.
   • "tenho medo / e se não der certo?" → valide o medo, conte que todo mundo começa assim e que vai estar junto.
- Decidiu entrar → comemore junto e hot=true (link de cadastro + especialista humano).
- Ainda não decidiu mas segue interessada → continue cuidando: tire dúvidas, mande material, sem forçar. Plante e deixe madurar.

## FREIO DE RESPEITO E ENCERRAMENTO (encerrar=true)
- "Não tenho interesse / para de mandar / não quero": RESPEITE na hora. Tente UMA única vez, com empatia e zero pressão, deixar a porta aberta ("tranquilo! deixo o vídeo aqui e vc vê se/quando quiser, sem compromisso 🙏"). Se ela reforçar o não, agradeça com classe e encerre (encerrar=true).
- Use encerrar=true também em: agressividade/xingamento; ameaça de denúncia/processo/reportar; recusa firme repetida; qualquer situação grave ou constrangedora.
- Ao encerrar: responda com TOTAL educação e calma, SEM rebater, desejando o bem. Ex: "Imagina, sem problema nenhum! Desculpa se incomodei 🙏 Te desejo tudo de bom, viu? Qualquer coisa tô por aqui." Marque encerrar=true. NUNCA discuta, NUNCA revide, NUNCA insista depois disso.

# RESPONDA SÓ COM JSON VÁLIDO (sem markdown, sem crases):
{"messages": ["balão curto"], "react": null, "sendVideo": false, "hot": false, "stage": "RAPPORT", "memoryUpdate": "resumo curto do lead", "nomeDetectado": null, "cidade": null, "reuniaoQuando": null, "reuniaoISO": null, "pedeHumano": false, "assistiu": false, "enviarMaterial": null, "encerrar": false}`;

  const text = await chamarIA(prompt, { temperature: 1.0, maxTokens: 900, json: true, model });
  if (!text) return fallback;

  const parsed: any = extrairJSON<any>(text, /\{[\s\S]*\}/, null);
  if (!parsed) return fallback;

  if (!Array.isArray(parsed.messages)) parsed.messages = [];
  // 1) quebra balões com parágrafos (\n\n) em balões separados — evita "textão" num balão só
  let _msgs: string[] = [];
  for (const m of parsed.messages) {
    if (typeof m !== "string") continue;
    for (const parte of m.split(/\n{2,}/)) {
      const t = parte.trim();
      if (t) _msgs.push(t);
    }
  }
  // 2) corta o EXCESSO do nome (o modelo abusa do vocativo): mantém no máx 1 e só ~30% das vezes
  const _pnome = (leadName || "").trim().split(/\s+/)[0];
  if (_pnome && _pnome.length > 1 && !/^(amigo|amiga|cliente)/i.test(_pnome)) {
    const _esc = _pnome.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const _rx = new RegExp("\\s*,\\s*" + _esc + "\\b|^" + _esc + "\\s*,\\s*", "gi");
    const _manter = Math.random() < 0.3;
    let _c = 0;
    _msgs = _msgs.map(t => {
      const r = t.replace(_rx, (mt) => { _c++; return (_manter && _c === 1) ? mt : ""; });
      return r.replace(/\s{2,}/g, " ").replace(/\s+([!?.,])/g, "$1").trim();
    });
  }
  parsed.messages = _msgs.filter((m: string) => m && m.trim()).slice(0, 6);
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
    pedeHumano: !!parsed.pedeHumano,
    assistiu: !!parsed.assistiu,
    enviarMaterial: (typeof parsed.enviarMaterial === "string" && parsed.enviarMaterial.trim() && parsed.enviarMaterial.trim().toLowerCase() !== "null") ? parsed.enviarMaterial.trim().slice(0, 120) : null,
    encerrar: !!parsed.encerrar
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
