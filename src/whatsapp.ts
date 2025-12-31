import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
type Message = pkg.Message;
type Chat = pkg.Chat;
import qrcode from 'qrcode-terminal';

const GROUP_PREFIX = 'Claude:';

export interface WhatsAppHandlers {
  onMessage: (message: Message, chat: Chat) => Promise<void>;
}

export function createWhatsAppClient(handlers?: WhatsAppHandlers): Client {
  console.log('Creating WhatsApp client...');

  // Use headless: false for debugging - set to true for production
  const isDebug = process.env.DEBUG_WHATSAPP === 'true';

  const client = new Client({
    authStrategy: new LocalAuth({
      dataPath: '.wwebjs_auth',
    }),
    puppeteer: {
      headless: !isDebug, // Set DEBUG_WHATSAPP=true to see browser
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--disable-gpu',
      ],
    },
  });

  // Loading states
  client.on('loading_screen', (percent, message) => {
    console.log(`Loading: ${percent}% - ${message}`);
  });

  // Change state event - useful for debugging
  client.on('change_state', (state) => {
    console.log('State changed:', state);
  });

  // Remote session saved
  client.on('remote_session_saved', () => {
    console.log('Remote session saved');
  });

  // QR Code for first-time auth
  client.on('qr', (qr) => {
    console.log('QR event received!');
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
