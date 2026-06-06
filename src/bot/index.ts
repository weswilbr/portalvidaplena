import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

import { Client, LocalAuth, MessageMedia } from 'whatsapp-web.js';
import ffmpeg from 'fluent-ffmpeg';
import { transcribeAudio, prospectReply, followupReply } from '../lib/gemini';
import * as QRCode from 'qrcode';
import qrcodeTerminal from 'qrcode-terminal';
import prisma from '../lib/prisma';
import * as path from 'path';
import * as fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);

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
 * 🎙️ Gera ÁUDIO DE VOZ a partir de texto (TTS Pollinations) e converte pro
 * formato de voz do WhatsApp (OGG Opus). Retorna o caminho do .ogg ou null.
 */
async function gerarAudioVoz(texto: string, voiceOverride?: string): Promise<string | null> {
  if (!texto?.trim()) return null;
  const voice = (voiceOverride && voiceOverride.trim()) || process.env.POLLINATIONS_VOICE || 'pt-BR-FranciscaNeural';
  const tmpDir = path.join(process.cwd(), 'public', 'uploads');
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
  const mp3 = path.join(tmpDir, `voz-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.mp3`);
  let raw: string | null = null;
  try {
    if (voice.startsWith('piper:')) {
      // 🏠 Piper (local/offline, grátis) — sintetiza na própria VPS
      const modelName = voice.split(':')[1] || 'faber';
      const model = `/root/piper-voices/pt_BR-${modelName}-medium.onnx`;
      const wav = mp3.replace(/\.mp3$/, '.wav');
      const txt = wav + '.txt';
      fs.writeFileSync(txt, texto.slice(0, 800));
      await execAsync(`/usr/local/bin/piper -m "${model}" -f "${wav}" < "${txt}"`, { timeout: 30000 });
      fs.unlink(txt, () => {});
      raw = wav;
    } else if (voice.startsWith('pt-BR-') || voice.includes('Neural')) {
      // 🆓 Edge-TTS (Microsoft, grátis) — roda local chamando o serviço da MS
      const txt = mp3 + '.txt';
      fs.writeFileSync(txt, texto.slice(0, 800));
      await execAsync(`/usr/local/bin/edge-tts --file "${txt}" --voice ${voice} --write-media "${mp3}"`, { timeout: 30000 });
      fs.unlink(txt, () => {});
      raw = mp3;
    } else {
      // 💎 Pollinations (ElevenLabs, pago em pólen)
      const token = process.env.POLLINATIONS_TOKEN;
      if (!token) return null;
      const model = process.env.POLLINATIONS_TTS_MODEL || 'elevenlabs';
      const r = await fetch('https://gen.pollinations.ai/v1/audio/speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ model, input: texto.slice(0, 600), voice })
      });
      if (!r.ok) { console.warn('⚠️ TTS Pollinations falhou:', r.status); return null; }
      fs.writeFileSync(mp3, Buffer.from(await r.arrayBuffer()));
      raw = mp3;
    }
    if (!raw || !fs.existsSync(raw) || fs.statSync(raw).size < 500) return null;
    const ogg = await convertAudioToVoice(raw);
    fs.unlink(raw, () => {});
    return ogg && fs.existsSync(ogg) ? ogg : null;
  } catch (e: any) {
    console.error('❌ Erro ao gerar voz:', e?.message || e);
    if (raw) fs.unlink(raw, () => {});
    return null;
  }
}

/**
 * Envia uma mensagem de VOZ (OGG Opus) como áudio nativo do WhatsApp.
 */
async function enviarVoz(chat: any, oggPath: string, textoOriginal: string, leadId?: string): Promise<boolean> {
  try {
    try { await chat.sendStateRecording?.(); } catch {}
    await sleep(1500);
    const media = MessageMedia.fromFilePath(oggPath);
    await client.sendMessage(chat.id._serialized, media, { sendAudioAsVoice: true });
    await (prisma as any).message.create({
      data: { content: textoOriginal, leadId: leadId || undefined, isSystem: false, mediaType: 'audio' }
    }).catch(() => {});
    fs.unlink(oggPath, () => {});
    return true;
  } catch (e: any) {
    console.error('❌ Erro ao enviar voz:', e?.message || e);
    return false;
  }
}

/**
 * 📣 Avisa o "Grupo de Bots" (via CEO Bot) — usado p/ handoff de reunião/lead que quer humano.
 */
