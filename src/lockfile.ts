/**
 * Process lockfile management for WhatsClaude
 *
 * Prevents multiple instances from running simultaneously by:
 * 1. Checking for existing PID lockfile
 * 2. Verifying if the PID is still running
 * 3. Killing zombie processes if found
 * 4. Writing our PID on startup
 * 5. Cleaning up on exit
 */

import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { log } from './config.js';

const LOCKFILE_NAME = '.whatsclaude.pid';

// Chrome profile lock files that indicate WhatsApp session is in use
const CHROME_LOCK_FILES = [
  '.wwebjs_auth/session/SingletonLock',
  '.wwebjs_auth/session/SingletonCookie',
  '.wwebjs_auth/session/lockfile',
];

/**
 * Get the lockfile path (in the project root)
 */
function getLockfilePath(): string {
  return join(process.cwd(), LOCKFILE_NAME);
}

/**
 * Check if a process with the given PID is running
 */
function isProcessRunning(pid: number): boolean {
  try {
    // On Windows, use tasklist; on Unix, use kill -0
    if (process.platform === 'win32') {
      const output = execSync(`tasklist /FI "PID eq ${pid}" /NH`, {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      return output.includes(pid.toString());
    } else {
      process.kill(pid, 0);
      return true;
    }
  } catch {
    return false;
  }
}

/**
 * Kill a process by PID
 */
function killProcess(pid: number): boolean {
  try {
    if (process.platform === 'win32') {
      execSync(`taskkill /PID ${pid} /F`, {
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    } else {
      process.kill(pid, 'SIGTERM');
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Check for Chrome profile lock files
 */
function hasChromeLocks(): boolean {
  for (const lockFile of CHROME_LOCK_FILES) {
    if (existsSync(lockFile)) {
      return true;
    }
  }
  return false;
}

/**
 * Read the PID from the lockfile
 */
function readLockfile(): number | null {
  const lockfilePath = getLockfilePath();
  if (!existsSync(lockfilePath)) {
    return null;
  }

  try {
    const content = readFileSync(lockfilePath, 'utf-8').trim();
    const pid = parseInt(content, 10);
    return isNaN(pid) ? null : pid;
  } catch {
    return null;
  }
}

/**
 * Write our PID to the lockfile
 */
function writeLockfile(): void {
  const lockfilePath = getLockfilePath();
  writeFileSync(lockfilePath, process.pid.toString(), 'utf-8');
  log('debug', `Wrote PID ${process.pid} to ${lockfilePath}`);
}

/**
 * Remove the lockfile
 */
function removeLockfile(): void {
  const lockfilePath = getLockfilePath();
  if (existsSync(lockfilePath)) {
    try {
      unlinkSync(lockfilePath);
      log('debug', `Removed lockfile ${lockfilePath}`);
    } catch (error) {
      log('warn', `Failed to remove lockfile: ${error}`);
    }
  }
}

export interface LockResult {
  success: boolean;
  killedZombie?: boolean;
  error?: string;
}

/**
 * Acquire the lock for this process
 *
 * - Checks for existing lock and running process
 * - Kills zombie processes automatically
 * - Writes our PID to the lockfile
 * - Sets up cleanup on exit
 *
 * @returns LockResult indicating success or failure
 */
export function acquireLock(): LockResult {
  const existingPid = readLockfile();

  if (existingPid !== null) {
    if (isProcessRunning(existingPid)) {
      // Check if it's actually us (shouldn't happen, but be safe)
      if (existingPid === process.pid) {
        return { success: true };
      }

      // Another instance is truly running
      return {
        success: false,
        error: `Another WhatsClaude instance is running (PID ${existingPid}). Stop it first or run: taskkill /PID ${existingPid} /F`,
      };
    } else {
      // Zombie lockfile - process not running
      log('info', `Found stale lockfile for dead process ${existingPid}, cleaning up...`);
      removeLockfile();
    }
  }

  // Check for Chrome locks (indicates browser still running)
  if (hasChromeLocks()) {
    log('warn', 'Chrome profile locks detected - previous session may not have exited cleanly');
    // Don't block, just warn - Chrome locks can be stale too
  }

  // Write our PID
  writeLockfile();

  // Set up cleanup handlers
  const cleanup = () => {
    removeLockfile();
  };

  process.on('exit', cleanup);
  process.on('SIGINT', () => {
    cleanup();
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    cleanup();
    process.exit(0);
  });
  process.on('uncaughtException', (error) => {
    log('error', 'Uncaught exception:', error);
    cleanup();
    process.exit(1);
  });

  return { success: true };
}

/**
 * Release the lock (called automatically on exit, but can be called manually)
 */
export function releaseLock(): void {
  removeLockfile();
}

/**
 * Force cleanup of any existing lock and zombie processes
 * Use this when you want to forcibly take over
 */
export function forceCleanup(): { killedPid?: number } {
  const existingPid = readLockfile();

  if (existingPid !== null && isProcessRunning(existingPid)) {
    log('info', `Killing existing WhatsClaude process ${existingPid}...`);
    if (killProcess(existingPid)) {
      log('info', `Killed process ${existingPid}`);
      // Wait a moment for process to die
      execSync('timeout /t 2 /nobreak >nul 2>&1 || sleep 2', { stdio: 'ignore' });
      removeLockfile();
      return { killedPid: existingPid };
    }
  }

  removeLockfile();
  return {};
}
