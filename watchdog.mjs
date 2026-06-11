// 🛡️📊 Watchdog + Painel de Status (Lion Team) — roda via cron a cada 5 min.
// - Avisa na hora se algum bot cair (com dedup).
// - Manda um resumo geral 1x por dia de manhã.
import pg from "/root/portalvidaplena/node_modules/pg/lib/index.js";
import envpkg from "/root/portalvidaplena/node_modules/@next/env/dist/index.js";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";

const execAsync = promisify(exec);
envpkg.loadEnvConfig("/root/portalvidaplena");

const TOKEN = process.env.ALERT_TELEGRAM_TOKEN;
const CHAT = process.env.ALERT_TELEGRAM_CHATID;
const STATE_FILE = "/root/portalvidaplena/.watchdog-state.json";
const REPEAT_MIN = 60;          // re-alerta a cada 60 min se continuar caído
const HORA_RESUMO = 9;          // hora (Brasília) do resumo diário

// Bots monitorados: nome no pm2 -> { rótulo, tipo }
const BOTS = [
  { pm2: "portalfvp-bot",          nome: "Vida Plena",        tipo: "wa", whatsapp: true },
  { pm2: "restaura-fotos-bot",     nome: "Restaura Fotos",    tipo: "wa" },
  { pm2: "ceo-telegram",           nome: "CEO Bot",           tipo: "tg" },
  { pm2: "imagem-bot",             nome: "Gera Imagem",       tipo: "tg" },
  { pm2: "wwvisaobot",             nome: "Visão IA",          tipo: "tg" },
  { pm2: "wwaudiobot",             nome: "Áudio IA",          tipo: "tg" },
  { pm2: "telegram-video-bot",     nome: "Baixa Vídeos",      tipo: "tg" },
  { pm2: "telegram-afiliados-bot", nome: "Afiliados",         tipo: "tg" },
  { pm2: "testemunhos-bot",        nome: "Testemunhos",       tipo: "tg" },
  { pm2: "financeiro-telegram",    nome: "Financeiro",        tipo: "tg" },
];

function horaSP() {
  return parseInt(new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", hour12: false }).format(new Date()));
}
function hojeSP() {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit" }).format(new Date());
}
function lerEstado() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, "utf8")); } catch { return { saudavel: true, ultimoAlerta: 0, ultimoResumo: "" }; }
}
function salvarEstado(s) { try { fs.writeFileSync(STATE_FILE, JSON.stringify(s)); } catch {} }

async function telegram(msg) {
  if (!TOKEN || !CHAT) { console.log("[watchdog] sem ALERT_TELEGRAM_TOKEN/CHATID no .env."); return false; }
  try {
    const r = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: CHAT, text: msg, parse_mode: "HTML" })
    });
    return r.ok;
  } catch (e) { console.error("[watchdog] erro telegram:", e.message); return false; }
}

async function statusPm2() {
  try {
    const { stdout } = await execAsync("pm2 jlist", { maxBuffer: 1024 * 1024 * 8 });
    const lista = JSON.parse(stdout);
    const map = {};
    for (const p of lista) map[p.name] = p.pm2_env?.status;
    return map;
  } catch { return null; }
}

async function statusWhatsAppVidaPlena() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const { rows } = await pool.query('SELECT status FROM "BotConfig" LIMIT 1');
    return rows[0]?.status || "DESCONHECIDO";
  } catch { return "DESCONHECIDO"; }
  finally { await pool.end().catch(() => {}); }
}

// Idade (min) do arquivo mais recente da sessão do WhatsApp. Sessão conectada
// tem escrita constante do Chromium; parada há muito tempo = cliente zumbi
// (processo "online" no pm2 e status CONNECTED congelado no banco).
const SESSAO_DIR = "/root/portalvidaplena/wwebjs_auth/session-zabot";
const SESSAO_MAX_MIN = 30;
async function idadeSessaoMin() {
  try {
    const { stdout } = await execAsync(`find '${SESSAO_DIR}' -type f -printf '%T@\\n' 2>/dev/null | sort -rn | head -1`);
    const ts = parseFloat(stdout.trim());
    if (!ts) return null;
    return Math.round(Date.now() / 60000 - ts / 60);
  } catch { return null; }
}

async function main() {
  const pm2map = await statusPm2();
  const waVP = await statusWhatsAppVidaPlena();
  const idadeSessao = await idadeSessaoMin();

  // Avalia cada bot
  const linhas = [];
  const problemas = [];
  for (const b of BOTS) {
    const st = pm2map ? pm2map[b.pm2] : "online"; // se não der pra checar pm2, assume ok
    let ok = st === "online";
    let detalhe = "";
    if (b.whatsapp) { // Vida Plena: precisa também estar CONNECTED no WhatsApp
      if (ok && waVP !== "CONNECTED") { ok = false; detalhe = waVP === "QR_READY" ? "precisa ler QR" : "WhatsApp " + (waVP || "?"); }
      if (ok && idadeSessao !== null && idadeSessao > SESSAO_MAX_MIN) {
        ok = false; detalhe = `possível zumbi — sessão WhatsApp sem atividade há ${idadeSessao}min`;
      }
    }
    if (!ok && !detalhe) detalhe = st === undefined ? "não encontrado" : "parado";
    const icone = ok ? "✅" : "❌";
    linhas.push(`${icone} ${b.nome}${detalhe ? " — " + detalhe : ""}`);
    if (!ok) problemas.push(`❌ <b>${b.nome}</b> — ${detalhe}`);
  }

  const total = BOTS.length;
  const okCount = total - problemas.length;
  const st = lerEstado();
  const agora = Date.now();
  const saudavel = problemas.length === 0;

  // 1) ALERTA imediato se houver problema
  if (!saudavel) {
    const deveAlertar = st.saudavel || (agora - (st.ultimoAlerta || 0)) > REPEAT_MIN * 60000;
    if (deveAlertar) {
      await telegram(`🚨 <b>Alerta — Lion Team</b>\n\n${problemas.join("\n")}\n\n${okCount}/${total} bots no ar. Verifique o painel.`);
      console.log("[watchdog] ALERTA:", problemas.length, "problema(s)");
    }
    salvarEstado({ ...st, saudavel: false, ultimoAlerta: deveAlertar ? agora : (st.ultimoAlerta || 0) });
  } else {
    if (!st.saudavel) {
      await telegram(`✅ <b>Tudo normalizado!</b> ${total}/${total} bots no ar novamente.`);
      console.log("[watchdog] recuperado");
    }
    salvarEstado({ ...st, saudavel: true, ultimoAlerta: 0 });
  }

  // 2) RESUMO diário (1x por dia, de manhã)
  const st2 = lerEstado();
  if (horaSP() === HORA_RESUMO && st2.ultimoResumo !== hojeSP()) {
    const wa = linhas.filter((_, i) => BOTS[i].tipo === "wa");
    const tg = linhas.filter((_, i) => BOTS[i].tipo === "tg");
    const cab = saudavel ? `🟢 Tudo no ar (${okCount}/${total})` : `🟡 ${okCount}/${total} no ar`;
    await telegram(
      `📊 <b>Status dos Bots — Lion Team</b>\n<i>${hojeSP()} • ${cab}</i>\n\n` +
      `📱 <b>WhatsApp</b>\n${wa.join("\n")}\n\n💬 <b>Telegram</b>\n${tg.join("\n")}`
    );
    salvarEstado({ ...st2, ultimoResumo: hojeSP() });
    console.log("[watchdog] resumo diário enviado");
  }

  process.exit(0);
}
main();
