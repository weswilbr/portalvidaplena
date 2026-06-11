const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
require('dotenv').config();

// Configurações
const API_URL = process.env.API_URL || 'http://localhost:3000/api/leads/whatsapp';

const client = new Client({
    authStrategy: new LocalAuth({
        clientId: "vida-plena-bot"
    }),
    puppeteer: {
        executablePath: process.env.CHROME_PATH || '/usr/bin/chromium-browser',
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    }
});

client.on('qr', (qr) => {
    console.log('--- SCAN EARTH CODE ---');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('✅ BOT VIDA PLENA ONLINE!');
});

client.on('message', async (msg) => {
    // Apenas mensagens de contatos (não grupos)
    if (msg.from.includes('@c.us')) {
        const contact = await msg.getContact();
        const name = contact.pushname || contact.name || 'Cliente WhatsApp';
        const phone = contact.number;
        const body = msg.body;

        console.log(`📩 Nova mensagem de ${name} (${phone}): ${body}`);

        try {
            await axios.post(API_URL, {
                name: name,
                phone: phone,
                message: body
            });
            console.log('🚀 Lead enviado para o sistema com sucesso!');
        } catch (error) {
            console.error('❌ Erro ao enviar lead para o sistema:', error.message);
        }
    }
});

client.initialize();
