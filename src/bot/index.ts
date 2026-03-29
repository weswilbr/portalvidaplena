import { Client, LocalAuth } from 'whatsapp-web.js';
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

    console.log(`📩 Mensagem recebida de: ${participantName} (${phoneOnly})`);

    const cfg = await (prisma as any).botConfig.findFirst();

    // Checa se já existe lead com esse número
    let lead = await (prisma as any).lead.findFirst({ where: { phone: phoneOnly } });

    if (!lead) {
      console.log(`✨ Novo Lead detectado: ${phoneOnly}`);

      let profilePic: string | null = null;
      try {
        profilePic = await contact.getProfilePicUrl() || null;
      } catch {
        console.log(`Sem foto de perfil para ${phoneOnly}`);
      }

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
          source: 'WhatsApp Bot',
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
    }

    // Salva a mensagem do cliente
    await (prisma as any).message.create({
      data: {
        content: textMessage,
        leadId: lead.id,
        isSystem: false
      }
    });

    console.log(`📩 Mensagem arquivada no CRM para Lead ${lead.name}`);

  } catch (err) {
    console.error('Erro processando mensagem:', err);
  }
});

client.initialize();
