/**
 * Core type definitions for WhatsClaude
 */

/**
 * A message stored in the JSONL history file
 */
export interface StoredMessage {
  /** WhatsApp message ID */
  id: string;
  /** ISO timestamp */
  ts: string;
  /** WhatsApp group ID */
  groupId: string;
  /** Group display name */
  groupName: string;
  /** Message sender type */
  role: 'user' | 'assistant';
  /** Sender's phone number or 'claude' */
  sender: string;
  /** Sender's display name */
  senderName: string;
  /** Message content */
  content: string;
}

/**
 * Session information stored for each WhatsApp group
 */
export interface SessionInfo {
  /** Claude Agent SDK session ID */
  sessionId: string;
  /** Path to the project directory */
  projectPath: string;
  /** WhatsApp group name */
  groupName: string;
  /** ISO timestamp of last activity */
  lastActivity: string;
}

/**
 * Application configuration
 */
export interface Config {
  /** Root directory for Claude-managed projects */
  projectsRoot: string;
  /** WhatsApp group name prefix to filter */
  groupPrefix: string;
  /** Maximum messages allowed in queue per group */
  maxQueueSize: number;
  /** Logging level */
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}
