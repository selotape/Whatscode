/**
 * WhatsClaude - WhatsApp to Claude Code Bridge
 *
 * Entry point that wires together:
 * - WhatsApp connection
 * - Message routing with queue
 * - Claude Agent SDK
 * - Session management
 * - History logging
 */

import { createWhatsAppClient } from './whatsapp.js';
import { routeMessage } from './router.js';
import { loadSessions } from './sessions.js';
import { ensureProjectsRoot } from './projects.js';
import { config, log } from './config.js';

async function main() {
  console.log('🤖 WhatsClaude starting...\n');
  console.log('='.repeat(50));
  console.log('  WhatsApp ↔ Claude Code Bridge');
  console.log(`  Projects root: ${config.projectsRoot}`);
  console.log(`  Group prefix: "${config.groupPrefix}"`);
  console.log(`  Max queue size: ${config.maxQueueSize}`);
  console.log('='.repeat(50));
  console.log();

  // Initialize
  ensureProjectsRoot();
  loadSessions();

  // Create WhatsApp client with router
  const client = createWhatsAppClient({
    onMessage: async (message, chat) => {
      await routeMessage(message, chat, async (text) => {
        await chat.sendMessage(text);
      });
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
  log('info', 'Initializing WhatsApp client...');
  await client.initialize();
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
