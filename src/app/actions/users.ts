"use server";

import prisma from "@/lib/prisma";

export async function getSellers() {
  try {
    return await (prisma as any).user.findMany({
      where: { role: "SELLER" },
      select: { id: true, name: true, email: true, notificationPhone: true }
    });
  } catch (error) {
    console.error("Error fetching sellers:", error);
    return [];
  }
}

export async function getUserSettings(userId: string) {
  try {
    return await (prisma as any).user.findUnique({
      where: { id: userId },
      select: { notificationPhone: true, notificationsEnabled: true, notifyNewMessages: true }
    });
  } catch (error) {
    return null;
  }
}

export async function updateUserNotificationSettings(userId: string, data: { phone: string, enabled: boolean, notifyNewMessages?: boolean }) {
  console.log(`[USER_SETTINGS] Iniciando salvamento de configuração para usuário ID: ${userId} | Status: ${data.enabled} | Fone: ${data.phone} | NotifyMsgs: ${data.notifyNewMessages}`);
  
  try {
    const updatedUser = await (prisma as any).user.update({
      where: { id: userId },
      data: {
        notificationPhone: data.phone || null,
        notificationsEnabled: data.enabled,
        notifyNewMessages: data.notifyNewMessages ?? true
      }
    });
    
    console.log(`[USER_SETTINGS] ✅ SUCESSO! Configuração salva no banco para ${updatedUser.name}. Telefone: ${updatedUser.notificationPhone}`);
    return { success: true };
  } catch (error: any) {
    console.error(`[USER_SETTINGS] ❌ ERRO_FATAL ao salvar configurações de alertas para o usuário ${userId}:`, error.message || error);
    return { success: false, error: "Falha ao salvar no banco. Pode ser que este número já exista." };
  }
}
