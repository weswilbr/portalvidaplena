import { makeWASocket, useMultiFileAuthState, DisconnectReason, Browsers, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import * as QRCode from 'qrcode';
import qrcodeTerminal from 'qrcode-terminal';
import * as fs from 'fs';
import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());
import prisma from '../lib/prisma';

const logger = pino({ level: 'info' });

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

async function startBot() {
  console.log('🤖 Inicializando Instância Baileys VPS...');
  
  // Vigilante do Painel (Restart automático caso o Administrador aperte o botão)
  setInterval(async () => {
    try {
      const dbConfig = await (prisma as any).botConfig.findFirst();
      if (dbConfig?.status === 'RESTART_REQUESTED') {
        console.log('🔄 ALERTA: Pedido de Restart / Hard Reset recebido do Painel...');
        await (prisma as any).botConfig.update({
          where: { id: dbConfig.id },
          data: { status: 'DISCONNECTED', qrCode: null }
        });
        
        console.log('🗑️ Apagando cache do Baileys para varrer corrupções...');
        if (fs.existsSync('./bot_auth_info')) {
          fs.rmSync('./bot_auth_info', { recursive: true, force: true });
        }
        
        console.log('💥 Forçando o fechamento para o PM2 reabastecer a instância limpa.');
        process.exit(1);
      }
    } catch(e) {
      console.error('Erro no vigilante:', e);
    }
  }, 5000);
  
  const { version, isLatest } = await fetchLatestBaileysVersion();
  console.log(`📡 Versão do WhatsApp sincronizada: v${version.join('.')} (Última: ${isLatest})`);

  const { state, saveCreds } = await useMultiFileAuthState('./bot_auth_info');
  const botConfig = await getOrCreateBotConfig();

  const sock = makeWASocket({
    version,
    auth: state,
    logger,
    browser: Browsers.macOS('Desktop')
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('✅ Novo QR Code gerado.');
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
    }

    if (connection === 'close') {
      const error = (lastDisconnect?.error as Boom);
      const statusCode = error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      
      console.log('❌ Conexão Baileys fechou. Detalhes: ', error?.message, ' | Status Code:', statusCode);
      console.log('Reconectando:', shouldReconnect);
      
      const cfg = await getOrCreateBotConfig();
      await (prisma as any).botConfig.update({ where: { id: cfg.id }, data: { status: 'DISCONNECTED' } });
      
      if (shouldReconnect) startBot();
    } else if (connection === 'open') {
      console.log('🚀 WhatsApp conectado a VPS!');
      const cfg = await getOrCreateBotConfig();
      await (prisma as any).botConfig.update({ where: { id: cfg.id }, data: { status: 'CONNECTED', qrCode: null } });
    }
  });

  sock.ev.on('messages.upsert', async (m) => {
    try {
      if (m.type !== 'notify') return;
      const msg = m.messages[0];
      if (!msg.message || msg.key.fromMe) return;

      const remoteJid = msg.key.remoteJid;
      if (!remoteJid || remoteJid.endsWith('@g.us')) return; // ignorar grupos e status
      
      const phoneOnly = remoteJid.split('@')[0];
      const participantName = msg.pushName || "Cliente WhatsApp";
      const textMessage = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
      
      if (!textMessage.trim()) return;

      // Pegar config mais atualizada
      const cfg = await (prisma as any).botConfig.findFirst();

      // Checa se ja existe Lead com esse fone
      let lead = await (prisma as any).lead.findFirst({ where: { phone: phoneOnly } });

      let isNewLead = false;
      if (!lead) {
        isNewLead = true;
        console.log(`✨ Novo Lead detectado: ${phoneOnly}`);
        
        // Logica Round Robin ou Pool
        let assignedToId: string | null = null;
        if (cfg?.isRoundRobin) {
          const sellers = await (prisma as any).user.findMany({
            where: { role: 'SELLER' },
            include: { leads: { where: { status: 'CONTACTED' } } }
          });
          
          if (sellers.length > 0) {
            // Pega o com menos leads ativos
            const sortedSellers = sellers.sort((a, b) => a.leads.length - b.leads.length);
            assignedToId = sortedSellers[0].id;
          }
        }

        lead = await (prisma as any).lead.create({
          data: {
            name: participantName,
            phone: phoneOnly,
            source: 'WhatsApp Bot',
            status: assignedToId ? 'CONTACTED' : 'NEW',
            assignedToId
          }
        });

        // Envia mensagem de Saudação e Transferência
        const greeting = `${cfg?.welcomeMessage}\n\n${cfg?.transferMessage}`;
        await sock.sendMessage(remoteJid, { text: greeting });

        // Salva a mensagem do sistema enviada no histórico
        await (prisma as any).message.create({
          data: {
            content: greeting,
            leadId: lead.id,
            isSystem: true
          }
        });
      }

      // Salva a mensagem do cliente que acabou de chegar
      await (prisma as any).message.create({
        data: {
          content: textMessage,
          leadId: lead.id,
          isSystem: false // Apesar de false (não é system rule), authorId será null significando "Autor: Cliente", a UI lidará com isso ok ou o Admin olhará o chat e verá as msgs alternadas
          // WAIT: a UI renderiza no VendasClient: author === USER.name -> verde, senão -> branco. 
          // Vamos fazer uma pequena adaptação na logica do Message
        }
      });
      console.log(`📩 Mensagem arquivada no CRM para Lead ${lead.name}`);

    } catch (err) {
      console.error('Erro processando mensagem:', err);
    }
  });
}

startBot();
