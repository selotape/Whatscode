/**
 * Configuration management for WhatsClaude
 */

import { config as loadEnv } from 'dotenv';
import { homedir } from 'os';
import type { Config } from './types.js';

// Load environment variables from .env file
loadEnv();

/**
 * Expand ~ to the user's home directory
 */
export function expandHome(path: string): string {
  if (path.startsWith('~')) {
    return path.replace('~', homedir());
  }
  return path;
}

/**
 * Parse log level from string, with fallback to 'info'
 */
function parseLogLevel(level: string | undefined): Config['logLevel'] {
  const validLevels: Config['logLevel'][] = ['debug', 'info', 'warn', 'error'];
  const parsed = level?.toLowerCase() as Config['logLevel'];
  return validLevels.includes(parsed) ? parsed : 'info';
}

/**
 * Application configuration loaded from environment
 */
export const config: Config = {
  projectsRoot: expandHome(process.env.PROJECTS_ROOT || '~/claude-projects'),
  groupPrefix: 'Claude:',
  maxQueueSize: 100,
  logLevel: parseLogLevel(process.env.LOG_LEVEL),
};

/**
 * Log a message if the level is high enough
 */
export function log(level: Config['logLevel'], ...args: unknown[]): void {
  const levels: Config['logLevel'][] = ['debug', 'info', 'warn', 'error'];
  const currentIndex = levels.indexOf(config.logLevel);
  const messageIndex = levels.indexOf(level);

  if (messageIndex >= currentIndex) {
    const prefix = `[${level.toUpperCase()}]`;
    if (level === 'error') {
      console.error(prefix, ...args);
    } else if (level === 'warn') {
      console.warn(prefix, ...args);
    } else {
      console.log(prefix, ...args);
    }
  }
}
