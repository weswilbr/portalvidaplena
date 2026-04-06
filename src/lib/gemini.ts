import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

/**
 * Transcreve e resume um áudio enviado pelo WhatsApp
 */
export async function transcribeAudio(base64Data: string, mimeType: string) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = "Você é um assistente de CRM. Transcreva este áudio do WhatsApp e faça um resumo curto do que o lead quer. Se for um áudio de saudação, apenas transcreva. Formate assim: [Transcrição]: ... \n [Resumo]: ...";

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Data,
          mimeType: mimeType
        }
      }
    ]);

    return result.response.text();
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
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `Com base no histórico abaixo de um lead no CRM, sugira 3 respostas curtas e profissionais para o vendedor enviar. Retorne APENAS um array JSON de strings. Exemplo: ["Sim, claro!", "Pode me enviar seu e-mail?", "Vou verificar agora."]\n\nHistórico:\n${chatHistory}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    // Extrai o JSON da resposta (Gemini as vezes coloca ```json)
    const jsonMatch = text.match(/\[.*\]/s);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return [];
  } catch (error) {
    console.error("Erro nas sugestões Gemini:", error);
    return [];
  }
}
