"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getBotConfig() {
  try {
    let config = await (prisma as any).botConfig.findFirst();
    if (!config) {
      config = await (prisma as any).botConfig.create({
        data: {
          welcomeMessage: "Olá! Sou o assistente virtual da Vida Plena. Como posso ajudar com saúde e bem-estar hoje?",
          transferMessage: "Vou transferir seu atendimento para um de nossos especialistas. Um instante...",
          isRoundRobin: true
        }
      });
    }
    return config;
  } catch (error) {
    console.error("Error fetching bot config:", error);
    return null;
  }
}

export async function updateBotConfig(id: string, data: any) {
  try {
    const config = await (prisma as any).botConfig.update({
      where: { id },
      data
    });
    revalidatePath("/dashboard/bot");
    return { success: true, config };
  } catch (error) {
    console.error("Error updating bot config:", error);
    return { success: false, error: "Falha ao salvar configuração do Bot." };
  }
}

export async function restartBotCommand() {
  try {
    const config = await (prisma as any).botConfig.findFirst();
    if (config) {
      await (prisma as any).botConfig.update({
        where: { id: config.id },
        data: { status: 'RESTART_REQUESTED' }
      });
      revalidatePath("/dashboard/bot");
      return { success: true, message: "Comando enviado! O QR Code aparecerá limpo em alguns segundos." };
    }
    return { success: false, message: "Configuração não encontrada." };
  } catch (error) {
    console.error("Erro reiniciando app:", error);
    return { success: false, message: "Falha ao enviar comando." };
  }
}
