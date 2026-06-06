"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { extrairConteudoImagem } from "@/lib/gemini";
import fs from "fs/promises";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function listKnowledge() {
  try {
    return await (prisma as any).knowledgeItem.findMany({ orderBy: { createdAt: "desc" } });
  } catch (e) {
    console.error("Erro listKnowledge:", e);
    return [];
  }
}

export async function addKnowledgeText(title: string, content: string) {
  try {
    if (!title?.trim() || !content?.trim()) {
      return { success: false, error: "Título e conteúdo são obrigatórios." };
    }
    await (prisma as any).knowledgeItem.create({
      data: { title: title.trim(), content: content.trim(), type: "TEXT" }
    });
    revalidatePath("/dashboard/conhecimento");
    return { success: true };
  } catch (e: any) {
    console.error("Erro addKnowledgeText:", e);
    return { success: false, error: "Falha ao salvar o texto." };
  }
}

export async function addKnowledgeFile(formData: FormData) {
  try {
    const file = formData.get("file") as File;
    const title = (formData.get("title") as string) || "";
    if (!file) return { success: false, error: "Nenhum arquivo enviado." };
    if (!title.trim()) return { success: false, error: "Dê um título ao material." };
    if (file.size > 25 * 1024 * 1024) return { success: false, error: "Arquivo muito grande (máx 25MB)." };

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Salva o arquivo original
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await fs.mkdir(uploadDir, { recursive: true });
    const safeName = `kb-${Date.now()}-${file.name.replace(/\s+/g, "_")}`;
    const filePath = path.join(uploadDir, safeName);
    await fs.writeFile(filePath, buffer);
    const fileUrl = `/api/media/${safeName}`;

    const mime = file.type || "";
    let content = "";
    let type = "PDF";

    if (mime.startsWith("image/")) {
      // 👁️ Visão IA lê a imagem/slide/tabela
      type = "IMAGE";
      const extracted = await extrairConteudoImagem(buffer.toString("base64"), mime);
      content = extracted || "";
      if (!content.trim()) {
        return { success: false, error: "Não consegui ler o conteúdo da imagem. Tente outra imagem mais nítida." };
      }
    } else if (mime === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
      // 📄 Extrai texto do PDF
      type = "PDF";
      try {
        const { stdout } = await execAsync(`pdftotext "${filePath}" -`, { maxBuffer: 1024 * 1024 * 10 });
        content = (stdout || "").trim();
      } catch (e) {
        content = "";
      }
      if (!content.trim()) {
        return { success: false, error: "Esse PDF parece ser só imagem (sem texto). Exporte os slides como imagem (PNG/JPG) e suba como imagem." };
      }
    } else {
      return { success: false, error: "Formato não suportado. Use imagem (PNG/JPG) ou PDF — ou cole o texto direto." };
    }

    await (prisma as any).knowledgeItem.create({
      data: { title: title.trim(), content, type, fileUrl }
    });
    revalidatePath("/dashboard/conhecimento");
    return { success: true };
  } catch (e: any) {
    console.error("Erro addKnowledgeFile:", e);
    return { success: false, error: "Falha ao processar o arquivo." };
  }
}

export async function deleteKnowledge(id: string) {
  try {
    await (prisma as any).knowledgeItem.delete({ where: { id } });
    revalidatePath("/dashboard/conhecimento");
    return { success: true };
  } catch (e) {
    return { success: false, error: "Falha ao excluir." };
  }
}

export async function toggleKnowledge(id: string, active: boolean) {
  try {
    await (prisma as any).knowledgeItem.update({ where: { id }, data: { active } });
    revalidatePath("/dashboard/conhecimento");
    return { success: true };
  } catch (e) {
    return { success: false, error: "Falha ao atualizar." };
  }
}
