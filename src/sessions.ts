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

// Group ownership registry: projectName → groupId (first group to claim the name wins)
let groupRegistry: Record<string, string> = {};

/**
 * Load sessions and group registry from disk
 */
export function loadState(): void {
  try {
    if (existsSync(SESSIONS_FILE)) {
      const data = readFileSync(SESSIONS_FILE, 'utf-8');
      const parsed = JSON.parse(data);

      // Handle both old format (just sessions) and new format (sessions + groupRegistry)
      if (parsed.sessions) {
        sessions = parsed.sessions;
        groupRegistry = parsed.groupRegistry || {};
      } else {
        // Old format: the whole file is just sessions
        sessions = parsed;
        groupRegistry = {};
      }

      const sessionCount = Object.keys(sessions).length;
      const groupCount = Object.keys(groupRegistry).length;
      log('info', `Loaded ${sessionCount} session(s) and ${groupCount} registered group(s) from disk`);
    }
  } catch (error) {
    log('warn', 'Failed to load state, starting fresh:', error);
    sessions = {};
    groupRegistry = {};
  }
}

/**
 * Save sessions and group registry to disk
 */
export function saveState(): void {
  try {
    const state = {
      sessions,
      groupRegistry,
    };
    writeFileSync(SESSIONS_FILE, JSON.stringify(state, null, 2));
  } catch (error) {
    log('error', 'Failed to save state:', error);
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
  saveState();
}

/**
 * Update last activity timestamp for a session
 */
export function updateLastActivity(groupId: string): void {
  if (sessions[groupId]) {
    sessions[groupId].lastActivity = new Date().toISOString();
    saveState();
  }
}

/**
 * Delete a session
 */
export function deleteSession(groupId: string): void {
  delete sessions[groupId];
  saveState();
}

/**
 * Get all sessions (for debugging)
 */
export function getAllSessions(): Record<string, SessionInfo> {
  return { ...sessions };
}

/**
 * Get the group ID that owns a project name
 */
export function getRegisteredGroup(projectName: string): string | undefined {
  return groupRegistry[projectName];
}

/**
 * Register a group as the owner of a project name
 */
export function registerGroup(projectName: string, groupId: string): void {
  groupRegistry[projectName] = groupId;
  saveState();
}
