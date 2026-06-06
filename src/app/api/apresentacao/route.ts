import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export const runtime = "nodejs";
export const maxDuration = 300;

const DIR = path.join(process.cwd(), "public", "prospeccao");

async function acharApresentacao(): Promise<string | null> {
  try {
    const files = await fs.readdir(DIR);
    return files.find(f => /^apresentacao\./i.test(f)) || null;
  } catch {
    return null;
  }
}

// Status atual do vídeo
export async function GET() {
  const nome = await acharApresentacao();
  if (!nome) return NextResponse.json({ exists: false });
  try {
    const stat = await fs.stat(path.join(DIR, nome));
    return NextResponse.json({
      exists: true,
      name: nome,
      sizeMB: +(stat.size / 1024 / 1024).toFixed(1),
      url: `/prospeccao/${nome}`
    });
  } catch {
    return NextResponse.json({ exists: false });
  }
}

// Upload / troca do vídeo
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) return NextResponse.json({ success: false, error: "Nenhum arquivo enviado." }, { status: 400 });

    const mime = file.type || "";
    const ehVideo = mime.startsWith("video/") || /\.(mp4|mov|webm|avi|mkv|m4v)$/i.test(file.name);
    if (!ehVideo) return NextResponse.json({ success: false, error: "Envie um arquivo de vídeo (MP4, MOV...)." }, { status: 400 });

    if (file.size > 64 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: "Vídeo muito grande (máx 64MB). Comprima ou reduza a duração." }, { status: 400 });
    }

    await fs.mkdir(DIR, { recursive: true });

    // Remove qualquer apresentacao.* anterior (só pode haver uma)
    const antigos = (await fs.readdir(DIR)).filter(f => /^apresentacao\./i.test(f));
    for (const a of antigos) await fs.unlink(path.join(DIR, a)).catch(() => {});

    // Extensão a partir do nome ou do mime
    let ext = (file.name.split(".").pop() || "").toLowerCase();
    if (!/^[a-z0-9]{2,4}$/.test(ext)) ext = (mime.split("/")[1] || "mp4").toLowerCase();

    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(path.join(DIR, `apresentacao.${ext}`), buffer);

    const sizeMB = +(file.size / 1024 / 1024).toFixed(1);
    return NextResponse.json({ success: true, name: `apresentacao.${ext}`, sizeMB, aviso: sizeMB > 16 ? "Vídeo acima de 16MB pode demorar ou falhar no WhatsApp. Se der problema, comprima." : null });
  } catch (e: any) {
    console.error("Erro upload apresentacao:", e);
    return NextResponse.json({ success: false, error: "Falha ao salvar o vídeo." }, { status: 500 });
  }
}

// Remover o vídeo
export async function DELETE() {
  try {
    const antigos = (await fs.readdir(DIR)).filter(f => /^apresentacao\./i.test(f));
    for (const a of antigos) await fs.unlink(path.join(DIR, a)).catch(() => {});
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Falha ao remover." }, { status: 500 });
  }
}
