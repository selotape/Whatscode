/**
 * Session persistence for WhatsClaude
 *
 * Stores Claude Agent SDK session IDs so conversations
 * can be resumed after process restarts.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { config, log } from './config.js';
import type { SessionInfo } from './types.js';

const SESSIONS_FILE = join(config.projectsRoot, '.whatsclaude-sessions.json');

// In-memory session store
let sessions: Record<string, SessionInfo> = {};

/**
 * Load sessions from disk
 */
export function loadSessions(): void {
  try {
    if (existsSync(SESSIONS_FILE)) {
      const data = readFileSync(SESSIONS_FILE, 'utf-8');
      sessions = JSON.parse(data);
      const count = Object.keys(sessions).length;
      log('info', `Loaded ${count} session(s) from disk`);
    }
  } catch (error) {
    log('warn', 'Failed to load sessions, starting fresh:', error);
    sessions = {};
  }
}

/**
 * Save sessions to disk
 */
export function saveSessions(): void {
  try {
    writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2));
  } catch (error) {
    log('error', 'Failed to save sessions:', error);
  }
}

/**
 * Get session info for a WhatsApp group
 */
export function getSession(groupId: string): SessionInfo | undefined {
  return sessions[groupId];
}

/**
 * Set session info for a WhatsApp group
 */
export function setSession(groupId: string, info: SessionInfo): void {
  sessions[groupId] = info;
  saveSessions();
}

/**
 * Update last activity timestamp for a session
 */
export function updateLastActivity(groupId: string): void {
  if (sessions[groupId]) {
    sessions[groupId].lastActivity = new Date().toISOString();
    saveSessions();
  }
}

/**
 * Delete a session
 */
export function deleteSession(groupId: string): void {
  delete sessions[groupId];
  saveSessions();
}

/**
 * Get all sessions (for debugging)
 */
export function getAllSessions(): Record<string, SessionInfo> {
  return { ...sessions };
}
