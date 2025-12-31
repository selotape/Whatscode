import { Client, LocalAuth, Message, Chat } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';

const GROUP_PREFIX = 'Claude:';

export interface WhatsAppHandlers {
  onMessage: (message: Message, chat: Chat) => Promise<void>;
}

export function createWhatsAppClient(handlers?: WhatsAppHandlers): Client {
  const client = new Client({
    authStrategy: new LocalAuth({
      dataPath: '.wwebjs_auth',
    }),
    puppeteer: {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    },
  });

  // QR Code for first-time auth
  client.on('qr', (qr) => {
    console.log('\n📱 Scan this QR code with WhatsApp:\n');
    qrcode.generate(qr, { small: true });
    console.log('\nOpen WhatsApp → Settings → Linked Devices → Link a Device\n');
  });

  // Ready
  client.on('ready', () => {
    console.log('\n✅ WhatsApp connected!\n');
    console.log(`Listening for messages in "${GROUP_PREFIX}" groups...\n`);
  });

  // Authentication
  client.on('authenticated', () => {
    console.log('🔐 Authenticated successfully');
  });

  client.on('auth_failure', (msg) => {
    console.error('❌ Authentication failed:', msg);
  });

  // Disconnection handling
  client.on('disconnected', (reason) => {
    console.log('📴 Disconnected:', reason);
    console.log('Attempting to reconnect...');
    client.initialize().catch(console.error);
  });

  // Message handling
  client.on('message', async (message) => {
    try {
      const chat = await message.getChat();

      // Only handle groups with Claude: prefix
      if (!chat.isGroup || !chat.name.startsWith(GROUP_PREFIX)) {
        return;
      }

      console.log(`[${chat.name}] Received: "${message.body.slice(0, 50)}${message.body.length > 50 ? '...' : ''}"`);

      // Call custom handler if provided
      if (handlers?.onMessage) {
        await handlers.onMessage(message, chat);
      }
    } catch (error) {
      console.error('Error handling message:', error);
    }
  });

  return client;
}
