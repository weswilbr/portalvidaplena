# 📔 Guia de Operação: Robô WhatsApp (Projeto Vida Plena)

Este documento contém os comandos essenciais para manter o robô de prospecção do sistema Vida Plena rodando na sua VPS.

---

## 🚀 1. Como Iniciar o Robô (Modo 24h)
Para que ele continue rodando mesmo após fechar o terminal:

```bash
cd ~/bot-vida-plena
nohup node index.js > bot.log 2>&1 &
```

## 🔍 2. Como Verificar se o Robô está Ativo
```bash
ps aux | grep "node index.js"
```
*Procure pela linha que aponta para a pasta `bot-vida-plena`.*

## 📂 3. Como Ver o Log (Novos Leads)
```bash
tail -f ~/bot-vida-plena/bot.log
```

## 🛠️ 4. Como Reiniciar (Se precisar de novo QR Code)

1. **Parar o bot atual:**
   ```bash
   pkill -f "node index.js"
   ```
   *(Cuidado para não parar o bot de fotos se estiver rodando com o mesmo comando, use `ps aux` para matar o ID específico se necessário).*

2. **Testar manual e ler QR Code:**
   ```bash
   cd ~/bot-vida-plena
   node index.js
   ```

3. **Colocar em 24h:**
   Após o login, `Ctrl + C` e repita o **Passo 1**.

## 🚑 5. Configuração Inicial na VPS

1. **Crie a pasta e suba os arquivos:**
   `mkdir ~/bot-vida-plena`

2. **Instale as dependências:**
   ```bash
   cd ~/bot-vida-plena
   npm install
   ```

3. **Configure a URL da API:**
   Crie um arquivo `.env` e coloque a URL do seu sistema:
   `API_URL=https://SUA_URL_DO_SISTEMA.vercel.app/api/leads/whatsapp`

---

## 📝 Observações
- **Diferenciação:** Este robô usa o `clientId: "vida-plena-bot"`, o que evita conflito de sessão com seu outro robô se rodarem na mesma máquina sob pastas diferentes.
- **Captura:** Qualquer mensagem de número não registrado no seu WhatsApp será enviada automaticamente para o Dashboard do Vida Plena como um novo lead na coluna "NOVO".
