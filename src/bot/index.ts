import { Client, LocalAuth, MessageMedia } from 'whatsapp-web.js';
import ffmpeg from 'fluent-ffmpeg';
import * as QRCode from 'qrcode';
import qrcodeTerminal from 'qrcode-terminal';
import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());
import prisma from '../lib/prisma';
import * as path from 'path';
import * as fs from 'fs';

console.log('🤖 Inicializando WhatsApp Web Bot (whatsapp-web.js)...');

async function getOrCreateBotConfig() {
  let config = await (prisma as any).botConfig.findFirst();
  if (!config) {
    config = await (prisma as any).botConfig.create({
      data: {
        welcomeMessage: "Olá! Recebemos sua mensagem. Sou o assistente virtual da equipe...",
        transferMessage: "Vou transferir seu atendimento para um de nossos especialistas. Aguarde um instante.",
        isRoundRobin: true
      }
    });
  }
  return config;
}

/**
 * Comprime vídeo usando h264 para ser ultra leve no WhatsApp
 */
async function compressVideo(inputPath: string): Promise<string> {
  const outputPath = inputPath.replace(/(\.[a-z0-9]+)$/i, '-compressed.mp4');
  
  // Se o arquivo comprimido já existe (mesma mídia enviada antes), reaproveita
  if (fs.existsSync(outputPath)) {
    const stats = fs.statSync(outputPath);
    if (stats.size > 0) return outputPath;
  }

  console.log(`🎬 Comprimindo vídeo: ${path.basename(inputPath)}...`);
  
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .outputOptions([
        '-c:v libx264',
        '-crf 28',         // Qualidade ótima, arquivo pequeno
        '-preset faster',   // Rapidez no processamento
        '-c:a aac',
        '-b:a 128k',
        '-movflags +faststart' // Streaming instantâneo
      ])
      .on('error', (err: any) => {
        console.error('Erro na compressão:', err);
        resolve(inputPath); // Em caso de erro, manda o original mesmo
      })
      .on('end', () => {
        console.log(`✅ Vídeo comprimido com sucesso: ${path.basename(outputPath)}`);
        resolve(outputPath);
      })
      .save(outputPath);
  });
}

/**
 * Converte áudio para OGG Opus para garantir compatibilidade com WhatsApp Voice
 */
async function convertAudioToVoice(inputPath: string): Promise<string> {
  const outputPath = inputPath.replace(/(\.[a-z0-9]+)$/i, '-voice.ogg');
  
  if (fs.existsSync(outputPath)) {
    const stats = fs.statSync(outputPath);
    if (stats.size > 0) return outputPath;
  }

  console.log(`🎙️ Convertendo áudio para voz: ${path.basename(inputPath)}...`);
  
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .outputOptions([
        '-c:a libopus',
        '-b:a 64k',
        '-ac 1',
        '-ar 16000'
      ])
      .on('error', (err: any) => {
        console.error('Erro na conversão de áudio:', err);
        resolve(inputPath);
      })
      .on('end', () => {
        console.log(`✅ Áudio convertido com sucesso: ${path.basename(outputPath)}`);
        resolve(outputPath);
      })
      .save(outputPath);
  });
}

const client = new Client({
  authStrategy: new LocalAuth({ dataPath: './wwebjs_auth', clientId: 'zabot' }),
  puppeteer: {
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-gpu'
    ],
    headless: true,
  }
});

// Vigilante do Painel (Restart automático via botão do admin)
setInterval(async () => {
  try {
    const dbConfig = await (prisma as any).botConfig.findFirst();
    if (dbConfig?.status === 'RESTART_REQUESTED') {
      console.log('🔄 Pedido de Restart recebido do Painel...');
      await (prisma as any).botConfig.update({
        where: { id: dbConfig.id },
        data: { status: 'DISCONNECTED', qrCode: null }
      });
      console.log('💥 Encerrando processo para PM2 reiniciar...');
      process.exit(1);
    }
  } catch(e) {
    console.error('Erro no vigilante:', e);
  }
}, 5000);

