"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import fs from "fs/promises";
import path from "path";

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

export async function getLeadById(id: string) {
  try {
    return await (prisma as any).lead.findUnique({
      where: { id },
      include: {
        assignedTo: { select: { name: true, id: true } },
        messages: {
          include: { author: { select: { name: true, id: true } } },
          orderBy: { createdAt: "asc" }
        }
      }
    });
  } catch (error) {
    return null;
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
    // Removed revalidatePath for speed
    return { success: true, message };
  } catch (error) {
    console.error("Error adding message:", error);
    return { success: false, error: "Falha ao adicionar nota" };
  }
}

export async function sendWhatsAppMessage(data: { 
  leadId: string; 
  content: string; 
  authorId: string; 
  mediaUrl?: string; 
  mediaType?: string; 
  fileName?: string;
  quotedMessageId?: string;
  quotedMessageContent?: string;
}) {
  try {
    const lead = await (prisma as any).lead.findUnique({ where: { id: data.leadId } });
    if (!lead?.phone) return { success: false, error: "Lead sem número de telefone" };

    // Salva no histórico do CRM como mensagem WhatsApp enviada (com tentativa resiliente)
    try {
      await (prisma as any).message.create({
        data: {
          content: data.content,
          authorId: data.authorId,
          leadId: data.leadId,
          isSystem: false,
          isNote: false,
          mediaUrl: data.mediaUrl,
          mediaType: data.mediaType,
          quotedMessageId: data.quotedMessageId,
          quotedMessageContent: data.quotedMessageContent
        }
      });
    } catch (msgErr) {
      console.warn("⚠️ Banco não aceitou citação no histórico. Tentando envio simples.");
      await (prisma as any).message.create({
        data: {
          content: data.content,
          authorId: data.authorId,
          leadId: data.leadId,
          isSystem: false,
          isNote: false,
          mediaUrl: data.mediaUrl,
          mediaType: data.mediaType
        }
      });
    }

    // Cria registro na fila de saída para o bot enviar via WhatsApp (com tentativa resiliente)
    try {
      await (prisma as any).outgoingMessage.create({
        data: {
          to: lead.phone,
          body: data.content,
          mediaUrl: data.mediaUrl,
          mediaType: data.mediaType,
          fileName: data.fileName,
          leadId: data.leadId,
          authorId: data.authorId,
          status: "PENDING",
          quotedMessageId: data.quotedMessageId,
          quotedMessageContent: data.quotedMessageContent
        }
      });
    } catch (omErr) {
      console.warn("⚠️ Banco não aceitou citação na fila. Revertendo para envio básico.");
      await (prisma as any).outgoingMessage.create({
        data: {
          to: lead.phone,
          body: data.content,
          mediaUrl: data.mediaUrl,
          mediaType: data.mediaType,
          fileName: data.fileName,
          leadId: data.leadId,
          authorId: data.authorId,
          status: "PENDING"
        }
      });
    }

    // Removido revalidatePath para performance no client
    return { success: true };
  } catch (error) {
    console.error("Error sending WhatsApp message:", error);
    return { success: false, error: "Falha ao enviar mensagem" };
  }
}

