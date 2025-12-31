/**
 * Message routing and queue management for WhatsClaude
 *
 * Uses p-queue to ensure messages for each group
 * are processed sequentially (concurrency: 1).
 */

import PQueue from 'p-queue';
import type { Message, Chat } from 'whatsapp-web.js';
import { config, log, formatBotResponse } from './config.js';
import { getProjectPath, ensureProjectExists, sanitizeProjectName } from './projects.js';
import { handleClaudeQuery } from './claude.js';
import { getRegisteredGroup, registerGroup } from './sessions.js';

// One queue per group (groupId → queue)
const queues: Map<string, PQueue> = new Map();

/**
 * Get or create a queue for a group
 */
function getQueue(groupId: string): PQueue {
  if (!queues.has(groupId)) {
    queues.set(groupId, new PQueue({ concurrency: 1 }));
  }
  return queues.get(groupId)!;
}

/**
 * Get queue status for all groups
 */
export function getQueueStatus(): Record<string, { size: number; pending: number }> {
  const status: Record<string, { size: number; pending: number }> = {};
  for (const [groupId, queue] of queues) {
    status[groupId] = { size: queue.size, pending: queue.pending };
  }
  return status;
}

/**
 * Route and process a WhatsApp message
 *
 * - Filters for Claude: groups only
 * - Queues messages for sequential processing
 * - Handles errors gracefully
 */
export async function routeMessage(
  message: Message,
  chat: Chat,
  sendResponse: (text: string) => Promise<void>
): Promise<void> {
  // Only handle groups with Claude: prefix
  if (!chat.isGroup || !chat.name.startsWith(config.groupPrefix)) {
    return;
  }

  // Skip media for now
  if (message.hasMedia) {
    await sendResponse(formatBotResponse("📎 I can't process media yet. Please describe what you need in text."));
    return;
  }

  // Skip empty messages
  if (!message.body.trim()) {
    return;
  }

  const groupId = chat.id._serialized;
  const groupName = chat.name;
  const projectName = sanitizeProjectName(groupName);

  // Check for duplicate group name (different group claiming same project name)
  const registeredGroupId = getRegisteredGroup(projectName);
  if (registeredGroupId && registeredGroupId !== groupId) {
    await sendResponse(formatBotResponse(
      `⚠️ Another group already uses the project name "${projectName}". ` +
      `Please use the original group or rename/delete this one.`
    ));
    return;
  }

  // Register this group if not already registered
  if (!registeredGroupId) {
    registerGroup(projectName, groupId);
    log('info', `[${groupName}] Registered as owner of project "${projectName}"`);
  }

  const queue = getQueue(groupId);

  // Check queue size limit
  if (queue.size >= config.maxQueueSize) {
    log('warn', `[${groupName}] Queue full (${config.maxQueueSize})`);
    await sendResponse(formatBotResponse(`⚠️ Queue full (${config.maxQueueSize} messages). Please wait for current tasks to complete.`));
    return;
  }

  // Get sender info
  const contact = await message.getContact();
  const senderName = contact.pushname || contact.number || 'Unknown';
  const senderId = contact.id._serialized;

  // Ensure project directory exists
  const projectPath = getProjectPath(groupName);
  ensureProjectExists(projectPath, groupName);

  // Log queue status
  const queueSize = queue.size + 1; // +1 for this message
  if (queueSize > 1) {
    log('info', `[${groupName}] Queued message (position ${queueSize})`);
  }

  // Add to queue for processing
  queue.add(async () => {
    log('info', `[${groupName}] ${senderName}: "${message.body.slice(0, 50)}${message.body.length > 50 ? '...' : ''}"`);

    // Show typing indicator
    await chat.sendStateTyping();

    try {
      const response = await handleClaudeQuery({
        groupId,
        groupName,
        projectPath,
        message: message.body,
        senderName,
        senderId,
        messageId: message.id._serialized,
      });

      await chat.clearState();
      await sendResponse(formatBotResponse(response));

      log('info', `[${groupName}] Sent response (${response.length} chars)`);

    } catch (error) {
      await chat.clearState();
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      log('error', `[${groupName}] Error:`, errorMsg);
      await sendResponse(formatBotResponse(`❌ Error: ${errorMsg}`));
    }
  });
}
