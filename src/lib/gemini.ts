const GEMINI_MODEL = "gemini-2.5-flash-lite";

/**
 * Transcreve e resume um áudio enviado pelo WhatsApp
 */
export async function transcribeAudio(base64Data: string, mimeType: string) {
  try {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("API Key ausente");

    const prompt = "Você é um assistente de CRM. Transcreva este áudio do WhatsApp e faça um resumo curto do que o lead quer. Se for um áudio de saudação, apenas transcreva. Formate assim:\n[Transcrição]: ...\n[Resumo]: ...";

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inline_data: { mime_type: mimeType, data: base64Data } }
            ]
          }]
        })
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("❌ Gemini API erro:", response.status, errText);
      return null;
    }

    const data = await response.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch (error) {
    console.error("Erro na transcrição Gemini:", error);
    return null;
  }
}

/**
 * Analisa a conversa e sugere 3 respostas rápidas
 */
export async function suggestReplies(chatHistory: string) {
  try {
    const key = process.env.GEMINI_API_KEY;
    if (!key) return [];

    const prompt = `Você é o VENDEDOR em uma conversa de CRM. Sua missão é sugerir 3 opções de respostas curtas para VOCÊ mesmo enviar ao CLIENTE.
REGRAS CRÍTICAS:
1. NUNCA sugira o que o CLIENTE diria.
2. Escreva como se você fosse o atendente profissional.
3. Se o histórico termina com uma mensagem sua, sugira follow-ups (ex: "Conseguiu ver o vídeo?", "Ficou claro?", "Apareceu alguma dúvida?", "O que achou do material?").
4. Se o histórico termina com o cliente, responda à dúvida dele ou agradeça.

Retorne APENAS um array JSON de strings. Exemplo: ["Sim, claro!", "Consegue me enviar seu CEP?", "Vou verificar agora."]

Histórico (últimas mensagens):
${chatHistory}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );

    if (!response.ok) {
        const errText = await response.text();
        console.error("❌ Gemini API erro (Suggest):", response.status, errText);
        return [];
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    return [];
  } catch (error) {
    console.error("Erro nas sugestões Gemini:", error);
    return [];
  }
}

/**
 * Termômetro de Conversão: Analisa o interesse do lead
 */
export async function analyzeConversion(chatHistory: string) {
  try {
    const key = process.env.GEMINI_API_KEY;
    if (!key) return { score: 0, status: 'GELADO', advice: 'Inicie a conversa' };

    const prompt = `Analise o histórico de conversa entre um VENDEDOR e um CLIENTE. 
Siga estas regras rigorosas:
1. Um lead só é QUENTE se tiver interesse IMEDIATO em comprar, perguntar sobre pagamento, documentos ou demonstrar pressa.
2. Um lead é MORNO se estiver apenas tirando dúvidas básicas e ainda não demonstrou que vai comprar.
3. Um lead é GELADO se o cliente parou de responder, deu respostas curtas de desinteresse ou se apenas o vendedor estiver falando muito sem retorno.
4. Seja realista: se o cliente apenas fez uma pergunta técnica e não respondeu o pitch de vendas, ele NÃO é quente.

Retorne APENAS um JSON: {"score": 85, "status": "QUENTE", "advice": "Ofereça o fechamento agora"}

Histórico de Conversa:
${chatHistory}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );

    if (!response.ok) {
        const errText = await response.text();
        console.error("❌ Gemini API erro (Analyze):", response.status, errText);
        return { score: 0, status: 'GELADO', advice: 'Analise indisponível' };
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    return { score: 10, status: 'GELADO', advice: 'Continue o atendimento' };
  } catch (error) {
    console.error("Erro no termômetro Gemini:", error);
    return { score: 0, status: 'ERRO', advice: 'Erro na análise' };
  }
}

/**
 * Resumo Geral da Conversa
 */
export async function summarizeConversation(chatHistory: string) {
  try {
    const key = process.env.GEMINI_API_KEY;
    if (!key) return "Não foi possível gerar resumo.";

    const prompt = `Resuma os principais pontos desta conversa de vendas em no máximo 3 parágrafos curtos. Destaque as dores do lead e o que foi acordado.\n\nHistórico:\n${chatHistory}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );

    if (!response.ok) {
        const errText = await response.text();
        console.error("❌ Gemini API erro (Summarize):", response.status, errText);
        return "Erro ao processar resumo.";
    }

    const data = await response.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || "Histórico vazio.";
  } catch (error) {
    console.error("Erro no resumo Gemini:", error);
    return "Erro técnico ao resumir.";
  }
}