async function avisarGrupo(texto: string): Promise<void> {
  const token = process.env.ALERT_TELEGRAM_TOKEN;
  const chat = process.env.ALERT_TELEGRAM_CHATID;
  if (!token || !chat) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chat, text: texto, parse_mode: 'HTML' })
    });
  } catch (e: any) { console.error('Erro ao avisar grupo:', e?.message || e); }
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

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

/**
 * 💬 ENVIO HUMANIZADO — simula digitação real de um brasileiro no zap.
 * Manda os balões um a um, com "digitando..." e pausas proporcionais ao texto.
 */
async function sendHumanized(chat: any, messages: string[]) {
  for (const raw of messages) {
    const text = (raw || '').trim();
    if (!text) continue;
    try {
      await chat.sendStateTyping();
    } catch {}
    // Tempo de "digitação": ~30ms por caractere, entre 0.8s e 3s (ágil mas natural)
    const typingMs = Math.min(3000, Math.max(800, text.length * 30));
    await sleep(typingMs);
    try {
      await client.sendMessage(chat.id._serialized, text);
      await (prisma as any).message.create({
        data: { content: text, leadId: (chat as any)._leadId || undefined, isSystem: true }
      }).catch(() => {});
    } catch (e: any) {
      console.error('❌ Erro no envio humanizado:', e?.message || e);
    }
    // Pausa curta natural entre um balão e outro
    await sleep(400 + Math.floor(Math.random() * 500));
  }
  try { await chat.clearState(); } catch {}
}

/**
 * 🎬 Envia o material de apresentação (vídeo/PDF/imagem) da pasta public/prospeccao.
 * Basta o usuário subir os arquivos com esses nomes. Envia só o que existir.
 */
const PROSPECCAO_DIR = path.join(process.cwd(), 'public', 'prospeccao');
async function enviarApresentacao(chat: any, leadId: string): Promise<boolean> {
  try {
    if (!fs.existsSync(PROSPECCAO_DIR)) {
      console.log('⚠️ Pasta de apresentação ainda não existe (suba os arquivos em public/prospeccao).');
      return false;
    }
    const arquivos = fs.readdirSync(PROSPECCAO_DIR).filter(f => /^apresentacao\./i.test(f));
    if (arquivos.length === 0) {
      console.log('⚠️ Nenhum arquivo "apresentacao.*" encontrado em public/prospeccao.');
      return false;
    }
    try { await chat.sendStateTyping(); } catch {}
    await sleep(2000);
    for (const nome of arquivos) {
      const abs = path.join(PROSPECCAO_DIR, nome);
      const media = MessageMedia.fromFilePath(abs);
      await client.sendMessage(chat.id._serialized, media, {
        caption: '🎥 Dá um play nesse vídeo rapidinho que aqui explica tudo certinho 👇'
      });
      console.log(`📤 Apresentação enviada (${nome}) para lead ${leadId}`);
      await (prisma as any).message.create({
        data: { content: '🎥 [Apresentação enviada]', leadId, isSystem: true }
      }).catch(() => {});
      await sleep(1200);
    }
    return true;
  } catch (e: any) {
    console.error('❌ Erro ao enviar apresentação:', e?.message || e);
    return false;
  }
}

// ============================================================================
// 🧠 FILA + DEBOUNCE + MEMÓRIA — o coração da naturalidade do bot
// ----------------------------------------------------------------------------
// Quando a pessoa manda mensagens, NÃO respondemos na hora. Agendamos com um
// timer. Se ela mandar mais coisa (texto, áudio...), o timer RESETA — o bot
// espera ela terminar de falar pra então "digerir" tudo e responder com calma.
// ============================================================================
const aiDebounceTimers = new Map<string, NodeJS.Timeout>();
const aiLastMsg = new Map<string, any>();        // leadId -> última msg (pra reagir)
const aiProcessing = new Set<string>();          // leads sendo processados agora

