'use server'

import { analyzeConversion, suggestReplies, summarizeConversation, transcribeAudio } from "@/lib/gemini";
import prisma from "@/lib/prisma";
import * as fs from 'fs';
import * as path from 'path';

/**
 * Transcreve uma mensagem de áudio específica (Sob Demanda)
 */
export async function transcribeMessage(messageId: string) {
  try {
    const msg = await (prisma as any).message.findUnique({
      where: { id: messageId }
    });

    if (!msg || msg.mediaType !== 'audio' || !msg.mediaUrl) {
      throw new Error("Mensagem não é um áudio válido");
    }

    // Se já foi transcrita antes, apenas retorna
    if (msg.transcription) return msg.transcription;

    // Extrai o nome do arquivo da URL (ex: /api/media/audio.ogg)
    const filename = msg.mediaUrl.split('/').pop();
    const filePath = path.join(process.cwd(), 'public', 'uploads', filename);

    if (!fs.existsSync(filePath)) {
      throw new Error("Arquivo de áudio não encontrado no servidor");
    }

    // Lê o arquivo e converte para base64
    const audioBuffer = fs.readFileSync(filePath);
    const base64Audio = audioBuffer.toString('base64');
    
    // Mimetype - Assumimos audio/ogg p/ WhatsApp mas podemos ser mais genéricos
    const mimeType = filename.endsWith('.mp3') ? 'audio/mpeg' : 'audio/ogg';

    console.log(`🤖 IA: Transcrevendo sob demanda: ${filename}...`);
    const result = await transcribeAudio(base64Audio, mimeType);

    if (result) {
      // Atualiza o banco com a transcrição
      await (prisma as any).message.update({
        where: { id: messageId },
        data: { transcription: result }
      });
      return result;
    }

    return null;
  } catch (error) {
    console.error("Erro na transcrição sob demanda:", error);
    return null;
  }
}

/**
 * Obtem análise de conversão (Termômetro)
 */
export async function getLeadAnalysis(leadId: string) {
  try {
    const lead = await (prisma as any).lead.findUnique({
      where: { id: leadId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 50 // Analisar as últimas 50 mensagens
        }
      }
    });

    if (!lead || (lead.messages || []).length === 0) {
      return { score: 10, status: 'GELADO', advice: 'Comece a prospectar o lead' };
    }

    const chatHistory = lead.messages
      .map((m: any) => `${m.author?.name ? `VENDEDOR (${m.author.name})` : 'CLIENTE (Lead)'}: ${m.content || ''}${m.transcription ? ` (ÁUDIO TRANSCRITO: ${m.transcription})` : ''}`)
      .join('\n');

    const result = await analyzeConversion(chatHistory);

    if (result && result.status) {
      await (prisma as any).lead.update({
        where: { id: leadId },
        data: {
          aiScore: result.score,
          aiStatus: result.status,
          aiAdvice: result.advice
        }
      });
    }

    return result;
  } catch (error) {
    console.error("Erro ao analisar lead:", error);
    return { score: 0, status: 'ERRO', advice: 'Tente novamente' };
  }
}

/**
 * Obtem resumo da conversa
 */
export async function getConversationSummary(leadId: string) {
  try {
    const lead = await (prisma as any).lead.findUnique({
      where: { id: leadId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!lead || (lead.messages || []).length === 0) return "Sem mensagens para resumir.";

    const chatHistory = lead.messages
      .map((m: any) => `${m.author?.name ? `VENDEDOR (${m.author.name})` : 'CLIENTE (Lead)'}: ${m.content || ''}${m.transcription ? ` (ÁUDIO TRANSCRITO: ${m.transcription})` : ''}`)
      .join('\n');

    return await summarizeConversation(chatHistory);
  } catch (error) {
    console.error("Erro ao resumir conversa:", error);
    return "Erro ao gerar resumo.";
  }
}

/**
 * Obtem sugestões de respostas
 */
export async function getReplySuggestions(leadId: string) {
  try {
    const lead = await (prisma as any).lead.findUnique({
      where: { id: leadId },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 10 // Pega as últimas 10 p/ contexto
        }
      }
    });

    if (!lead || (lead.messages || []).length === 0) return [];

    const chatHistory = lead.messages
      .reverse()
      .map((m: any) => {
        const role = m.authorId ? "VOCÊ (Vendedor)" : `CLIENTE (${lead.name})`;
        const text = m.content || (m.transcription ? `[Áudio: ${m.transcription}]` : "[Mídia]");
        return `${role}: ${text}`;
      })
      .join('\n');

    return await suggestReplies(chatHistory);
  } catch (error) {
    console.error("Erro ao sugerir respostas:", error);
    return [];
  }
}
