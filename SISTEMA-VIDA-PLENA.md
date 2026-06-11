# 📖 Documentação Técnica - Portal Vida Plena (CRM & WhatsApp)

Este documento é a referência definitiva para o funcionamento do **Portal Vida Plena**. Foi projetado para que qualquer desenvolvedor ou inteligência artificial possa entender, manter e expandir o sistema sem perda de contexto histórico.

---

## 1. 🏗️ Arquitetura do Sistema

O sistema é uma aplicação híbrida composta por um portal de gestão (CRM) e um motor de automação de mensagens (Bot).

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router).
- **Linguagem**: TypeScript (Strict Mode).
- **Banco de Dados**: PostgreSQL hospedado no Supabase.
- **ORM**: [Prisma](https://www.prisma.io/).
- **Estilização**: TailwindCSS (v4).
- **Componentes**: Radix UI + Shadcn/UI + Lucide Icons.
- **Autenticação**: Cookies de sessão via Server Actions.
- **Bot Engine**: [whatsapp-web.js](https://wwebjs.dev/) rodando em processo separado.

---

## 2. 🗄️ Estrutura de Dados (Prisma Schema)

O banco de dados é centrado na figura do **Lead** e sua interação com o **User** (Vendedor).

- **User**: Gerencia o acesso (ADMIN/SELLER). Possui relacionamento `1:N` com leads.
- **Lead**: Armazena dados de contato e status no funil.
  - `status`: `NEW`, `CONTACTED`, `PRESENTED`, `CLOSED`, `LOST`.
  - `phone`: Armazena o ID único do WhatsApp (incluindo LIDs para compatibilidade).
- **Message**: Histórico de conversas.
  - `isNote`: Se `true`, é uma anotação interna do CRM (não visível no WhatsApp).
  - `mediaUrl/mediaType`: Suporte a imagens, vídeos, áudios e documentos.
- **OutgoingMessage**: Fila de mensagens para envio. O Bot monitora esta tabela para disparar mensagens.
- **BotConfig**: Status da conexão (`CONNECTED`, `QR_READY`, etc) e configurações de Round Robin (distribuição automática de leads).

---

## 3. 🤖 O Motor do Bot (`src/bot/index.ts`)

O bot opera como um serviço de background orquestrado pelo PM2.

### Fluxos Principais:
1. **Conexão**: Utiliza `LocalAuth` para persistir a sessão na pasta `./wwebjs_auth`.
2. **Recepção de Leads**: Ao receber uma mensagem de um número novo, o bot cria o Lead e, se o `isRoundRobin` estiver ativo, atribui automaticamente ao próximo vendedor disponível.
3. **Mídia & Performance**:
   - **Áudio**: Converte automaticamente para **OGG Opus (16kHz Mono)** usando FFmpeg para que apareça como "Voz" no WhatsApp.
   - **Vídeo**: Comprime usando **libx264 (CRF 28)** para garantir envio rápido e baixo consumo de dados.
4. **Coleta de Fotos**: Realiza varreduras (`scanProfilePhotos`) a cada 2 horas para buscar fotos de perfil de leads que ainda estão sem avatar, com delay de 5s entre consultas para evitar banimento.

---

## 4. 🎨 Design System & Skins (Premium UX)

O portal utiliza um sistema de **Super Overrides de CSS** localizado em `src/app/globals.css`.

- **Seletor de Temas**: Persistido no `localStorage` e aplicado como classe no `<body>`.
- **Temas Disponíveis**:
  - `default`: Visual clean padrão.
  - `theme-gold`: Fundo preto absoluto com destaques em Ouro Royal (#FBBF24). Estética Black Card.
  - `theme-navy`: Azul Marinho profundo (#060d1f) com elementos prateados. Foco executivo.
  - `theme-neon`: Visual Cyberpunk com sombras neon ciano/magenta.
- **Componentes Customizados**:
  - `KanbanView.tsx`: Abstração de abas para mobile, evitando scroll lateral infinito.
  - `Sidebar.tsx`: Centraliza navegação e controle de temas.

---

## 5. 🚀 Guia de Manutenção na VPS

### Comandos de Sobrevivência:

```bash
# Sincronização e Build (Caminho: ~/portalvidaplena)
cd ~/portalvidaplena && git fetch origin && git reset --hard origin/main && npm run build && pm2 restart portalfvp-web portalfvp-bot

# Logs do Bot
pm2 logs portalfvp-bot

# Logs do Site
pm2 logs portalfvp-web
```

### Variáveis de Ambiente (`.env`):
- `DATABASE_URL`: String de conexão PostgreSQL.
- `NEXT_PUBLIC_APP_URL`: URL base do portal.
- `JWT_SECRET`: Para criptografia de sessões.

---

## 📌 Histórico de Correções Importantes (Knowledge Base)

1. **LID vs Phone**: O sistema trata IDs longos do WhatsApp (`:12345...`) removendo o sufixo após os dois pontos para gerar links de chat (`wa.me`) corretos.
2. **Contraste Kanban**: Corrigido via seletores exatos (`[class~=...]`) para evitar que modifiers de hover do Tailwind pintassem tabelas inteiras de dourado.
3. **Windows Emoji Fix**: Bandeira do Brasil substituída de Emoji para **SVG oficial** via URL para garantir renderização em navegadores Windows.

---
*Assinado: Antigravity AI - 02/04/2026*
