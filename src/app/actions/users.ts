"use server";

import prisma from "@/lib/prisma";

export async function getSellers() {
  try {
    return await (prisma as any).user.findMany({
      where: { role: "SELLER" },
      select: { id: true, name: true, email: true }
    });
  } catch (error) {
    console.error("Error fetching sellers:", error);
    return [];
  }
}
