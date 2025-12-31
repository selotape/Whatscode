/**
 * WhatsClaude - WhatsApp to Claude Code Bridge
 *
 * Entry point that wires together:
 * - WhatsApp connection
 * - Claude Agent SDK
 * - Session management
 * - History logging
 */

import { createWhatsAppClient } from './whatsapp.js';
import { handleClaudeQuery } from './claude.js';
import { loadSessions } from './sessions.js';
import { ensureProjectsRoot, getProjectPath, ensureProjectExists } from './projects.js';
import { config, log } from './config.js';

async function main() {
  console.log('🤖 WhatsClaude starting...\n');
  console.log('='.repeat(50));
  console.log('  WhatsApp ↔ Claude Code Bridge');
  console.log(`  Projects root: ${config.projectsRoot}`);
  console.log(`  Group prefix: "${config.groupPrefix}"`);
  console.log('='.repeat(50));
  console.log();

  // Initialize
  ensureProjectsRoot();
  loadSessions();

  // Create WhatsApp client with Claude handler
  const client = createWhatsAppClient({
    onMessage: async (message, chat) => {
      // Skip media for now
      if (message.hasMedia) {
        await chat.sendMessage("📎 I can't process media yet. Please describe what you need in text.");
        return;
      }

      // Skip empty messages
      if (!message.body.trim()) {
        return;
      }

      const groupId = chat.id._serialized;
      const groupName = chat.name;

      // Get sender info
      const contact = await message.getContact();
      const senderName = contact.pushname || contact.number || 'Unknown';
      const senderId = contact.id._serialized;

      // Ensure project directory exists
      const projectPath = getProjectPath(groupName);
      ensureProjectExists(projectPath, groupName);

      log('info', `[${groupName}] ${senderName}: "${message.body.slice(0, 50)}${message.body.length > 50 ? '...' : ''}"`);

      // Show typing indicator
      await chat.sendStateTyping();

      try {
        // Query Claude
        const response = await handleClaudeQuery({
          groupId,
          groupName,
          projectPath,
          message: message.body,
          senderName,
          senderId,
          messageId: message.id._serialized,
        });

        // Clear typing and send response
        await chat.clearState();
        await chat.sendMessage(response);

        log('info', `[${groupName}] Sent response (${response.length} chars)`);

      } catch (error) {
        await chat.clearState();
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        log('error', `[${groupName}] Error:`, errorMsg);
        await chat.sendMessage(`❌ Error: ${errorMsg}`);
      }
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
