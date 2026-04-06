import { GoogleGenerativeAI } from "@google/generative-ai";

function getGenAI() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    console.error("❌ ERRO CRÍTICO: GEMINI_API_KEY não encontrada!");
    throw new Error("API Key ausente");
  }
  return new GoogleGenerativeAI(key);
}

// Modelo mais compatível com todas as versões da biblioteca
const MODEL = "gemini-pro-vision"; // fallback p/ versões antigas

/**
 * Transcreve e resume um áudio enviado pelo WhatsApp
 * Usa fetch direto na API REST do Google para máxima compatibilidade
 */
export async function transcribeAudio(base64Data: string, mimeType: string) {
  try {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("API Key ausente");

    const prompt = "Você é um assistente de CRM. Transcreva este áudio do WhatsApp e faça um resumo curto do que o lead quer. Se for um áudio de saudação, apenas transcreva. Formate assim:\n[Transcrição]: ...\n[Resumo]: ...";

    // v1beta suporta multimodal (áudio) com gemini-1.5-flash
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
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

    const prompt = `Com base no histórico abaixo de um lead no CRM, sugira 3 respostas curtas e profissionais para o vendedor enviar. Retorne APENAS um array JSON de strings. Exemplo: ["Sim, claro!", "Pode me enviar seu e-mail?", "Vou verificar agora."]\n\nHistórico:\n${chatHistory}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );

    if (!response.ok) return [];

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
