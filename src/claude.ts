/**
 * Claude Agent SDK integration for WhatsClaude
 */

import { query } from '@anthropic-ai/claude-agent-sdk';
import { getSession, setSession, updateLastActivity } from './sessions.js';
import { appendToHistory } from './history.js';
import { log } from './config.js';
import type { StoredMessage, SessionInfo } from './types.js';
import { truncate, getErrorMessage } from './utils.js';

/**
 * Default tools available to Claude
 */
const DEFAULT_TOOLS = [
  'Read',
  'Write',
  'Edit',
  'Bash',
  'Glob',
  'Grep',
  'WebSearch',
  'WebFetch',
] as const;

interface ClaudeQueryParams {
  groupId: string;
  groupName: string;
  projectPath: string;
  message: string;
  senderName: string;
  senderId: string;
  messageId: string;
}

/**
 * Send a message to Claude and get a response
 *
 * Handles:
 * - Session management (resume if exists)
 * - History logging (JSONL)
 * - Error handling
 */
export async function handleClaudeQuery(params: ClaudeQueryParams): Promise<string> {
  const { groupId, groupName, projectPath, message, senderName, senderId, messageId } = params;

  const existingSession = getSession(groupId);

  log('debug', `Query for ${groupName}:`, truncate(message));
  if (existingSession) {
    log('debug', `Resuming session: ${existingSession.sessionId}`);
  }

  // Log user message to history
  const userMessage: StoredMessage = {
    id: messageId,
    ts: new Date().toISOString(),
    groupId,
    groupName,
    role: 'user',
    sender: senderId,
    senderName,
    content: message,
  };
  appendToHistory(projectPath, userMessage);

  let sessionId: string | undefined;
  let result = '';

  try {
    for await (const msg of query({
      prompt: message,
      options: {
        cwd: projectPath,
        allowedTools: [...DEFAULT_TOOLS],
        permissionMode: 'acceptEdits',
        // Resume existing session if available
        ...(existingSession?.sessionId && { resume: existingSession.sessionId }),
      },
    })) {
      // Capture session ID from init message
      if (msg.type === 'system' && (msg as any).subtype === 'init') {
        sessionId = (msg as any).session_id;
        log('debug', `Session ID: ${sessionId}`);
      }

      // Log tool usage
      if (msg.type === 'assistant' && (msg as any).message?.content) {
        for (const block of (msg as any).message.content) {
          if ('name' in block) {
            log('debug', `Tool: ${block.name}`);
          }
        }
      }

      // Capture final result
      if ('result' in msg && typeof msg.result === 'string') {
        result = msg.result;
      }
    }

    log('info', `[${groupName}] Claude responded (${result.length} chars)`);

  } catch (error) {
    const errorMsg = getErrorMessage(error);
    log('error', `Claude query failed:`, errorMsg);
    result = `❌ Error: ${errorMsg}`;
  }

  // Update session store
  if (sessionId) {
    const sessionInfo: SessionInfo = {
      sessionId,
      projectPath,
      groupName,
      lastActivity: new Date().toISOString(),
    };
    setSession(groupId, sessionInfo);
  } else if (existingSession) {
    updateLastActivity(groupId);
  }

  // Log assistant message to history
  const assistantMessage: StoredMessage = {
    id: `response-${messageId}`,
    ts: new Date().toISOString(),
    groupId,
    groupName,
    role: 'assistant',
    sender: 'claude',
    senderName: 'Claude',
    content: result,
  };
  appendToHistory(projectPath, assistantMessage);

  return result;
}