function agendarRespostaIA(leadId: string, waFrom: string, msg: any, cfg: any, primeiraResposta: boolean = false) {
  aiLastMsg.set(leadId, msg);

  const anterior = aiDebounceTimers.get(leadId);
  if (anterior) clearTimeout(anterior);

  let delayMs: number;
  if (primeiraResposta) {
    // 1º contato: lead de tráfego está quente → responde rapidinho (~3s)
    delayMs = 2500 + Math.floor(Math.random() * 1500);
  } else {
    // Tempo de "digestão" configurável (BotConfig.aiDelaySeconds), com variação humana.
    const base = Math.max(5, Number(cfg?.aiDelaySeconds) || 40);
    const jitter = base * (0.75 + Math.random() * 0.5); // ±25%
    delayMs = Math.round(jitter * 1000);
  }

  console.log(`⏳ IA vai responder o lead ${leadId} em ~${Math.round(delayMs / 1000)}s (aguardando a pessoa terminar de falar)...`);

  const t = setTimeout(() => {
    aiDebounceTimers.delete(leadId);
    processarRespostaIA(leadId, waFrom).catch(e =>
      console.error('❌ Erro no processamento da IA:', e?.message || e)
    );
  }, delayMs);

  aiDebounceTimers.set(leadId, t);
}

