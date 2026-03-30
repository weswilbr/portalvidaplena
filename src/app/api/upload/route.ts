import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export const config = {
  api: {
    bodyParser: false, // Desativa o parser padrão para permitir stream manual se necessário
  },
};

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ success: false, error: "Nenhum arquivo enviado" }, { status: 400 });
    }

    // Limitando a 100MB na API (O Vercel tem limite de 4.5MB, mas na VPS o limite é o do Node/Nginx)
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

    const publicUrl = `/api/media/${fileName}`;

    return NextResponse.json({ 
      success: true, 
      url: publicUrl, 
      name: file.name,
      type: file.type.startsWith("image") ? "image" : 
            file.type.startsWith("video") ? "video" : 
            file.type.startsWith("audio") ? "audio" : "document" 
    });
  } catch (error) {
    console.error("Erro no upload API:", error);
    return NextResponse.json({ success: false, error: "Falha no processamento do arquivo" }, { status: 500 });
  }
}
