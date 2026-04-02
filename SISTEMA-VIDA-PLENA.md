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
- **Sistema de Skins Dinâmico (Temas)**:
  - **Marinho Executivo (Briefcase 💼)**: Fundo azul noturno com fontes platinadas (Elegância e Autoridade).
  - **Ouro Royal (Crown 👑)**: Fundo preto absoluto (#000000) com detalhes em dourado metálico (Luxo e Exclusividade).
  - **Neon Cyber (Zap ⚡)**: Alto contraste, fundos escuros e brilho ciano/magenta (Foco e Modernidade).
  - **Padrão/Moderno (Sun ☀️)**: Interface limpa e clara para uso diário.
- **Identidade Visual**:
  - Nova logo "Vida Plena" com gradiente azul/indigo.
  - **Insignia BR 🇧🇷**: Bandeira do Brasil em SVG de alta resolução ao lado da logo para marcar a operação oficial.
- **Funil de Vendas Estratégico (4Life)**:
  - Nomenclatura corporativa para alta conversão: `LEADS ENTRANTES`, `QUALIFICAÇÃO E DIAGNÓSTICO`, `SOLUÇÃO E FECHAMENTO`, `CLIENTE ATIVADO`, `OPORTUNIDADES PERDIDAS`.
- **Mobile-First**: 
  - Chat em tela cheia (Full-Screen) no mobile.
  - Botões de áudio e gatilhos no canto esquerdo (polegar).
  - Seletor de temas consolidado na Sidebar.
- **Filtros (Gestão de Vendas)**:
  - Filtro de **Vendedor (AssignedTo)** ativo.
  - Filtro de **Status** (Novo, Em Atendimento, Carrinho Aberto, Concluído, Perdido).

---

## ☁️ Deploy & Manutenção (VPS)
- **Caminho**: `~/portalvidaplena`
- **Domínio**: `portalfvp.duckdns.org` (Proxy reverso Caddy porta 3000).
- **Comandos de Atualização Turbo**:
  ```bash
  cd ~/portalvidaplena && git fetch origin && git reset --hard origin/main && npm run build && pm2 restart all
  ```

---

## 📌 Próximos Desafios / Backlog
1. **Filtro de Data**: Adicionar por período (Hoje, Ontem, 7 dias) na Gestão de Vendas.
2. **Dashboard Avançado**: Gráficos de conversão por vendedor/vendas concluídas.
3. **Análise de Performance**: Monitorar o carregamento dos SVGs e mídias do Bot.

---

*Última atualização do sistema: 02/04/2026 - Skins Premium (Ouro, Marinho, Neon), Funil Estratégico e Logo BR 100% OK.* 🚀💎🇧🇷