async function processarRespostaIA(leadId: string, waFrom: string) {
  if (aiProcessing.has(leadId)) return; // já tem um processamento rolando
  aiProcessing.add(leadId);
  try {
    const lead = await (prisma as any).lead.findUnique({ where: { id: leadId } });
    if (!lead || lead.aiActive === false) return; // humano assumiu ou lead sumiu
    // Note: null/undefined aiActive = bot deve responder (lead novo ou em descoberta)

    const cfg = await (prisma as any).botConfig.findFirst();
    if (cfg?.aiEnabled === false) return;

    // 🛡️ ANTI-LOOP: se trocou mensagens demais num intervalo curto, é bot/autoresponder
    // do outro lado (loop) ou spam → pausa a IA pra esse lead e para de responder.
    try {
      const recentes = await (prisma as any).message.count({
        where: { leadId, createdAt: { gte: new Date(Date.now() - 4 * 60000) } }
      });
      if (recentes >= 25) {
        await (prisma as any).lead.update({ where: { id: leadId }, data: { aiActive: false } }).catch(() => {});
        console.warn(`🛑 ANTI-LOOP: ${lead.name} (${lead.phone}) com ${recentes} msgs em 4min — IA pausada (provável bot/loop).`);
        return;
      }
    } catch {}

    // 🔁 Lead voltou a responder → zera o contador de follow-up
    if (lead.followupCount && lead.followupCount > 0) {
      await (prisma as any).lead.update({ where: { id: leadId }, data: { followupCount: 0 } }).catch(() => {});
    }

    // Histórico recente (até 16 mensagens, ordem cronológica)
    const ultimas = await (prisma as any).message.findMany({
      where: { leadId },
      orderBy: { createdAt: 'desc' },
      take: 16,
      select: { content: true, isSystem: true, authorId: true, whatsappId: true }
    });
    const historico = ultimas.reverse().map((m: any) => {
      // LEAD = mensagem RECEBIDA do convidado (tem whatsappId). Tudo o mais (bot/humano/sistema) = EU.
      const quem = (!m.isSystem && !m.authorId && m.whatsappId) ? 'LEAD' : 'EU';
      return `${quem}: ${m.content}`;
    }).join('\n');

    const chat = await client.getChatById(waFrom).catch(() => null);
    if (!chat) { console.warn(`⚠️ Não consegui abrir o chat ${waFrom}`); return; }
    (chat as any)._leadId = leadId;

    // 📚 Base de conhecimento — materiais que o admin subiu no portal (slides, preços...)
    let conhecimento = "";
    try {
      const itens = await (prisma as any).knowledgeItem.findMany({
        where: { active: true },
        orderBy: { createdAt: 'asc' },
        select: { title: true, content: true }
      });
      conhecimento = itens
        .map((k: any) => `### ${k.title}\n${k.content}`)
        .join("\n\n")
        .slice(0, 14000); // protege a janela de contexto
    } catch (e: any) {
      console.error('Erro ao ler base de conhecimento:', e?.message || e);
    }

    // 🎯 Fase do funil (sincronizada com o Kanban) — o bot reage conforme a etapa
    const FASES: Record<string, string> = {
      NEW: 'RECEPÇÃO',
      CONTACTED: 'RELACIONAMENTO',
      PRESENTED: 'APRESENTAÇÃO',
      REMARKETING: 'PRONTO P/ CADASTRO',
      CLOSED: 'CADASTRADO',
      FOLLOWUP: 'ACOMPANHAMENTO',
      LOST: 'PERDIDO'
    };
    const fase = FASES[lead.status] || 'RECEPÇÃO';

    // ⏰ Momento do dia no fuso de São Paulo/Brasília (pra saudação correta)
    let momento = '';
    try {
      const horaSP = parseInt(new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', hour12: false }).format(new Date()));
      const dataSP = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date());
      const periodo = horaSP < 6 ? `madrugada — saudação "boa noite"`
        : horaSP < 12 ? `manhã — saudação "bom dia"`
        : horaSP < 18 ? `tarde — saudação "boa tarde"`
        : `noite — saudação "boa noite"`;
      momento = `hoje é ${dataSP}, ${horaSP}h (${periodo})`;
    } catch {}

    const ia = await prospectReply(lead.name || 'amigo(a)', historico, lead.aiMemory || '', cfg?.aiModel || undefined, conhecimento, fase, !!lead.apresentacaoEnviada, momento);

    console.log(`🤖 IA (${ia.stage}) → ${lead.name}: ${ia.messages.length} balão(ões)${ia.react ? ' react:' + ia.react : ''}${ia.sendVideo ? ' +vídeo' : ''}${ia.hot ? ' 🔥' : ''}`);

    // 😄 Reage à última mensagem da pessoa (de vez em quando)
    if (ia.react) {
      const last = aiLastMsg.get(leadId);
      if (last) { try { await last.react(ia.react); } catch {} }
    }

    // 💬 Responde — às vezes em VOZ (TTS), senão em texto humanizado
    if (ia.messages.length > 0) {
      const modoVoz = cfg?.voiceMode || 'OFF';
      const usarVoz = modoVoz === 'ALWAYS' || (modoVoz === 'SOMETIMES' && Math.random() < 0.3);
      let enviouVoz = false;
      if (usarVoz) {
        const textoFalado = ia.messages.join(' ');
        const ogg = await gerarAudioVoz(textoFalado, cfg?.voiceName);
        if (ogg) {
          enviouVoz = await enviarVoz(chat, ogg, textoFalado, leadId);
          if (enviouVoz) console.log(`🎙️ Resposta enviada em VOZ para ${lead.name}`);
        }
      }
      // Se não usou voz (ou falhou), manda texto normal
      if (!enviouVoz) {
        await sendHumanized(chat, ia.messages);
      }
    }

    // 🧠 Atualiza a memória longa do lead
    if (ia.memoryUpdate) {
      await (prisma as any).lead.update({
        where: { id: leadId },
        data: { aiMemory: ia.memoryUpdate }
      }).catch(() => {});
    }

    // 📇 Captura nome real (se o card ainda é genérico) e cidade → registra no CRM
    const updCRM: Record<string, any> = {};
    const nomeGenerico = !lead.name || /cliente whatsapp|amigo/i.test(lead.name);
    if (ia.nomeDetectado && nomeGenerico) updCRM.name = ia.nomeDetectado;
    if (ia.cidade && !lead.cidade) updCRM.cidade = ia.cidade;
    if (Object.keys(updCRM).length > 0) {
      await (prisma as any).lead.update({ where: { id: leadId }, data: updCRM }).catch(() => {});
      console.log(`📇 CRM atualizado p/ ${updCRM.name || lead.name}: ${JSON.stringify(updCRM)}`);
    }

    // 📊 FUNIL: ao começar a conversar, sai de "Recepção" (NEW) p/ "Relacionamento" (CONTACTED)
    if (lead.status === 'NEW') {
      await (prisma as any).lead.update({
        where: { id: leadId },
        data: { status: 'CONTACTED' }
      }).catch(() => {});
      console.log(`📊 Funil: ${lead.name} → RELACIONAMENTO`);
    }

    // 🎬 Envia a apresentação no momento certo → move p/ "Apresentação" (PRESENTED)
    if (ia.sendVideo && !lead.apresentacaoEnviada) {
      const ok = await enviarApresentacao(chat, leadId);
      if (ok) {
        await (prisma as any).lead.update({
          where: { id: leadId },
          data: { apresentacaoEnviada: true, status: 'PRESENTED' }
        }).catch(() => {});
        console.log(`📊 Funil: ${lead.name} → APRESENTAÇÃO`);
      }
    }

    const nomeLead = ia.nomeDetectado || lead.name || 'Lead';
    const cidadeLead = ia.cidade || lead.cidade || '';
    const appUrlBase = (process.env.NEXT_PUBLIC_APP_URL || 'https://portalfvp.duckdns.org') + '/dashboard/atendimento';

    // 📅 REUNIÃO: lead escolheu videochamada e deu dia/hora → cria na Agenda, avisa o grupo, passa pro humano
    if (ia.reuniaoQuando) {
      await (prisma as any).lead.update({
        where: { id: leadId },
        data: { reuniaoQuando: ia.reuniaoQuando, aiStatus: 'QUENTE', aiActive: false }
      }).catch(() => {});

      // Cria o evento na Agenda do portal (categoria Reunião) se a IA converteu pra data válida
      let agendado = '';
      if (ia.reuniaoISO) {
        const dt = new Date(ia.reuniaoISO + ':00-03:00'); // horário de Brasília
        if (!isNaN(dt.getTime())) {
          await (prisma as any).agendaItem.create({
            data: {
              title: `📞 Reunião: ${nomeLead}`,
              description: `Videochamada com lead da prospecção.\nTelefone: ${lead.phone}${cidadeLead ? '\nCidade: ' + cidadeLead : ''}\nPediu: "${ia.reuniaoQuando}"`,
              start: dt,
              end: new Date(dt.getTime() + 30 * 60000),
              category: 'Reunião',
              status: 'PENDING'
            }
          }).catch((e: any) => console.error('Erro ao criar agenda:', e?.message || e));
          agendado = `\n📌 Lançado na Agenda: ${dt.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' })}`;
        }
      }

      await avisarGrupo(`📅 <b>REUNIÃO solicitada!</b>\n\n👤 <b>${nomeLead}</b>${cidadeLead ? ' — ' + cidadeLead : ''}\n📱 ${lead.phone}\n🗓️ Quando: <b>${ia.reuniaoQuando}</b>${agendado}\n\nConfirme e envie o link (Zoom/Meet). 🙌\n${appUrlBase}`);
      console.log(`📅 Reunião pedida por ${nomeLead}: ${ia.reuniaoQuando}${agendado ? ' (agendado)' : ''} — grupo avisado, IA pausada.`);
      return;
    }

    // 🙋 PEDE HUMANO / INDECISO → avisa o grupo na hora e passa pro humano
    if (ia.pedeHumano) {
      await (prisma as any).lead.update({
        where: { id: leadId },
        data: { aiActive: false }
      }).catch(() => {});
      await avisarGrupo(`🙋 <b>Lead quer falar com uma pessoa!</b>\n\n👤 <b>${nomeLead}</b>${cidadeLead ? ' — ' + cidadeLead : ''}\n📱 ${lead.phone}\n💬 Está indeciso ou pediu atendimento humano. Assuma agora! 🚀\n${appUrlBase}`);
      console.log(`🙋 ${nomeLead} pediu humano/indeciso — grupo avisado, IA pausada.`);
      return;
    }

    // 🔥 LEAD QUENTE → envia link de cadastro 4Life, move p/ "Pronto p/ Cadastro" e chama o Wesley
    if (ia.hot) {
      // 1) Envia o link de cadastro da 4Life (se configurado)
      const linkCadastro = cfg?.cadastroLink?.trim();
      if (linkCadastro && !lead.linkEnviado) {
        try {
          await sendHumanized(chat, [
            "show, então bora dar o primeiro passo 🚀",
            "esse é o link pra vc fazer seu cadastro e ativar sua posição no projeto:",
            linkCadastro,
            "qualquer dúvida me chama aqui que eu (e meu time) te ajudo no que precisar 🙌"
          ]);
          await (prisma as any).lead.update({
            where: { id: leadId },
            data: { linkEnviado: true }
          }).catch(() => {});
          console.log(`🔗 Link de cadastro 4Life enviado para ${lead.name}`);
        } catch (e: any) {
          console.error('Erro ao enviar link de cadastro:', e?.message || e);
        }
      }

      // 2) Move no funil e passa pro humano acompanhar o cadastro
      await (prisma as any).lead.update({
        where: { id: leadId },
        data: { aiActive: false, aiStatus: 'QUENTE', status: 'REMARKETING' }
      }).catch(() => {});
      console.log(`🔥📊 Funil: ${lead.name} → PRONTO P/ CADASTRO (handoff p/ humano)`);

      // 3) Avisa o time pra conduzir o cadastro pessoalmente
      if (cfg?.globalNotificationsEnabled !== false) {
        try {
          const time = await (prisma as any).user.findMany({
            where: { notificationsEnabled: true, notificationPhone: { not: null } },
            select: { name: true, notificationPhone: true }
          });
          const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://portalfvp.duckdns.org');
          const aviso = `🔥 *PROSPECTO PRONTO P/ CADASTRO!*\n\n👤 *${lead.name}*\n📱 ${lead.phone}\n\nA IA apresentou, a pessoa quer entrar e já recebeu o link de cadastro da 4Life. Assuma agora, conduza o cadastro e a ativação! 🚀\n\n${appUrl}/dashboard/atendimento`;
          for (const u of time) {
            await sendSafeAlert(u.notificationPhone, aviso, u.name).catch(() => {});
          }
        } catch (e) {
          console.error('Erro ao notificar handoff:', e);
        }
      }
    }
  } finally {
    aiProcessing.delete(leadId);
  }
}

