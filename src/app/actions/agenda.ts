"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getAgendaItems() {
  try {
    return await prisma.agendaItem.findMany({
      orderBy: { start: "asc" },
    });
  } catch (error) {
    console.error("Error fetching agenda items:", error);
    return [];
  }
}

export async function createAgendaItem(data: {
  title: string;
  start: Date;
  end?: Date;
  category?: string;
  description?: string;
}) {
  try {
    const item = await prisma.agendaItem.create({
      data: {
        title: data.title,
        start: data.start,
        end: data.end,
        category: data.category,
        description: data.description,
        status: "PENDING",
      },
    });
    revalidatePath("/dashboard/agenda");
    revalidatePath("/dashboard");
    return { success: true, item };
  } catch (error) {
    console.error("Error creating agenda item:", error);
    return { success: false, error: "Failed to create agenda item" };
  }
}

export async function updateAgendaItem(id: string, data: any) {
  try {
    if (data.start) data.start = new Date(data.start);
    if (data.end) data.end = new Date(data.end);

    const item = await prisma.agendaItem.update({
      where: { id },
      data,
    });
    revalidatePath("/dashboard/agenda");
    revalidatePath("/dashboard");
    return { success: true, item };
  } catch (error) {
    console.error("Error updating agenda item:", error);
    return { success: false, error: "Failed to update agenda item" };
  }
}

export async function deleteAgendaItem(id: string) {
  try {
    await prisma.agendaItem.delete({
      where: { id },
    });
    revalidatePath("/dashboard/agenda");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Error deleting agenda item:", error);
    return { success: false, error: "Failed to delete agenda item" };
  }
}
