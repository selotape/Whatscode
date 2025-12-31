import { createWhatsAppClient } from './whatsapp.js';

async function main() {
  console.log('🤖 WhatsClaude starting...\n');
  console.log('='.repeat(50));
  console.log('  MILESTONE 1: WhatsApp Echo Test');
  console.log('  This version just echoes messages back.');
  console.log('='.repeat(50));
  console.log();

  // Create WhatsApp client with echo handler
  const client = createWhatsAppClient({
    onMessage: async (message, chat) => {
      // Skip media for now
      if (message.hasMedia) {
        await chat.sendMessage("📎 I can't process media yet. Please send text.");
        return;
      }

      // Skip empty messages
      if (!message.body.trim()) {
        return;
      }

      // Echo the message back
      const response = `Echo: ${message.body}`;
      await chat.sendMessage(response);
      console.log(`[${chat.name}] Sent: "${response.slice(0, 50)}${response.length > 50 ? '...' : ''}"`);
    },
  });

  // Graceful shutdown
  const shutdown = async () => {
    console.log('\n\n🛑 Shutting down...');
    await client.destroy();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Start the client
  console.log('Initializing WhatsApp client...\n');
  await client.initialize();
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