// Mapa de fases e helper de horário (compartilhados)
const FASES_FUNIL: Record<string, string> = {
  NEW: 'RECEPÇÃO', CONTACTED: 'RELACIONAMENTO', PRESENTED: 'APRESENTAÇÃO',
  REMARKETING: 'PRONTO P/ CADASTRO', CLOSED: 'CADASTRADO', FOLLOWUP: 'ACOMPANHAMENTO', LOST: 'PERDIDO'
};
function momentoSP(): string {
  try {
    const h = parseInt(new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', hour12: false }).format(new Date()));
    return h < 6 ? `madrugada (${h}h) — "boa noite"` : h < 12 ? `manhã (${h}h) — "bom dia"` : h < 18 ? `tarde (${h}h) — "boa tarde"` : `noite (${h}h) — "boa noite"`;
  } catch { return ''; }
}

// 🔁 FOLLOW-UP AUTOMÁTICO — reativa leads que sumiram (escalonado, em horário comercial)
const FOLLOWUP_DELAYS_H = [3, 24, 72]; // horas após a última msg do bot, por tentativa
let followupRodando = false;
async function verificarLeadsFrios() {
  if (followupRodando) return;
  followupRodando = true;
  try {
    const state = await client.getState().catch(() => null);
    if (state !== 'CONNECTED') return;

    const cfg = await (prisma as any).botConfig.findFirst();
    if (cfg?.aiEnabled === false || cfg?.followupEnabled === false) return;

    // Só em horário comercial (8h–21h Brasília) pra não incomodar
    const horaSP = parseInt(new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', hour12: false }).format(new Date()));
    if (horaSP < 8 || horaSP >= 21) return;

    const leads = await (prisma as any).lead.findMany({
      where: {
        aiActive: { not: false },
        status: { in: ['NEW', 'CONTACTED', 'PRESENTED'] },
        followupCount: { lt: FOLLOWUP_DELAYS_H.length }
      },
      take: 15
    });

    for (const lead of leads) {
      try {
        const ultimas = await (prisma as any).message.findMany({
          where: { leadId: lead.id }, orderBy: { createdAt: 'desc' }, take: 12,
          select: { content: true, isSystem: true, authorId: true, whatsappId: true, createdAt: true }
        });
        if (ultimas.length === 0) continue;
        const last = ultimas[0];
        const lastEhDoLead = !last.isSystem && !last.authorId && last.whatsappId; // recebida do convidado
        if (lastEhDoLead) continue; // se o LEAD falou por último, não é frio (cabe ao fluxo normal)

        const horasDesde = (Date.now() - new Date(last.createdAt).getTime()) / 3600000;
        const delayH = FOLLOWUP_DELAYS_H[lead.followupCount] || 72;
        if (horasDesde < delayH) continue;
        const horasDesdeFollow = lead.lastFollowupAt ? (Date.now() - new Date(lead.lastFollowupAt).getTime()) / 3600000 : 999;
        if (horasDesdeFollow < delayH) continue;

        const historico = ultimas.reverse().map((m: any) => ((!m.isSystem && !m.authorId && m.whatsappId) ? 'LEAD' : 'EU') + ': ' + m.content).join('\n');
        const fase = FASES_FUNIL[lead.status] || 'RELACIONAMENTO';
        const msgs = await followupReply(lead.name || 'amigo(a)', historico, lead.aiMemory || '', fase, momentoSP(), lead.followupCount + 1, cfg?.aiModel || undefined);
        if (!msgs || msgs.length === 0) continue;

        const waId = (lead.phone || '').replace(/\D/g, '') + '@c.us';
        const chat = await client.getChatById(waId).catch(() => null);
        if (!chat) continue;
        (chat as any)._leadId = lead.id;

        await sendHumanized(chat, msgs);
        await (prisma as any).lead.update({
          where: { id: lead.id },
          data: { followupCount: { increment: 1 }, lastFollowupAt: new Date() }
        }).catch(() => {});
        console.log(`🔁 Follow-up #${lead.followupCount + 1} enviado para ${lead.name}`);
        await sleep(4000); // espaça os envios
      } catch (e: any) {
        console.error('Erro no follow-up de um lead:', e?.message || e);
      }
    }
  } catch (e: any) {
    console.error('Erro em verificarLeadsFrios:', e?.message || e);
  } finally {
    followupRodando = false;
  }
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
    executablePath: "/root/.cache/puppeteer/chrome-headless-shell/linux-146.0.7680.31/chrome-headless-shell-linux64/chrome-headless-shell",
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
           // Tenta pegar foto diretamente via getProfilePictureUrl (não precisa do contato em memória)
           picUrl = await client.getProfilePictureUrl(jid);
           
           // Se falhar e for BR com 13 dígitos, tenta sem o '9' (DDI 55 + DDD + 9 dígitos)
           if (!picUrl && cleanNumber.startsWith('55') && cleanNumber.length === 13) {
              const alternativeNumber = cleanNumber.slice(0, 4) + cleanNumber.slice(5);
              const altJid = `${alternativeNumber}@c.us`;
              console.log(`🔍 Tentando versão sem o '9': ${altJid}`);
              picUrl = await client.getProfilePictureUrl(altJid);
           }
        } catch (e) {
           console.log(`❌ Foto não disponível para ${lead.name} (pode não ter foto pública ou está bloqueado).`);
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
        await new Promise(r => setTimeout(r, 500));
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
  let numero: string | undefined;
  try { numero = (client as any).info?.wid?.user; } catch {}
  await (prisma as any).botConfig.update({
    where: { id: cfg.id },
    data: { status: 'CONNECTED', qrCode: null, ...(numero ? { connectedNumber: numero } : {}) }
  });

  // Dispara a varredura inicial em background após 15 segundos da conexão
  setTimeout(() => scanProfilePhotos(), 15000);

  // Mantém um vigilante de fotos a cada 2 horas p/ leads novos (importados/manuais)
  setInterval(() => scanProfilePhotos(), 1000 * 60 * 60 * 2);

  // 🔁 Verifica leads frios pra follow-up a cada 15 min
  setInterval(() => verificarLeadsFrios(), 1000 * 60 * 15);
  setTimeout(() => verificarLeadsFrios(), 60000); // primeira passada 1 min após conectar
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

    // Busca foto de perfil com retry melhorado (WHATSAPP as vezes demora para liberar a URL na primeira msg)
    let profilePic: string | null = null;
    try {
      // Tenta até 5 vezes com delays crescentes
      for (let attempt = 0; attempt < 5; attempt++) {
        profilePic = await contact.getProfilePicUrl() || null;
        if (profilePic) {
          console.log(`📸 Foto capturada para ${participantName} na tentativa ${attempt + 1}`);
          break;
        }
        // Delay crescente: 1s, 2s, 3s, 4s, 5s
        await new Promise(r => setTimeout(r, (attempt + 1) * 1000));
      }
    } catch {
      // Contato não tem foto pública ou erro de rede
    }

    // Checa se já existe lead com esse número
    let lead = await (prisma as any).lead.findFirst({ where: { phone: phoneOnly } });
    const leadNovo = !lead; // 1º contato? (pra responder mais rápido)

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
          status: 'NEW', // Sempre começa em NEW (fase RECEPÇÃO) — evolui após primeiro contato do bot
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

      // 🤝 MODO PROSPECÇÃO (HÍBRIDO): a IA saúda e conduz a conversa.
      // Não enviamos saudação estática nem disparamos alerta pra todo mundo aqui —
      // o time só é avisado quando o lead ESQUENTA (handoff no bloco da IA abaixo).
      console.log(`🤝 Novo lead ${participantName} entrou no funil — IA assume a abordagem.`);

      // (Bloco antigo de alerta em massa desativado — mantido só como referência)
      const _alertaMassaDesativado = async () => {
         if (cfg?.globalNotificationsEnabled === false) {
            console.log(`🔕 Notificações Globais desativadas no BotConfig.`);
            return;
         }
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
                     ? `🔔 *Novo Lead na sua Carteira!*\n\nLead: *${participantName}*\n\n🚀 *Atenda agora:* \n${appUrl}/dashboard/atendimento`
                     : `🔔 *Lead na Fila Geral!*\n\nLead: *${participantName}*\nNenhum vendedor fixo.\n\n🚀 *Assuma o chat:* \n${appUrl}/dashboard/atendimento`;
                  
                  console.log(`📡 Disparando alerta de novo lead para: ${user.name} (${user.notificationPhone})...`);
                  await sendSafeAlert(user.notificationPhone, alertMsg, user.name);
                  await markNotificationSent(user.id);
                  console.log(`✅ [ALERTA ENTREGUE] Mensagem recebida por ${user.name}!`);
               } catch (alertErr: any) {
                  console.error(`❌ [FALHA NO ALERTA] Erro ao enviar para ${user.name}:`, alertErr.message || alertErr);
               }
            }
         }
      };
      void _alertaMassaDesativado; // referência inerte (não dispara)

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

      // 🔔 Notifica o atendente sobre a nova mensagem — SÓ quando o humano já assumiu
      // (IA desligada p/ esse lead). Enquanto a IA cuida, não enchemos o vendedor.
      // EXCEÇÃO: se o lead acabou de agendar reunião (aiActive=false por reunião),
      // já avisamos o grupo — não precisa importunar no PV também.
      const _reuniaoRecemAgendada = !!(lead as any).reuniaoQuando;
      if (lead.assignedToId && (lead as any).aiActive === false && !_reuniaoRecemAgendada) {
        setTimeout(async () => {
          if (cfg?.globalNotificationsEnabled === false) return;
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
              const newMsgAlert = `💬 *Nova mensagem no CRM!*\n\nLead: *${lead.name}*\n\n👆 Toque para responder:\n${appUrl}/dashboard/atendimento`;

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

          // 🎧 Transcreve áudio SÓ quando a IA está cuidando do lead (pra ela "ouvir"
          // o que a pessoa falou e responder com sentido). Custo controlado.
          if (savedMediaType === 'audio' && cfg?.aiEnabled !== false && (lead as any).aiActive !== false) {
             console.log(`🎧 IA: Transcrevendo áudio de ${participantName}...`);
             try {
               const aiResult = await transcribeAudio(media.data, media.mimetype);
               if (aiResult) {
                  finalContent = aiResult;
                  console.log(`✅ IA: Áudio transcrito.`);
               }
             } catch (e: any) {
               console.error('❌ Erro ao transcrever áudio:', e?.message || e);
             }
          }

          console.log(`✅ Mídia (${savedMediaType}) salva em: ${filename}`);
          if (!finalContent) finalContent = `[Arquivo ${savedMediaType}]`;
        } else {
          console.error("❌ Falha ao processar downloadMedia: Retornou nulo.");
        }
      } catch (e: any) {
        console.error("❌ Erro ao baixar/salvar mídia do WhatsApp:", e);
      }
    }

    // Transcrição processada pela IA via Gemini (se ativo) no bloco de mídia acima.


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
        whatsappId: msg.id._serialized // Guarda o RG da mensagem para exclusão futura
      }
    });

    // Incrementa contador de não lidas no Lead
    await (prisma as any).lead.update({
      where: { id: lead.id },
      data: { unreadCount: { increment: 1 } }
    });

    console.log(`📩 Mensagem ${msg.hasMedia ? 'com mídia ' : ''}arquivada no CRM para Lead ${lead.name}`);

    // 🤝 PROSPECTOR IA (modo HÍBRIDO) — em vez de responder na hora, AGENDA a resposta
    // com debounce: se a pessoa mandar mais coisa (texto/áudio), o timer reseta e o bot
    // espera ela terminar de falar pra então digerir tudo e responder com calma.
    const aiLigada = cfg?.aiEnabled !== false;
    const iaNoControle = (lead as any).aiActive !== false;
    if (aiLigada && iaNoControle) {
      agendarRespostaIA(lead.id, msg.from, msg, cfg, leadNovo);
    }

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
        
        // 👤 HUMANO ASSUMIU: se a mensagem tem autor (vendedor), desliga a IA pra esse lead.
        if (om.authorId && om.leadId) {
          await (prisma as any).lead.update({
            where: { id: om.leadId },
            data: { aiActive: false }
          }).catch(() => {});
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