client.on('qr', async (qr: string) => {
  console.log('✅ Novo QR Code gerado — escaneie pelo WhatsApp.');
  qrcodeTerminal.generate(qr, { small: true });
  try {
    const qrBase64 = await QRCode.toDataURL(qr);
    const cfg = await getOrCreateBotConfig();
    await (prisma as any).botConfig.update({
      where: { id: cfg.id },
      data: { status: 'QR_READY', qrCode: qrBase64 }
    });
  } catch (err: any) {
    console.error('Erro ao salvar QR no banco:', err);
  }
});

async function scanProfilePhotos() {
  try {
    console.log('🔍 Iniciando varredura de fotos de perfil faltantes...');
    const leadsWithoutPic = await (prisma as any).lead.findMany({
      where: { profilePic: null },
      take: 40
    });
    
    if (leadsWithoutPic.length === 0) {
      console.log('✅ Todos os leads já possuem foto ou fila vazia.');
      return;
    }

    for (const lead of leadsWithoutPic) {
      try {
        // Formata o ID do WhatsApp (remove : e cuida de LIDs se necessário)
        const jid = lead.phone.includes('@') ? lead.phone : `${lead.phone.split(':')[0]}@c.us`;
        const contact = await client.getContactById(jid);
        const picUrl = await contact.getProfilePicUrl();
        
        if (picUrl) {
           await (prisma as any).lead.update({
             where: { id: lead.id },
             data: { profilePic: picUrl }
           });
           console.log(`📸 Foto capturada com sucesso para: ${lead.name}`);
        }
        
        // Delay de 5 segundos entre cada consulta por segurança absoluta contra bloqueio
        await new Promise(r => setTimeout(r, 5000));
      } catch (e) {
        // Avança silenciosamente se o contato for privado ou inválido
      }
    }
    console.log('✨ Varredura de fotos concluída.');
  } catch (err: any) {
    console.error('Erro na varredura de fotos:', err);
  }
}

client.on('ready', async () => {
  console.log('🚀 WhatsApp conectado com sucesso!');
  const cfg = await getOrCreateBotConfig();
  await (prisma as any).botConfig.update({
    where: { id: cfg.id },
    data: { status: 'CONNECTED', qrCode: null }
  });

  // Dispara a varredura inicial em background após 15 segundos da conexão
  setTimeout(() => scanProfilePhotos(), 15000);

  // Mantém um vigilante de fotos a cada 2 horas p/ leads novos (importados/manuais)
  setInterval(() => scanProfilePhotos(), 1000 * 60 * 60 * 2);
});

client.on('auth_failure', async (msg: string) => {
  console.log('❌ Falha de autenticação:', msg);
  const cfg = await getOrCreateBotConfig();
  await (prisma as any).botConfig.update({
    where: { id: cfg.id },
    data: { status: 'DISCONNECTED' }
  });
});

client.on('disconnected', async (reason: string) => {
  console.log('❌ WhatsApp desconectado:', reason);
  const cfg = await getOrCreateBotConfig();
  await (prisma as any).botConfig.update({
    where: { id: cfg.id },
    data: { status: 'DISCONNECTED' }
  });
  // PM2 vai reiniciar automaticamente
  setTimeout(() => process.exit(1), 2000);
});

