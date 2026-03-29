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

// Mapa manual de LIDs para Phone Numbers
const LID_MAP_PATH = './lid_pn_map.json';
let lidPnMap: Record<string, string> = {};

function loadLidMap() {
  if (fs.existsSync(LID_MAP_PATH)) {
    try {
      lidPnMap = JSON.parse(fs.readFileSync(LID_MAP_PATH, 'utf-8'));
    } catch (e) {
      console.error('Erro ao ler mapa de LIDs:', e);
    }
  }
}

function saveLidMap() {
  try {
    fs.writeFileSync(LID_MAP_PATH, JSON.stringify(lidPnMap, null, 2));
  } catch (e) {
    console.error('Erro ao salvar mapa de LIDs:', e);
  }
}

loadLidMap();

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

  // Estratégia 1: History Sync - dispara na conexão inicial com TODOS os contatos
  sock.ev.on('messaging-history.set' as any, ({ contacts = [] }: any) => {
    console.log(`📋 History Sync: ${contacts.length} contatos recebidos`);
    for (const contact of contacts) {
      if (contact.id && contact.phoneNumber) {
        const lid = contact.id.split('@')[0].split(':')[0];
        const pn = contact.phoneNumber.replace(/[^0-9]/g, '');
        if (lid.length > 13 && pn.length <= 13) {
          lidPnMap[lid] = pn;
          saveLidMap();
          console.log(`🔗 Mapeamento via History Sync: LID ${lid} -> PN ${pn}`);
        }
      }
    }
  });

  // Listener para capturar mapeamento de LID -> Phone Number
  sock.ev.on('contacts.upsert', (contacts) => {
    for (const contact of contacts) {
      if (contact.id && contact.phoneNumber) {
        const lid = contact.id.split('@')[0].split(':')[0];
        const pn = contact.phoneNumber.replace(/[^0-9]/g, "");
        if (lid.length > 13 && pn.length <= 13) {
          lidPnMap[lid] = pn;
          saveLidMap();
          console.log(`🔗 Mapeamento Capturado (Upsert): LID ${lid} -> PN ${pn}`);
        }
      }
    }
  });

  sock.ev.on('contacts.update', async (updates) => {
    for (const update of updates) {
      if (update.id && update.phoneNumber) {
        const lid = update.id.split('@')[0].split(':')[0];
        const pn = update.phoneNumber.replace(/[^0-9]/g, "");
        
        if (lid.length > 13 && pn.length <= 13) {
          lidPnMap[lid] = pn;
          saveLidMap();
          console.log(`🔗 Mapeamento Capturado (Update): LID ${lid} -> PN ${pn}`);
        }
        
        // Se já existe um lead com o LID, atualiza para o número real
        try {
          const leadWithLid = await (prisma as any).lead.findFirst({
            where: { phone: lid }
          });
          
          if (leadWithLid) {
            console.log(`✅ Atualizando Lead ${leadWithLid.name} de LID ${lid} para PN ${pn}`);
            await (prisma as any).lead.update({
              where: { id: leadWithLid.id },
              data: { phone: pn }
            });
          }
        } catch (err) {
          console.error('Erro ao atualizar lead com PN real:', err);
        }
      }
    }
  });

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

      // Logica robusta para resolver LID vs PN (Phone Number)
      let rawId = remoteJid.split('@')[0].split(':')[0];
      let phoneOnly = rawId.replace(/[^0-9]/g, "");

      // 1. Tenta buscar no Mapa Manual (LID persistido)
      if (lidPnMap[phoneOnly]) {
          console.log(`🎯 Resolvido via Mapa: ${phoneOnly} -> ${lidPnMap[phoneOnly]}`);
          phoneOnly = lidPnMap[phoneOnly];
      }

      // 2. Fallback: tenta metadados da mensagem (participant)
      if (phoneOnly.length > 13) {
          const realContactJid = msg.key.participant || remoteJid;
          const extractedPN = realContactJid.split('@')[0].split(':')[0].replace(/[^0-9]/g, "");
          if (extractedPN.length <= 13 && (extractedPN.startsWith("55") || extractedPN.length >= 10)) {
              lidPnMap[phoneOnly] = extractedPN;
              saveLidMap();
              console.log(`✅ LID ${phoneOnly} resolvido via Participant: ${extractedPN}`);
              phoneOnly = extractedPN;
          }
      }

      // 3. Fallback: contatos internos do Baileys (sock.contacts)
      if (phoneOnly.length > 13) {
          const internalContacts = (sock as any).contacts as Record<string, any> | undefined;
          if (internalContacts) {
              const contact = internalContacts[remoteJid]
                  || internalContacts[`${phoneOnly}@lid`]
                  || internalContacts[`${phoneOnly}@s.whatsapp.net`];
              if (contact?.phoneNumber) {
                  const pn = contact.phoneNumber.replace(/[^0-9]/g, "");
                  if (pn.length <= 13) {
                      lidPnMap[phoneOnly] = pn;
                      saveLidMap();
                      console.log(`✅ Resolvido via sock.contacts: ${phoneOnly} -> ${pn}`);
                      phoneOnly = pn;
                  }
              }
          }
      }

      // Debug: loga dados brutos quando LID ainda não foi resolvido
      if (phoneOnly.length > 13) {
          console.log(`⚠️ LID não resolvido: ${phoneOnly}`);
          console.log(`   remoteJid: ${remoteJid} | pushName: ${msg.pushName || 'sem nome'}`);
      }

      if (phoneOnly.includes(':')) phoneOnly = phoneOnly.split(':')[0];
      
      const participantName = msg.pushName || "Cliente WhatsApp";
      const textMessage = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
      
      // Pegar config mais atualizada
      const cfg = await (prisma as any).botConfig.findFirst();

      // Checa se ja existe Lead com esse fone
      let lead = await (prisma as any).lead.findFirst({ where: { phone: phoneOnly } });

      let isNewLead = false;
      if (!lead) {
        isNewLead = true;
        
        // Se ainda for um ID gigante, vamos tentar uma ultima limpeza para salvar algo util
        // ou avisar no CRM que o numero real esta sendo sincronizado
        console.log(`✨ Novo Lead detectado: ${phoneOnly}`);
        
        let profilePic: string | null = null;
        try {
          profilePic = await sock.profilePictureUrl(remoteJid, 'image') || null;
        } catch (err) {
          console.log(`Sem foto de perfil pública para ${phoneOnly}`);
        }

        // Logica Round Robin ou Pool
        let assignedToId: string | null = null;
        if (cfg?.isRoundRobin) {
          const sellers = await (prisma as any).user.findMany({
            where: { role: 'SELLER' },
            include: { leads: { where: { status: 'CONTACTED' } } }
          });
          
          if (sellers.length > 0) {
            // Pega o com menos leads ativos
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
