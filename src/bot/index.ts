import { Client, LocalAuth, MessageMedia } from 'whatsapp-web.js';
import * as QRCode from 'qrcode';
import qrcodeTerminal from 'qrcode-terminal';
import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());
import prisma from '../lib/prisma';

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
  } catch (err) {
    console.error('Erro ao salvar QR no banco:', err);
  }
});

client.on('ready', async () => {
  console.log('🚀 WhatsApp conectado com sucesso!');
  const cfg = await getOrCreateBotConfig();
  await (prisma as any).botConfig.update({
    where: { id: cfg.id },
    data: { status: 'CONNECTED', qrCode: null }
  });
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
        const media = await msg.downloadMedia();
        if (media) {
          savedMediaType = media.mimetype.split('/')[0]; // image, video, etc
          // Em produção: aqui faria upload para S3 e salvaria o URL real
          // Por enquanto salvamos o base64 ou um indicador para o CRM
          savedMediaUrl = `data:${media.mimetype};base64,${media.data}`;
          if (!finalContent) finalContent = `[Arquivo ${savedMediaType}]`;
        }
      } catch (e) {
        console.error("Erro ao baixar mídia do WhatsApp:", e);
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
      } catch (err) {
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
        transcription: transcription
      }
    });

    console.log(`📩 Mensagem ${msg.hasMedia ? 'com mídia ' : ''}arquivada no CRM para Lead ${lead.name}`);

  } catch (err) {
    console.error('Erro processando mensagem:', err);
  }
});

// Polling de mensagens de saída — vendedor envia via CRM, bot entrega no WhatsApp
setInterval(async () => {
  try {
    const state = await client.getState().catch(() => null);
    if (state !== 'CONNECTED') return;

    const pending = await (prisma as any).outgoingMessage.findMany({
      where: { status: 'PENDING' },
      take: 5,
      orderBy: { createdAt: 'asc' }
    });

    for (const om of pending) {
      try {
        if (om.mediaUrl) {
          // Se tiver URL de mídia, envia como mídia
          // Em produção, primeiro baixa do S3/URL
          let media;
          if (om.mediaUrl.startsWith('data:')) {
             const [header, data] = om.mediaUrl.split(';base64,');
             const mimetype = header.split(':')[1];
             // WhatsApp nativamente usa ogg/opus, forçamos se for áudio para garantir que o celular entenda como voz
             const finalMime = om.mediaType === 'audio' ? 'audio/ogg; codecs=opus' : mimetype;
             media = new MessageMedia(finalMime, data);
          } else {
             media = await MessageMedia.fromUrl(om.mediaUrl).catch(() => null);
          }
          
          if (media) {
            const isAudio = om.mediaType === 'audio' || (media && media.mimetype.startsWith('audio/'));
            // Se for áudio, envia como PTT (mensagem de voz nativa)
            await client.sendMessage(`${om.to}@c.us`, media, { 
              caption: om.body || undefined,
              sendAudioAsVoice: isAudio // Isso habilita o modo mensagem de voz
            });
          } else {
            await client.sendMessage(`${om.to}@c.us`, om.body);
          }
        } else {
          await client.sendMessage(`${om.to}@c.us`, om.body);
        }

        await (prisma as any).outgoingMessage.update({
          where: { id: om.id },
          data: { status: 'SENT' }
        });
        console.log(`📤 WhatsApp ${om.mediaUrl ? 'com mídia ' : ''}enviado para ${om.to}`);
      } catch (err: any) {
        await (prisma as any).outgoingMessage.update({
          where: { id: om.id },
          data: { status: 'FAILED', errorMsg: err.message }
        });
        console.error(`❌ Falha ao enviar para ${om.to}:`, err.message);
      }
    }
  } catch {
    // Bot pode não estar conectado ainda
  }
}, 3000);

client.initialize();
