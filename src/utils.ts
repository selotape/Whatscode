/**
 * Shared utility functions for WhatsClaude
 */

import { existsSync, mkdirSync } from 'fs';

/**
 * Truncate text for logging, adding ellipsis if needed
 */
export function truncate(text: string, maxLength = 50): string {
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

/**
 * Ensure a directory exists, creating it recursively if needed
 */
export function ensureDir(path: string): void {
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true });
  }
}

/**
 * Extract error message from unknown error type
 */
export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
