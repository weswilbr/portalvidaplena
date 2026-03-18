"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getLeads() {
  try {
    return await prisma.lead.findMany({
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    console.error("Error fetching leads:", error);
    return [];
  }
}

export async function createLead(data: {
  name: string;
  phone?: string;
  email?: string;
  source?: string;
  interest?: string;
  status?: string;
}) {
  try {
    const lead = await prisma.lead.create({
      data: {
        name: data.name,
        phone: data.phone,
        email: data.email,
        source: data.source || "Manual",
        interest: data.interest,
        status: data.status || "NEW",
      },
    });
    revalidatePath("/dashboard/leads");
    revalidatePath("/dashboard");
    return { success: true, lead };
  } catch (error) {
    console.error("Error creating lead:", error);
    return { success: false, error: "Failed to create lead" };
  }
}

export async function updateLead(id: string, data: any) {
  try {
    const lead = await prisma.lead.update({
      where: { id },
      data,
    });
    revalidatePath("/dashboard/leads");
    revalidatePath("/dashboard");
    return { success: true, lead };
  } catch (error) {
    console.error("Error updating lead:", error);
    return { success: false, error: "Failed to update lead" };
  }
}

export async function deleteLead(id: string) {
  try {
    await prisma.lead.delete({
      where: { id },
    });
    revalidatePath("/dashboard/leads");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Error deleting lead:", error);
    return { success: false, error: "Failed to delete lead" };
  }
}