client.on('message', async (msg: any) => {
  try {
    // Ignorar mensagens de grupo e do próprio bot
    if (msg.fromMe) return;
    if (msg.from.endsWith('@g.us')) return;

    // ✅ getContact() resolve o NÚMERO REAL — sem problema de LID
    const contact = await msg.getContact();
    const phoneOnly = contact.number; // ex: 5527999998888
    const participantName = contact.name || contact.pushname || 'Cliente WhatsApp';
    const textMessage = msg.body || '';
    const isBusiness = (contact as any).isBusiness || false;
    const source = isBusiness ? 'WhatsApp Business' : 'WhatsApp Bot';

    console.log(`📩 Mensagem de: ${participantName} (${phoneOnly})${isBusiness ? ' 🏢 Empresa' : ''}`);

    const cfg = await (prisma as any).botConfig.findFirst();

    // Busca foto de perfil (sempre tenta para manter atualizada)
    let profilePic: string | null = null;
    try {
      profilePic = await contact.getProfilePicUrl() || null;
    } catch {
      // Contato não tem foto pública
    }

    // Checa se já existe lead com esse número
    let lead = await (prisma as any).lead.findFirst({ where: { phone: phoneOnly } });

    if (!lead) {
      console.log(`✨ Novo Lead: ${participantName} (${phoneOnly})`);

      // Lógica Round Robin
      let assignedToId: string | null = null;
      if (cfg?.isRoundRobin) {
        const sellers = await (prisma as any).user.findMany({
          where: { role: 'SELLER' },
          include: { leads: { where: { status: 'CONTACTED' } } }
        });
        if (sellers.length > 0) {
          const sortedSellers = sellers.sort((a: any, b: any) => a.leads.length - b.leads.length);
          assignedToId = sortedSellers[0].id;
        }
      }

      lead = await (prisma as any).lead.create({
        data: {
          name: participantName,
          phone: phoneOnly,
          profilePic,
          source,
          status: assignedToId ? 'CONTACTED' : 'NEW',
          assignedToId
        }
      });

      // Envia mensagem de saudação
      const greeting = `${cfg?.welcomeMessage}\n\n${cfg?.transferMessage}`;
      await msg.reply(greeting);

      await (prisma as any).message.create({
        data: {
          content: greeting,
          leadId: lead.id,
          isSystem: true
        }
      });

    } else {
      // Lead existente — atualiza foto e nome se mudaram
      const updates: Record<string, any> = {};

      if (profilePic && profilePic !== lead.profilePic) {
        updates.profilePic = profilePic;
        console.log(`📸 Foto atualizada para ${lead.name}`);
      }
      // Atualiza nome apenas se ainda está com o nome padrão
      if (lead.name === 'Cliente WhatsApp' && participantName !== 'Cliente WhatsApp') {
        updates.name = participantName;
        console.log(`✏️ Nome atualizado para ${participantName}`);
      }

      if (Object.keys(updates).length > 0) {
        lead = { ...lead, ...updates };
        await (prisma as any).lead.update({
          where: { id: lead.id },
          data: updates
        });
      }
    }

    // Salva a mensagem do cliente (texto e mídia se houver)
    let finalContent = textMessage;
    let savedMediaUrl = null;
    let savedMediaType = null;

    if (msg.hasMedia) {
      try {
        console.log(`📥 Baixando mídia de ${participantName}...`);
        const media = await msg.downloadMedia();
        if (media) {
          savedMediaType = media.mimetype.split('/')[0]; // image, video, etc
          
          // Geramos um nome de arquivo seguro e único
          const extension = media.mimetype.split('/')[1]?.split(';')[0] || 'bin';
          const filename = `incoming-${Date.now()}-${Math.random().toString(36).substring(7)}.${extension}`;
          
          const uploadDir = path.join(process.cwd(), 'public', 'uploads');
          if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
          }
          
          const filePath = path.join(uploadDir, filename);
          fs.writeFileSync(filePath, Buffer.from(media.data, 'base64'));
          
          // Salva a URL da nossa API interna
          savedMediaUrl = `/api/media/${filename}`;
          
          console.log(`✅ Mídia (${savedMediaType}) salva em: ${filename}`);
          if (!finalContent) finalContent = `[Arquivo ${savedMediaType}]`;
        } else {
          console.error("❌ Falha ao processar downloadMedia: Retornou nulo.");
        }
      } catch (e: any) {
        console.error("❌ Erro ao baixar/salvar mídia do WhatsApp:", e);
      }
    }

    // Transcrição de áudio se disponível
    let transcription = null;
    if (savedMediaType === 'audio' && savedMediaUrl && process.env.OPENAI_API_KEY) {
      console.log("🎙️ Áudio detectado. Iniciando transcrição...");
      try {
        // Placeholder para chamada de transcrição (Whisper)
        // transcription = await transcribeAudio(savedMediaUrl);
        transcription = "[Transcrição automática em processamento...]"; 
      } catch (err: any) {
        console.error("Erro na transcrição:", err);
      }
    }

    await (prisma as any).message.create({
      data: {
        content: finalContent || '[Mensagem]',
        leadId: lead.id,
        isSystem: false,
        mediaUrl: savedMediaUrl,
        mediaType: savedMediaType,
        transcription: transcription,
        whatsappId: msg.id._serialized // Guarda o RG da mensagem para exclusão futura
      }
    });

    // Incrementa contador de não lidas no Lead
    await (prisma as any).lead.update({
      where: { id: lead.id },
      data: { unreadCount: { increment: 1 } }
    });

    console.log(`📩 Mensagem ${msg.hasMedia ? 'com mídia ' : ''}arquivada no CRM para Lead ${lead.name}`);

  } catch (err: any) {
    console.error('Erro processando mensagem:', err);
  }
});

