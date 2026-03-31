# 🛡️ Mapa do Sistema - Portal Vida Plena (CRM & WhatsApp)

Este documento serve como a **"Memória de Longo Prazo"** do projeto para o assistente AI. Se a conversa resetar, leia este arquivo primeiro.

## 🚀 Arquitetura Geral
- **Frontend/Backend**: Next.js 14+ (App Router).
- **Banco de Dados**: PostgreSQL (Supabase) via Prisma ORM.
- **Bot WhatsApp**: `whatsapp-web.js` rodando via PM2 na VPS. Casos de LID vs Phone já resolvidos.
- **Estilo**: TailwindCSS + Lucide Icons + Shadcn/UI (Design Premium).
- **Infra (VPS)**: Sistema rodando em Ubuntu na porta 3000 (Site) e processo separado para o Bot (`zabot`).

---

## 🤖 Configurações do Robô (`src/bot/index.ts`)
- **Áudio (WhatsApp Nativo)**: 
  - Conversão obrigatória para **OGG OPUS 16kHz Mono**.
  - Somente este formato é lido pelo player oficial do WhatsApp (Leads) e pelo player customizado do Painel.
- **Radar de Fotos (Profile Pix)**:
  - Varredura inicial 15s após ligar.
  - Varredura recorrente a cada 2 horas.
  - Delay de 5s entre cada consulta para evitar banimento pelo WhatsApp.
- **Vídeos**: Compressão h264 integrada para envio leve de mídias.

---

## 🎨 Interface & UX (CRM)
- **Mobile-First**: 
  - Chat em tela cheia (Full-Screen) no mobile.
  - Botões de áudio e gatilhos no canto esquerdo (polegar).
  - FAB (Botão de Cadastro) flutuante no Dashboard de Leads.
- **Filtros (Gestão de Vendas)**:
  - Filtro de **Vendedor (AssignedTo)** ativo.
  - Filtro de **Status** (Novo, Em Atendimento, Carrinho Aberto, Concluído, Perdido).
  - Botão **"Meus Leads"** para vendedores focarem em seu próprio funil.
- **Tabs no Kanban**: No mobile, o Kanban não faz scroll lateral; ele usa abas (carrossel) para melhor usabilidade.

---

## ☁️ Deploy & Manutenção (VPS)
- **Caminho**: `~/portalvidaplena`
- **Domínio**: `portalfvp.duckdns.org` (Proxy reverso Caddy porta 3000).
- **Comandos Críticos**:
  ```bash
  git pull origin main
  npm run build
  pm2 restart all
  ```

---

## 📌 Próximos Desafios / Backlog
1. **Filtro de Data**: Adicionar por período (Hoje, Ontem, 7 dias) na Gestão de Vendas.
2. **Dashboard Avançado**: Gráficos de conversão por vendedor/vendas concluídas.
3. **Segurança**: Ajustar `sslmode` no Prisma (`verify-full`).

---

*Última atualização do sistema: 31/03/2026 - Áudio, Radar Fotos, Filtros e Mobile-First 100% OK.* 🚀💎
