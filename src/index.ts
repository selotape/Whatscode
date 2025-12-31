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

  // Start the client with timeout
  log('info', 'Initializing WhatsApp client...');
  log('info', 'This may take a minute on first run (downloading browser)...');

  const initTimeout = 300000; // 5 minutes (WhatsApp Web can be slow)
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Initialization timed out after ${initTimeout / 1000}s`)), initTimeout);
  });

  try {
    await Promise.race([client.initialize(), timeoutPromise]);
  } catch (error) {
    log('error', 'Failed to initialize WhatsApp client:', error);
    throw error;
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  console.error('\nTroubleshooting:');
  console.error('1. Make sure you have Chrome/Chromium installed');
  console.error('2. Try deleting .wwebjs_auth folder and restarting');
  console.error('3. Check if another instance is running');
  process.exit(1);
});
