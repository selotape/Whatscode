/**
 * JSONL history logging for WhatsClaude
 *
 * Stores all messages to JSONL files for auditing,
 * debugging, and potential future features like search.
 */

import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { log } from './config.js';
import type { StoredMessage } from './types.js';

/**
 * Get the history file path for a project
 */
export function getHistoryPath(projectPath: string): string {
  return join(projectPath, '.whatsclaude', 'history.jsonl');
}

/**
 * Append a message to the history file
 */
export function appendToHistory(projectPath: string, message: StoredMessage): void {
  const historyPath = getHistoryPath(projectPath);

  // Ensure directory exists
  const dir = dirname(historyPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  try {
    const line = JSON.stringify(message) + '\n';
    appendFileSync(historyPath, line);
    log('debug', `Appended to history: ${message.role} message`);
  } catch (error) {
    log('error', 'Failed to append to history:', error);
  }
}

/**
 * Read all messages from history (for debugging)
 */
export function readHistory(projectPath: string): StoredMessage[] {
  const historyPath = getHistoryPath(projectPath);

  if (!existsSync(historyPath)) {
    return [];
  }

  try {
    const content = readFileSync(historyPath, 'utf-8');
    const lines = content.trim().split('\n').filter(Boolean);
    return lines.map((line) => JSON.parse(line) as StoredMessage);
  } catch (error) {
    log('error', 'Failed to read history:', error);
    return [];
  }
}

/**
 * Get the count of messages in history
 */
export function getHistoryCount(projectPath: string): number {
  const historyPath = getHistoryPath(projectPath);

  if (!existsSync(historyPath)) {
    return 0;
  }

  try {
    const content = readFileSync(historyPath, 'utf-8');
    return content.trim().split('\n').filter(Boolean).length;
  } catch (error) {
    return 0;
  }
}
