import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
type ClientType = InstanceType<typeof Client>;
type Message = pkg.Message;
type Chat = pkg.Chat;
import qrcode from 'qrcode-terminal';
import { BOT_PREFIX, SERVER_PREFIX, log } from './config.js';
import { truncate } from './utils.js';

const GROUP_PREFIX = 'Claude:';

export interface WhatsAppHandlers {
  onMessage?: (message: Message, chat: Chat) => Promise<void>;
  onReady?: () => void;
}

export function createWhatsAppClient(handlers?: WhatsAppHandlers): ClientType {
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
    handlers?.onReady?.();
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
      // Filter out Claude's own messages to prevent infinite loops
      if (message.body.startsWith(BOT_PREFIX) || message.body.startsWith(SERVER_PREFIX)) {
        log('debug', 'Ignoring bot/server message');
        return;
      }

      // Filter out empty messages (media without captions, system events, etc.)
      if (!message.body.trim()) {
        log('debug', 'Ignoring empty message');
        return;
      }

      const chat = await message.getChat();

      // Only handle groups with Claude: prefix
      // Guard against undefined chat.name (can happen during group creation/sync)
      if (!chat.isGroup || !chat.name || !chat.name.startsWith(GROUP_PREFIX)) {
        return;
      }

      console.log(`[${chat.name}] Received: "${truncate(message.body)}"`);

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
