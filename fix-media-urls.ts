import prisma from './src/lib/prisma';

async function fixMediaUrls() {
  console.log('--- Iniciando Correção de URLs de Mídia ---');

  try {
    // 1. Corrigir na tabela Message
    const messages = await (prisma as any).message.findMany({
      where: {
        mediaUrl: {
          contains: '/uploads/'
        }
      }
    });

    console.log(`Encontradas ${messages.length} mensagens com padrão antigo (/uploads/).`);

    for (const msg of messages) {
      if (msg.mediaUrl.startsWith('/uploads/')) {
        const newUrl = msg.mediaUrl.replace('/uploads/', '/api/media/');
        await (prisma as any).message.update({
          where: { id: msg.id },
          data: { mediaUrl: newUrl }
        });
        console.log(`Corrigido [Message ${msg.id}]: ${msg.mediaUrl} -> ${newUrl}`);
      }
    }

    // 2. Corrigir na tabela OutgoingMessage
    const outgoing = await (prisma as any).outgoingMessage.findMany({
      where: {
        mediaUrl: {
          contains: '/uploads/'
        }
      }
    });

    console.log(`Encontradas ${outgoing.length} mensagens de saída com padrão antigo.`);

    for (const om of outgoing) {
      if (om.mediaUrl.startsWith('/uploads/')) {
        const newUrl = om.mediaUrl.replace('/uploads/', '/api/media/');
        await (prisma as any).outgoingMessage.update({
          where: { id: om.id },
          data: { mediaUrl: newUrl }
        });
        console.log(`Corrigido [OutgoingMessage ${om.id}]: ${om.mediaUrl} -> ${newUrl}`);
      }
    }

    console.log('--- Sucesso: Todas as URLs foram atualizadas para o padrão da API ---');
  } catch (err) {
    console.error('Erro durante a migração:', err);
  } finally {
    await (prisma as any).$disconnect();
  }
}

fixMediaUrls();