// Converte o arquivo em base64 e guarda no banco para o bot recolher
// Em um sistema real, aqui você subiria para um S3 ou Cloudinary
export async function uploadMedia(formData: FormData) {
  try {
    const file = formData.get("file") as File;
    if (!file) return { success: false, error: "Nenhum arquivo enviado" };

    if (file.size > 64 * 1024 * 1024) { // Limite de 64MB
      return { success: false, error: "Arquivo muito grande (máximo 64MB)" };
    }

    // Cria o diretório se não existir
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    try {
      await fs.access(uploadDir);
    } catch {
      await fs.mkdir(uploadDir, { recursive: true });
    }

    const fileName = `${Date.now()}-${file.name.replace(/\s+/g, "_")}`;
    const filePath = path.join(uploadDir, fileName);
    
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await fs.writeFile(filePath, buffer);

    // Retorna a URL via API Segura
    const publicUrl = `/api/media/${fileName}`;

    return { 
      success: true, 
      url: publicUrl, 
      name: file.name,
      type: file.type.startsWith("image") ? "image" : 
            file.type.startsWith("video") ? "video" : 
            file.type.startsWith("audio") ? "audio" : "document" 
    };
  } catch (error) {
    console.error("Erro no upload:", error);
    return { success: false, error: "Erro no processamento do arquivo" };
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
    // Removido revalidatePath para performance no client
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
    const lead = await (prisma as any).lead.findUnique({
      where: { id: leadId },
      include: { assignedTo: true }
    });

    if (!lead) return { success: false, error: "Lead não encontrado" };

    // Se já estiver atribuído a outra pessoa, só admin pode puxar
    if (lead.assignedToId && lead.assignedToId !== currentUserId) {
      const user = await (prisma as any).user.findUnique({ where: { id: currentUserId } });
      if (user?.role !== "ADMIN") {
        return { success: false, error: "Apenas administradores podem puxar um lead que já tem dono." };
      }
    }

    const updatedLead = await (prisma as any).lead.update({
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
    return { success: true, lead: updatedLead };
  } catch (error) {
    console.error("Error pulling lead:", error);
    return { success: false, error: "Falha ao puxar lead" };
  }
}

export async function deleteMessage(messageId: string, deleteForEveryone: boolean = false) {
  try {
    const msg = await (prisma as any).message.findUnique({
      where: { id: messageId },
      include: { lead: true }
    });

    if (deleteForEveryone && msg?.whatsappId && msg.lead?.phone) {
      // Cria o comando para o bot apagar no WhatsApp oficial
      await (prisma as any).outgoingMessage.create({
        data: {
          to: msg.lead.phone,
          body: "Deleção de mensagem solicitada via CRM",
          actionType: "DELETE",
          whatsappId: msg.whatsappId,
          status: "PENDING",
          leadId: msg.leadId
        }
      });
    }

    await (prisma as any).message.delete({
      where: { id: messageId }
    });
    revalidatePath("/dashboard/vendas");
    return { success: true };
  } catch (error) {
    console.error("Error deleting message:", error);
    return { success: false, error: "Falha ao excluir mensagem" };
  }
}

export async function updateMessage(messageId: string, content: string) {
  try {
    await (prisma as any).message.update({
      where: { id: messageId },
      data: { content }
    });
    revalidatePath("/dashboard/vendas");
    return { success: true };
  } catch (error) {
    console.error("Error updating message:", error);
    return { success: false, error: "Falha ao editar mensagem" };
  }
}

export async function getQuickReplies(userId: string) {
  try {
    return await (prisma as any).quickReply.findMany({
      where: {
        OR: [{ userId }, { userId: null }]
      },
      orderBy: { title: "asc" }
    });
  } catch (error) {
    return [];
  }
}

export async function createQuickReply(data: { title: string; content: string; userId: string }) {
  try {
    const qr = await (prisma as any).quickReply.create({ data });
    revalidatePath("/dashboard/vendas");
    return { success: true, quickReply: qr };
  } catch (error) {
    return { success: false, error: "Falha ao criar gatilho" };
  }
}

export async function deleteQuickReply(id: string) {
  try {
    await (prisma as any).quickReply.delete({ where: { id } });
    revalidatePath("/dashboard/vendas");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Falha ao excluir gatilho" };
  }
}

export async function updateQuickReply(id: string, data: { title?: string; content?: string }) {
  try {
    const qr = await (prisma as any).quickReply.update({
      where: { id },
      data
    });
    revalidatePath("/dashboard/vendas");
    return { success: true, quickReply: qr };
  } catch (error) {
    return { success: false, error: "Falha ao atualizar gatilho" };
  }
}
export async function reactToMessage(messageId: string, emoji: string, userId: string) {
  try {
    const msg = await (prisma as any).message.findUnique({ where: { id: messageId } });
    if (!msg) return { success: false, error: "Mensagem não encontrada" };

    let reactions: Record<string, string[]> = {};
    if (msg.reactions) {
      try {
        reactions = JSON.parse(msg.reactions);
      } catch (e) {
        reactions = {};
      }
    }

    // Gerencia a reação (adiciona ou remove se for o mesmo emoji do mesmo usuário)
    if (!reactions[emoji]) {
      reactions[emoji] = [];
    }

    if (reactions[emoji].includes(userId)) {
      reactions[emoji] = reactions[emoji].filter(id => id !== userId);
      if (reactions[emoji].length === 0) delete reactions[emoji];
    } else {
      // Remove o usuário de outras reações se você quiser apenas uma (estilo WhatsApp)
      Object.keys(reactions).forEach(e => {
        reactions[e] = reactions[e].filter(id => id !== userId);
        if (reactions[e].length === 0) delete reactions[e];
      });
      
      if (!reactions[emoji]) reactions[emoji] = [];
      reactions[emoji].push(userId);
    }

    await (prisma as any).message.update({
      where: { id: messageId },
      data: { reactions: JSON.stringify(reactions) }
    });

    return { success: true, reactions };
  } catch (error) {
    console.error("Error reacting to message:", error);
    return { success: false, error: "Falha ao reagir" };
  }
}
