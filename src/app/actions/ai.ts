'use server'

import { analyzeConversion, suggestReplies, summarizeConversation } from "@/lib/gemini";
import prisma from "@/lib/prisma";

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
      .map((m: any) => `${m.author?.name || 'Cliente'}: ${m.content}`)
      .join('\n');

    return await analyzeConversion(chatHistory);
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
      .map((m: any) => `${m.author?.name || 'Cliente'}: ${m.content}`)
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
      .map((m: any) => `${m.author?.name || 'Cliente'}: ${m.content}`)
      .join('\n');

    return await suggestReplies(chatHistory);
  } catch (error) {
    console.error("Erro ao sugerir respostas:", error);
    return [];
  }
}