// Prevenção de duplicidade: trava de envio
let isProcessingOutgoing = false;

// Polling de mensagens de saída — vendedor envia via CRM, bot entrega no WhatsApp
setInterval(async () => {
  if (isProcessingOutgoing) return;
  try {
    const state = await client.getState().catch(() => null);
    if (state !== 'CONNECTED') return;

    const pending = await (prisma as any).outgoingMessage.findMany({
      where: { status: 'PENDING' },
      take: 5,
      orderBy: { createdAt: 'asc' }
    });
    if (pending.length === 0) return;
    isProcessingOutgoing = true;

    for (const om of pending) {
      try {
        // Se for uma ação de DELETE, o bot apaga no WhatsApp
        if (om.actionType === 'DELETE' && om.whatsappId) {
          console.log(`🗑️ Pedido de exclusão para mensagem: ${om.whatsappId}`);
          try {
             // Tenta buscar a mensagem no histórico do WhatsApp Web
             const msgToDelete = await client.getMessageById(om.whatsappId).catch(() => null);
             if (msgToDelete) {
                await msgToDelete.delete(true); // TRUE = para todos
                console.log(`✅ Mensagem excluída do WhatsApp para todos.`);
             } else {
                console.log(`⚠️ Mensagem não encontrada para deleção ou antiga demais.`);
             }
          } catch(e) {
             console.error(`Erro ao deletar msg:`, e);
          }
          
          await (prisma as any).outgoingMessage.update({
             where: { id: om.id },
             data: { status: 'SENT' }
          });
          continue;
        }

        if (om.mediaUrl) {
          // Se tiver URL de mídia, envia como mídia
          let media;
          
          if (om.mediaUrl.startsWith('data:')) {
             const [header, data] = om.mediaUrl.split(';base64,');
             const mimetype = header.split(':')[1];
             const finalMime = om.mediaType === 'audio' ? 'audio/ogg; codecs=opus' : mimetype;
             media = new MessageMedia(finalMime, data, om.fileName || 'arquivo');
             
             // Auto-limpeza: Se for base64 vindo do CRM, vamos salvar em arquivo na próxima vez pra poupar DB
             // Mas agora apenas enviamos.
          } else if (om.mediaUrl.startsWith('/api/media/') || om.mediaUrl.startsWith('/uploads/')) {
             const filename = om.mediaUrl.split('/').pop();
             const absPath = path.join(process.cwd(), 'public', 'uploads', filename || '');
             
             if (fs.existsSync(absPath)) {
                media = MessageMedia.fromFilePath(absPath);
             } else {
                console.error(`❌ Arquivo não encontrado fisicamente: ${absPath}`);
                // Tentativa de buscar via URL absoluta se falhar o path relativo
                media = await MessageMedia.fromUrl(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}${om.mediaUrl}`).catch(() => null);
             }
          } else {
             media = await MessageMedia.fromUrl(om.mediaUrl).catch(() => null);
          }
          
          if (media) {
            const isAudio = om.mediaType === 'audio' || (media && media.mimetype.startsWith('audio/'));
            const isDocument = om.mediaType === 'document' || (!isAudio && !media.mimetype.startsWith('image/') && !media.mimetype.startsWith('video/'));

            if (media && media.mimetype.startsWith('video/')) {
               const absPath = path.join(process.cwd(), 'public', 'uploads', (om.mediaUrl.split('/').pop() || ''));
               if (fs.existsSync(absPath)) {
                  const compressedPath = await compressVideo(absPath);
                  media = MessageMedia.fromFilePath(compressedPath);
               }
            }

            if (media && (media.mimetype.startsWith('audio/') || om.mediaType === 'audio')) {
               const filename = om.mediaUrl.split('/').pop();
               const absPath = path.join(process.cwd(), 'public', 'uploads', filename || '');
               if (fs.existsSync(absPath)) {
                  const voicePath = await convertAudioToVoice(absPath);
                  // PADRÃO WHATSAPP OGG (SEM ESPECIFICAR CODECS NA STRING)
                  const data = fs.readFileSync(voicePath).toString('base64');
                  media = new MessageMedia('audio/ogg', data, 'voice.ogg');
               }
            }

          const sentMsg = await client.sendMessage(`${om.to}@c.us`, media, { 
            caption: om.body || undefined,
            sendAudioAsVoice: isAudio,
            sendMediaAsDocument: isDocument
          });
          
          if (sentMsg && sentMsg.id && sentMsg.id._serialized) {
             // Atualiza no banco CRM o ID do WhatsApp para permitir que o vendedor delete depois
             await (prisma as any).message.updateMany({
                where: { content: om.body, leadId: om.leadId, whatsappId: null },
                data: { whatsappId: sentMsg.id._serialized }
             }).catch(() => null);
          }
        } else {
          console.log(`⚠️ Enviando apenas texto para ${om.to} (mídia não carregada)`);
          const sentMsg = await client.sendMessage(`${om.to}@c.us`, om.body);
          if (sentMsg && sentMsg.id && sentMsg.id._serialized) {
             await (prisma as any).message.updateMany({
                where: { content: om.body, leadId: om.leadId, whatsappId: null, createdAt: { gte: new Date(Date.now() - 60000) } },
                data: { whatsappId: sentMsg.id._serialized }
             }).catch(() => null);
          }
        }
      } else {
        const sentMsg = await client.sendMessage(`${om.to}@c.us`, om.body);
        if (sentMsg && sentMsg.id && sentMsg.id._serialized) {
           await (prisma as any).message.updateMany({
              where: { content: om.body, leadId: om.leadId, whatsappId: null, createdAt: { gte: new Date(Date.now() - 60000) } },
              data: { whatsappId: sentMsg.id._serialized }
           }).catch(() => null);
        }
      }

        // Tenta atualizar o status no banco. Se falhar (ex: cota), apenas logamos e seguimos.
        try {
          await (prisma as any).outgoingMessage.update({
            where: { id: om.id },
            data: { status: 'SENT' }
          });
        } catch (dbErr: any) {
          console.error(`⚠️ Erro ao atualizar status no DB (Cota?):`, (dbErr as any).message);
        }
        
        console.log(`📤 [OK] WhatsApp enviado para ${om.to}`);
        await new Promise(r => setTimeout(r, 1500));
        
      } catch (err: any) {
        console.error(`❌ Falha crítica ao enviar para ${om.to}:`, err);
        try {
          await (prisma as any).outgoingMessage.update({
            where: { id: om.id },
            data: { status: 'FAILED', errorMsg: err.message?.substring(0, 100) }
          });
        } catch (dbErr) {
          // Se nem o update de falha funcionar, o banco está travado.
        }
      }
    }
  } catch (globalErr: any) {
    console.error('🔥 Erro no loop de polling de mensagens:', globalErr.message);
  } finally {
    isProcessingOutgoing = false;
  }
}, 2000);



client.initialize();
