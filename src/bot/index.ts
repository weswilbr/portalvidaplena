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
 * Baixa foto de perfil do WhatsApp p/ a VPS (Evita links expirados/CORS)
 */
async function downloadProfilePic(url: string, leadId: string): Promise<string | null> {
  try {
     const res = await fetch(url);
     if (!res.ok) return null;
     
     const buffer = await res.arrayBuffer();
     const avatarsDir = path.join(process.cwd(), 'public', 'avatars');
     
     if (!fs.existsSync(avatarsDir)) {
       fs.mkdirSync(avatarsDir, { recursive: true });
     }

     const fileName = `${leadId}.jpg`;
     const filePath = path.join(avatarsDir, fileName);
     
     fs.writeFileSync(filePath, Buffer.from(buffer));
     console.log(`📸 Avatar salvo no disco: ${fileName}`);
     
     return `/avatars/${fileName}`;
  } catch (err) {
     console.error("❌ Falha ao baixar avatar:", err);
     return null;
  }
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

/**
 * Verifica se o usuário pode receber notificação (respeitando o intervalo)
 */
function canNotifyUser(user: any): boolean {
  if (!user.notificationInterval || user.notificationInterval === 0) return true;
  if (!user.lastNotificationAt) return true;

  const now = new Date();
  const last = new Date(user.lastNotificationAt);
  const diffMinutes = (now.getTime() - last.getTime()) / (1000 * 60);

  return diffMinutes >= user.notificationInterval;
}

/**
 * Atualiza o timestamp da última notificação enviada
 */
async function markNotificationSent(userId: string) {
  try {
     await (prisma as any).user.update({
        where: { id: userId },
        data: { lastNotificationAt: new Date() }
     });
  } catch (e) {
     console.error(`❌ Erro ao atualizar lastNotificationAt para ${userId}:`, e);
  }
}

/**
 * Tenta enviar a mensagem para vários formatos de número (com/sem 9 extra)
 */
async function sendSafeAlert(phone: string, msg: string, userName: string): Promise<void> {
  const rawPhone = phone.replace(/\D/g, '');
  
  const attemptSend = async (jid: string): Promise<boolean> => {
     try {
        await client.sendMessage(jid, msg);
        console.log(`🔔 [SUCESSO] Alerta enviado para ${userName} (${jid})`);
        return true;
     } catch (err: any) {
        console.warn(`⚠️ [FALHA] Não foi possível enviar para ${jid} (${userName}): ${err.message}`);
        return false;
     }
  };

  // Tenta o JID original
  if (await attemptSend(`${rawPhone}@c.us`)) return;

  // Se falhar e for BR, tenta variações do 9º dígito
  if (rawPhone.startsWith('55')) {
     let alternativePhone = '';
     if (rawPhone.length === 13) {
        // Tem 9, tenta tirar
        alternativePhone = rawPhone.slice(0, 4) + rawPhone.slice(5);
     } else if (rawPhone.length === 12) {
        // Não tem 9, tenta colocar
        alternativePhone = rawPhone.slice(0, 4) + '9' + rawPhone.slice(4);
     }

     if (alternativePhone && alternativePhone !== rawPhone) {
        if (await attemptSend(`${alternativePhone}@c.us`)) return;
     }
  }

  console.error(`❌ [ALERTA DESISTIDO] Todas as tentativas de enviar para ${userName} falharam.`);
}

const client = new Client({
  authStrategy: new LocalAuth({ dataPath: './wwebjs_auth', clientId: 'zabot' }),
  puppeteer: {
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-gpu',
      '--disable-extensions'
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
    } else if (dbConfig?.status === 'SCAN_REQUESTED') {
      console.log('📸 Pedido de Varredura de fotos recebido...');
      await scanProfilePhotos();
      await (prisma as any).botConfig.update({
        where: { id: dbConfig.id },
        data: { status: 'CONNECTED' }
      });
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
        // Formata o ID do WhatsApp — Limpa e garante @c.us
        let cleanNumber = lead.phone.replace(/\D/g, '').split(':')[0];
        let jid = `${cleanNumber}@c.us`;
        
        console.log(`📸 Buscando foto para: ${lead.name} (${jid})...`);
        
        let picUrl = null;
        try {
           const contact = await client.getContactById(jid);
           picUrl = await contact.getProfilePicUrl();
           
           // Se falhar e for BR com 13 dígitos, tenta sem o '9' (DDI 55 + DDD + 9 dígitos)
           if (!picUrl && cleanNumber.startsWith('55') && cleanNumber.length === 13) {
              const alternativeNumber = cleanNumber.slice(0, 4) + cleanNumber.slice(5);
              const altJid = `${alternativeNumber}@c.us`;
              console.log(`🔍 Tentando versão sem o '9': ${altJid}`);
              const altContact = await client.getContactById(altJid);
              picUrl = await altContact.getProfilePicUrl();
           }
        } catch (e) {
           console.log(`❌ Contato ${lead.name} não localizado.`);
        }
        
        if (picUrl) {
           const localPath = await downloadProfilePic(picUrl, lead.id);
           if (localPath) {
              await (prisma as any).lead.update({
                where: { id: lead.id },
                data: { profilePic: localPath }
              });
              console.log(`✅ Foto de ${lead.name} SALVA LOCALMENTE!`);
           }
        }
        
        // Delay curto para evitar bloqueio mas manter fluidez
        await new Promise(r => setTimeout(r, 1000));
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
    // 🛡️ FILTRO DE PRIVACIDADE: Ignorar o que não é conversa privada
    if (msg.fromMe) return;
    if (msg.from.includes('@g.us')) return;        // Grupos
    if (msg.from.includes('broadcast')) return;     // Status
    if (msg.from.includes('@newsletter')) return;   // Canais

    // ✅ getContact() resolve o NÚMERO REAL — sem problema de LID
    const contact = await msg.getContact();
    const phoneOnly = contact.number; // ex: 5527999998888
    const participantName = contact.name || contact.pushname || 'Cliente WhatsApp';
    const textMessage = msg.body || '';
    const isBusiness = (contact as any).isBusiness || false;
    const source = isBusiness ? 'WhatsApp Business' : 'WhatsApp Bot';

    console.log(`📩 Mensagem de: ${participantName} (${phoneOnly})${isBusiness ? ' 🏢 Empresa' : ''}`);

    const cfg = await (prisma as any).botConfig.findFirst();

    // Busca foto de perfil com retry (WHATSAPP as vezes demora para liberar a URL na primeira msg)
    let profilePic: string | null = null;
    try {
      for (let attempt = 0; attempt < 3; attempt++) {
        profilePic = await contact.getProfilePicUrl() || null;
        if (profilePic) break;
        await new Promise(r => setTimeout(r, 1000)); // Espera 1s entre tentativas
      }
    } catch {
      // Contato não tem foto pública ou erro de rede
    }

    // Checa se já existe lead com esse número
    let lead = await (prisma as any).lead.findFirst({ where: { phone: phoneOnly } });

    if (!lead) {
      console.log(`✨ Novo Lead: ${participantName} (${phoneOnly})`);

      // Lógica Round Robin
      let assignedToId: string | null = null;
      let sellers: any[] = [];
      
      if (cfg?.isRoundRobin) {
        sellers = await (prisma as any).user.findMany({
          where: { role: 'SELLER' },
          include: { leads: { where: { status: 'CONTACTED' } } }
        });
        
        if (sellers.length > 0) {
          const sortedSellers = [...sellers].sort((a: any, b: any) => a.leads.length - b.leads.length);
          assignedToId = sortedSellers[0].id;
        }
      }

      lead = await (prisma as any).lead.create({
        data: {
          name: participantName,
          phone: phoneOnly,
          profilePic: null, // Será atualizado logo abaixo se houver foto
          source,
          status: assignedToId ? 'CONTACTED' : 'NEW',
          assignedToId
        }
      });

      // Baixa foto agora que temos o ID do lead
      if (profilePic) {
         const localPath = await downloadProfilePic(profilePic, lead.id);
         if (localPath) {
            await (prisma as any).lead.update({
               where: { id: lead.id },
               data: { profilePic: localPath }
            });
            lead.profilePic = localPath;
         }
      }

      // Envia mensagem de saudação
      const greeting = `${cfg?.welcomeMessage}\n\n${cfg?.transferMessage}`;
      await msg.reply(greeting);

      // 🔔 ALERTA SILENCIOSO VIA WHATSAPP (Atraso de 2s p/ estabilidade)
      setTimeout(async () => {
         let targetUsers: any[] = [];
         
         if (assignedToId) {
            // Avisa o vendedor escolhido
            const ts = sellers.find((s: any) => s.id === assignedToId);
            if (ts) targetUsers.push(ts);
         } else {
            // Fila Geral (Round-Robin Desativado): Avisa TODOS os plantonistas da equipe!
            try {
               const allActiveStaff = await (prisma as any).user.findMany({
                  where: { 
                     notificationsEnabled: true,
                     notificationPhone: { not: null }
                  },
                  select: { id: true, name: true, notificationPhone: true, notificationsEnabled: true, lastNotificationAt: true, notificationInterval: true }
               });
               targetUsers = allActiveStaff;
            } catch (e) {
               console.error("Erro ao buscar equipe para alerta:", e);
            }
         }

         try {
            const dbUsers = await (prisma as any).user.findMany({
               select: { name: true, role: true, notificationsEnabled: true, notificationPhone: true }
            });
            console.log(`🔎 [RAIO-X DO BANCO DE DADOS] Usuários reais na VPS:`, JSON.stringify(dbUsers));
         } catch(e) { }

         console.log(`🤖 Filtro de Alertas concluído. Plantonistas elegíveis: ${targetUsers.length}`);
         
         if (targetUsers.length === 0) {
            console.log(`⚠️ Nenhum administrador ou vendedor configurou o WhatsApp para receber alertas.`);
         }

         for (const user of targetUsers) {
            // Se for Round Robin e o usuário direto for encontrado, pegamos os dados completos dele se necessário
            // No caso de targetUsers da Fila Geral, já temos os dados pelo select acima.
            
            if (user.notificationsEnabled && user.notificationPhone) {
               // Verifica intervalo de "cooling"
               if (!canNotifyUser(user)) {
                  console.log(`⏳ [RESFRIAMENTO] Alerta de novo lead ignorado para ${user.name} (intervalo de ${user.notificationInterval}min)`);
                  continue;
               }

               try {
                  const rawPhone = user.notificationPhone.replace(/\D/g, '');
                  const sellerJid = `${rawPhone}@c.us`;
                  
                  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://portalfvp.duckdns.org') + '?v=2';
                  const alertMsg = assignedToId 
                     ? `🔔 *Novo Lead na sua Carteira!*\n\nLead: *${participantName}*\n\n🚀 *Atenda agora:* \n${appUrl}/dashboard/vendas`
                     : `🔔 *Lead na Fila Geral!*\n\nLead: *${participantName}*\nNenhum vendedor fixo.\n\n🚀 *Assuma o chat:* \n${appUrl}/dashboard/vendas`;
                  
                  console.log(`📡 Disparando alerta de novo lead para: ${user.name} (${user.notificationPhone})...`);
                  await sendSafeAlert(user.notificationPhone, alertMsg, user.name);
                  await markNotificationSent(user.id);
                  console.log(`✅ [ALERTA ENTREGUE] Mensagem recebida por ${user.name}!`);
               } catch (alertErr: any) {
                  console.error(`❌ [FALHA NO ALERTA] Erro ao enviar para ${user.name}:`, alertErr.message || alertErr);
               }
            }
         }
      }, 2000);

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

      // Se não tem foto, tenta buscar agora que mandou msg (contato quente)
      if (!lead.profilePic) {
         try {
           for (let attempt = 0; attempt < 3; attempt++) {
             profilePic = await contact.getProfilePicUrl() || null;
             if (profilePic) break;
             await new Promise(r => setTimeout(r, 1000));
           }
           if (profilePic) {
              const localPath = await downloadProfilePic(profilePic, lead.id);
              if (localPath) {
                 updates.profilePic = localPath;
                 console.log(`📸 Foto recuperada e salva local para: ${lead.name}`);
              }
           }
         } catch(e) {}
      } else if (profilePic && !profilePic.includes('/avatars/')) {
        // Se mudou a foto e ainda é um link externo, baixa p/ o disco
        const localPath = await downloadProfilePic(profilePic, lead.id);
        if (localPath) {
           updates.profilePic = localPath;
           console.log(`📸 Foto atualizada e salva local para ${lead.name}`);
        }
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

      // 🔔 Notifica o atendente sobre a nova mensagem (se configurado)
      if (lead.assignedToId) {
        setTimeout(async () => {
          try {
            const assignee = await (prisma as any).user.findUnique({
              where: { id: lead.assignedToId },
              select: { id: true, name: true, notificationPhone: true, notifyNewMessages: true, lastNotificationAt: true, notificationInterval: true }
            });

            if (assignee?.notifyNewMessages && assignee?.notificationPhone) {
              if (!canNotifyUser(assignee)) {
                console.log(`⏳ [RESFRIAMENTO] Alerta de mensagem ignorado para ${assignee.name}`);
                return;
              }
              const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://portalfvp.duckdns.org') + '?v=2';
              const newMsgAlert = `💬 *Nova mensagem no CRM!*\n\nLead: *${lead.name}*\n\n👆 Toque para responder:\n${appUrl}/dashboard/vendas`;

              await sendSafeAlert(assignee.notificationPhone, newMsgAlert, assignee.name);
              await markNotificationSent(assignee.id);
            }
          } catch (e) {
            // Silencia erros de notificação p/ não travar o bot
          }
        }, 3000);
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
        content: finalContent || (
          savedMediaType === 'audio' ? '🎙️ Áudio' :
          savedMediaType === 'image' ? '📸 Imagem' :
          savedMediaType === 'video' ? '🎬 Vídeo' :
          savedMediaType === 'document' ? '📄 Documento' : '[Mensagem]'
        ),
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
          const sentMsg = await client.sendMessage(`${om.to}@c.us`, om.body, {
            quotedMessageId: om.quotedMessageId || undefined
          });
          if (sentMsg && sentMsg.id && sentMsg.id._serialized) {
             await (prisma as any).message.updateMany({
                where: { content: om.body, leadId: om.leadId, whatsappId: null, createdAt: { gte: new Date(Date.now() - 60000) } },
                data: { whatsappId: sentMsg.id._serialized }
             }).catch(() => null);
          }
        }
      } else {
        const sentMsg = await client.sendMessage(`${om.to}@c.us`, om.body, {
          quotedMessageId: om.quotedMessageId || undefined
        });
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
