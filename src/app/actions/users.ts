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
      select: { notificationPhone: true, notificationsEnabled: true }
    });
  } catch (error) {
    return null;
  }
}

export async function updateUserNotificationSettings(userId: string, data: { phone: string, enabled: boolean }) {
  try {
    await (prisma as any).user.update({
      where: { id: userId },
      data: {
        notificationPhone: data.phone || null,
        notificationsEnabled: data.enabled
      }
    });
    return { success: true };
  } catch (error: any) {
    console.error("Error updating settings:", error);
    return { success: false, error: "Este número já pode estar em uso por outro vendedor." };
  }
}
