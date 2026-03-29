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
  // Aqui, futuramente, chamaremos via HTTP POST a API rodando na sua VPS
  // para reiniciar a conexão do Baileys/Evolution API
  console.log("Comando de reinício do bot disparado para VPS.");
  return { success: true, message: "Comando enviado para a VPS." };
}
