"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getSellersWithStats() {
  try {
    const sellers = await (prisma as any).user.findMany({
      where: { role: "SELLER" },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
        leads: {
          select: { status: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return sellers.map((seller: any) => ({
      ...seller,
      totalLeads: seller.leads.length,
      closedSales: seller.leads.filter((l: any) => l.status === "CLOSED").length,
      activeConversations: seller.leads.filter((l: any) => l.status === "CONTACTED").length
    }));
  } catch (error) {
    console.error("Error fetching sellers with stats:", error);
    return [];
  }
}

export async function createSeller(data: any) {
  try {
    const existing = await (prisma as any).user.findFirst({
      where: {
        OR: [
          { email: data.email },
          { phone: data.phone }
        ]
      }
    });

    if (existing) {
      return { success: false, error: "E-mail ou WhatsApp já cadastrado." };
    }

    const seller = await (prisma as any).user.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        password: data.password, // Em prod: usar hash
        role: "SELLER"
      }
    });

    revalidatePath("/dashboard/equipe");
    return { success: true, seller };
  } catch (error: any) {
    console.error("Falha ao criar vendedor", error);
    return { success: false, error: "Falha interna do sistema: " + (error.message || String(error)) };
  }
}

export async function deleteSeller(id: string) {
  try {
    // Para simplificar, desvincular leads (passar pra general pool) antes de deletar
    await (prisma as any).lead.updateMany({
      where: { assignedToId: id },
      data: { assignedToId: null }
    });

    await (prisma as any).user.delete({
      where: { id }
    });

    revalidatePath("/dashboard/equipe");
    return { success: true };
  } catch (error) {
    console.error("Error deleting seller:", error);
    return { success: false, error: "Failed to delete seller" };
  }
}
