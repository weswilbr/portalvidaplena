"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getLeads(assignedToId?: string) {
  try {
    return await (prisma as any).lead.findMany({
      where: assignedToId ? { assignedToId } : {},
      include: {
        assignedTo: {
          select: { name: true, id: true }
        },
        messages: {
          include: {
            author: { select: { name: true, id: true } }
          },
          orderBy: { createdAt: "asc" }
        }
      },
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
  assignedToId?: string;
}) {
  try {
    let assignedUserId = data.assignedToId;

    // Lógica de Atribuição Automática (Round Robin Simplificado)
    if (!assignedUserId) {
      const sellers = await (prisma as any).user.findMany({
        where: { role: "SELLER" },
        select: { id: true },
      });

      if (sellers.length > 0) {
        // Atribui ao vendedor que tem menos leads no momento
        const leadCounts = await Promise.all(
          sellers.map(async (s: any) => ({
            id: s.id,
            count: await (prisma as any).lead.count({ where: { assignedToId: s.id } }),
          }))
        );
        
        assignedUserId = leadCounts.sort((a, b) => a.count - b.count)[0].id;
      }
    }

    const lead = await (prisma as any).lead.create({
      data: {
        name: data.name,
        phone: data.phone,
        email: data.email,
        source: data.source || "Manual",
        interest: data.interest || "Negócio",
        status: data.status || "NEW",
        assignedToId: assignedUserId,
      },
    });

    if (assignedUserId) {
      await (prisma as any).message.create({
        data: {
          content: "Atendimento iniciado.",
          authorId: assignedUserId,
          leadId: lead.id,
          isSystem: true
        }
      });
    }

    revalidatePath("/dashboard/leads");
    revalidatePath("/dashboard/vendas");
    revalidatePath("/dashboard");
    return { success: true, lead };
  } catch (error) {
    console.error("Error creating lead:", error);
    return { success: false, error: "Failed to create lead" };
  }
}

export async function updateLead(id: string, data: any) {
  try {
    const lead = await (prisma as any).lead.update({
      where: { id },
      data,
    });
    revalidatePath("/dashboard/leads");
    revalidatePath("/dashboard/vendas");
    revalidatePath("/dashboard");
    return { success: true, lead };
  } catch (error) {
    console.error("Error updating lead:", error);
    return { success: false, error: "Failed to update lead" };
  }
}

export async function deleteLead(id: string) {
  try {
    await (prisma as any).lead.delete({
      where: { id },
    });
    revalidatePath("/dashboard/leads");
    revalidatePath("/dashboard/vendas");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Error deleting lead:", error);
    return { success: false, error: "Failed to delete lead" };
  }
}

export async function addMessage(data: { leadId: string; content: string; authorId: string; isSystem?: boolean; isNote?: boolean }) {
  try {
    const message = await (prisma as any).message.create({
      data: {
        content: data.content,
        authorId: data.authorId,
        leadId: data.leadId,
        isSystem: data.isSystem || false,
        isNote: data.isNote || false
      }
    });
    revalidatePath("/dashboard/leads");
    revalidatePath("/dashboard/vendas");
    return { success: true, message };
  } catch (error) {
    console.error("Error adding message:", error);
    return { success: false, error: "Falha ao adicionar nota" };
  }
}

export async function sendWhatsAppMessage(data: { leadId: string; content: string; authorId: string }) {
  try {
    const lead = await (prisma as any).lead.findUnique({ where: { id: data.leadId } });
    if (!lead?.phone) return { success: false, error: "Lead sem número de telefone" };

    // Salva no histórico do CRM como mensagem WhatsApp enviada
    await (prisma as any).message.create({
      data: {
        content: data.content,
        authorId: data.authorId,
        leadId: data.leadId,
        isSystem: false,
        isNote: false
      }
    });

    // Cria registro na fila de saída para o bot enviar via WhatsApp
    await (prisma as any).outgoingMessage.create({
      data: {
        to: lead.phone,
        body: data.content,
        leadId: data.leadId,
        authorId: data.authorId,
        status: "PENDING"
      }
    });

    revalidatePath("/dashboard/vendas");
    return { success: true };
  } catch (error) {
    console.error("Error sending WhatsApp message:", error);
    return { success: false, error: "Falha ao enviar mensagem" };
  }
}

export async function addInternalNote(data: { leadId: string; content: string; authorId: string }) {
  try {
    await (prisma as any).message.create({
      data: {
        content: data.content,
        authorId: data.authorId,
        leadId: data.leadId,
        isSystem: false,
        isNote: true
      }
    });
    revalidatePath("/dashboard/leads");
    revalidatePath("/dashboard/vendas");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Falha ao salvar nota" };
  }
}

export async function transferLead(leadId: string, newAssignedToId: string, currentUserId: string, motive?: string) {
  try {
    const lead = await (prisma as any).lead.update({
      where: { id: leadId },
      data: { assignedToId: newAssignedToId }
    });

    const newSeller = await (prisma as any).user.findUnique({ where: { id: newAssignedToId } });

    await (prisma as any).message.create({
      data: {
        content: `Atendimento transferido para ${newSeller?.name || 'outro vendedor'}. ${motive ? 'Motivo: ' + motive : ''}`,
        authorId: currentUserId,
        leadId: lead.id,
        isSystem: true
      }
    });

    revalidatePath("/dashboard/leads");
    revalidatePath("/dashboard/vendas");
    return { success: true, lead };
  } catch (error) {
    console.error("Error transferring lead:", error);
    return { success: false, error: "Falha ao transferir atendimento" };
  }
}

export async function pullLead(leadId: string, currentUserId: string) {
  try {
    const lead = await (prisma as any).lead.update({
      where: { id: leadId },
      data: { assignedToId: currentUserId, status: "CONTACTED" }
    });

    await (prisma as any).message.create({
      data: {
        content: `Vendedor puxou o atendimento para sua fila. Status atualizado para em atendimento.`,
        authorId: currentUserId,
        leadId: lead.id,
        isSystem: true
      }
    });

    revalidatePath("/dashboard/leads");
    revalidatePath("/dashboard/vendas");
    return { success: true, lead };
  } catch (error) {
    console.error("Error pulling lead:", error);
    return { success: false, error: "Falha ao puxar atendimento" };
  }
}
