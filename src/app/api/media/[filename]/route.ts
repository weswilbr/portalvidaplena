import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  try {
    const filename = (await (params as any)).filename;
    if (!filename) {
      return new NextResponse('Filename is required', { status: 400 });
    }

    // Acessa a pasta uploads fora do bundle estático (public/uploads)
    const filePath = path.join(process.cwd(), 'public', 'uploads', filename);

    try {
      await fs.access(filePath);
    } catch {
      return new NextResponse('Arquivo não encontrado', { status: 404 });
    }

    const fileBuffer = await fs.readFile(filePath);
    const stats = await fs.stat(filePath);
    
    // Identifica o tipo de conteúdo com base na extensão
    const ext = path.extname(filename).toLowerCase();
    let contentType = 'application/octet-stream';
    
    const types: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.gif': 'image/gif',
      '.mp4': 'video/mp4',
      '.mov': 'video/quicktime',
      '.webm': 'video/webm',
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.ogg': 'audio/ogg',
      '.pdf': 'application/pdf',
      '.txt': 'text/plain',
    };

    if (types[ext]) {
      contentType = types[ext];
    }

    // Suporte a Range para Streaming de Vídeo
    const range = request.headers.get('range');
    if (range && (contentType.startsWith('video/') || contentType.startsWith('audio/'))) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1;
      const chunksize = (end - start) + 1;
      
      const fileStream = await fs.readFile(filePath); // Simplificado para esse ambiente, em prod usaria slice/stream
      const slice = fileStream.subarray(start, end + 1);

      return new NextResponse(slice, {
        status: 206,
        headers: {
          'Content-Range': `bytes ${start}-${end}/${stats.size}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize.toString(),
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    }

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': stats.size.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*', // Permite que o bot ou outros serviços consumam a mídia
      },
    });
  } catch (error) {
    console.error('Erro ao servir mídia:', error);
    return new NextResponse('Erro interno no servidor', { status: 500 });
  }
}

