import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);
export const runtime = "nodejs";

const VOZES_POLLI = new Set([
  "nova", "shimmer", "alloy", "onyx", "sarah", "rachel",
  "bella", "daniel", "george", "charlotte", "echo", "fable"
]);

const TEXTO = "Oi! Que bom falar com você. Vamos conversar sobre essa oportunidade?";

export async function GET(req: NextRequest) {
  try {
    const voice = (req.nextUrl.searchParams.get("voice") || "pt-BR-FranciscaNeural").trim();
    let buf: Buffer | null = null;

    if (voice.startsWith("piper:")) {
      // 🏠 Piper (local/offline)
      const modelName = (voice.split(":")[1] || "faber").replace(/[^a-z0-9_-]/gi, "");
      const model = `/root/piper-voices/pt_BR-${modelName}-medium.onnx`;
      const tmp = path.join(process.cwd(), "public", "uploads");
      await fs.promises.mkdir(tmp, { recursive: true });
      const wav = path.join(tmp, `prev-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.wav`);
      const txt = wav + ".txt";
      await fs.promises.writeFile(txt, TEXTO);
      try {
        await execAsync(`/usr/local/bin/piper -m "${model}" -f "${wav}" < "${txt}"`, { timeout: 30000 });
        buf = await fs.promises.readFile(wav);
      } finally {
        fs.promises.unlink(txt).catch(() => {});
        fs.promises.unlink(wav).catch(() => {});
      }
      if (buf && buf.length >= 500) {
        return new NextResponse(new Uint8Array(buf), { status: 200, headers: { "Content-Type": "audio/wav", "Cache-Control": "no-store" } });
      }
      return NextResponse.json({ error: "Amostra vazia." }, { status: 502 });
    } else if (voice.startsWith("pt-BR-") || voice.includes("Neural")) {
      // 🆓 Edge-TTS (Microsoft, grátis)
      const tmp = path.join(process.cwd(), "public", "uploads");
      await fs.promises.mkdir(tmp, { recursive: true });
      const out = path.join(tmp, `prev-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.mp3`);
      const txt = out + ".txt";
      await fs.promises.writeFile(txt, TEXTO);
      try {
        await execAsync(`/usr/local/bin/edge-tts --file "${txt}" --voice ${voice} --write-media "${out}"`, { timeout: 30000 });
        buf = await fs.promises.readFile(out);
      } finally {
        fs.promises.unlink(txt).catch(() => {});
        fs.promises.unlink(out).catch(() => {});
      }
    } else if (VOZES_POLLI.has(voice.toLowerCase())) {
      // 💎 Pollinations (ElevenLabs)
      const token = process.env.POLLINATIONS_TOKEN;
      if (!token) return NextResponse.json({ error: "TTS não configurado." }, { status: 500 });
      const model = process.env.POLLINATIONS_TTS_MODEL || "elevenlabs";
      const r = await fetch("https://gen.pollinations.ai/v1/audio/speech", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ model, input: TEXTO, voice: voice.toLowerCase() })
      });
      if (!r.ok) return NextResponse.json({ error: "Falha ao gerar amostra." }, { status: 502 });
      buf = Buffer.from(await r.arrayBuffer());
    } else {
      return NextResponse.json({ error: "Voz inválida." }, { status: 400 });
    }

    if (!buf || buf.length < 500) return NextResponse.json({ error: "Amostra vazia." }, { status: 502 });
    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" }
    });
  } catch (e: any) {
    return NextResponse.json({ error: "Erro ao gerar amostra." }, { status: 500 });
  }
}
