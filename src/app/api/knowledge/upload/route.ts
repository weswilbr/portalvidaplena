import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { extrairConteudoImagem } from "@/lib/gemini";
import fs from "fs/promises";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const title = ((formData.get("title") as string) || "").trim();

    if (!file) return NextResponse.json({ success: false, error: "Nenhum arquivo enviado." }, { status: 400 });
    if (!title) return NextResponse.json({ success: false, error: "Dê um título ao material." }, { status: 400 });
    if (file.size > 25 * 1024 * 1024) return NextResponse.json({ success: false, error: "Arquivo muito grande (máx 25MB)." }, { status: 400 });

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

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
      type = "IMAGE";
      const extracted = await extrairConteudoImagem(buffer.toString("base64"), mime);
      content = extracted || "";
      if (!content.trim()) {
        return NextResponse.json({ success: false, error: "Não consegui ler o conteúdo da imagem. Tente uma imagem mais nítida." }, { status: 422 });
      }
    } else if (mime === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
      type = "PDF";
      try {
        const { stdout } = await execAsync(`pdftotext "${filePath}" -`, { maxBuffer: 1024 * 1024 * 10 });
        content = (stdout || "").trim();
      } catch {
        content = "";
      }
      // PDF só-imagem: extrai cada página como imagem via visão IA (poppler pdftoppm)
      if (!content.trim()) {
        try {
          const base = path.join(uploadDir, `${safeName}-p`);
          await execAsync(`pdftoppm -png -r 130 -l 8 "${filePath}" "${base}"`, { maxBuffer: 1024 * 1024 * 50 });
          const files = (await fs.readdir(uploadDir)).filter(f => f.startsWith(`${safeName}-p`)).sort();
          const partes: string[] = [];
          for (const f of files) {
            const imgBuf = await fs.readFile(path.join(uploadDir, f));
            const txt = await extrairConteudoImagem(imgBuf.toString("base64"), "image/png");
            if (txt?.trim()) partes.push(txt.trim());
            await fs.unlink(path.join(uploadDir, f)).catch(() => {});
          }
          content = partes.join("\n\n");
        } catch (e) {
          console.error("Erro pdftoppm/visão:", e);
        }
      }
      if (!content.trim()) {
        return NextResponse.json({ success: false, error: "Não consegui extrair o conteúdo deste PDF. Tente exportar como imagem (PNG/JPG)." }, { status: 422 });
      }
    } else {
      return NextResponse.json({ success: false, error: "Formato não suportado. Use imagem (PNG/JPG) ou PDF." }, { status: 400 });
    }

    await (prisma as any).knowledgeItem.create({ data: { title, content, type, fileUrl } });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("Erro /api/knowledge/upload:", e);
    return NextResponse.json({ success: false, error: "Falha ao processar o arquivo." }, { status: 500 });
  }
}
