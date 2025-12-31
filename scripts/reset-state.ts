/**
 * Reset State Script
 *
 * Clears all development/test state for a fresh start.
 * Preserves WhatsApp authentication (.wwebjs_auth/).
 *
 * Usage:
 *   npm run reset-state              # Interactive, shows preview
 *   npm run reset-state -- --force   # No confirmation
 */

import { readdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { createInterface } from 'readline';
import { config } from '../src/config.js';

const SESSIONS_FILE = '.whatsclaude-sessions.json';
const LOCKFILE = '.whatsclaude.pid';

async function main() {
  const force = process.argv.includes('--force');
  const { projectsRoot } = config;

  // 1. Check if projectsRoot exists
  if (!existsSync(projectsRoot)) {
    console.log('Nothing to reset - projects directory does not exist.');
    return;
  }

  // 2. Find all project directories (not dotfiles)
  const entries = readdirSync(projectsRoot, { withFileTypes: true });
  const projectDirs = entries
    .filter(e => e.isDirectory() && !e.name.startsWith('.'))
    .map(e => e.name);

  const sessionsPath = join(projectsRoot, SESSIONS_FILE);
  const hasSessionsFile = existsSync(sessionsPath);
  const lockfilePath = join(process.cwd(), LOCKFILE);
  const hasLockfile = existsSync(lockfilePath);

  // 3. Nothing to delete?
  if (projectDirs.length === 0 && !hasSessionsFile && !hasLockfile) {
    console.log('Nothing to reset - no projects or sessions found.');
    return;
  }

  // 4. Show what will be deleted
  console.log('\nThe following will be deleted:\n');
  for (const dir of projectDirs) {
    console.log(`  [dir]  ${join(projectsRoot, dir)}/`);
  }
  if (hasSessionsFile) {
    console.log(`  [file] ${sessionsPath}`);
  }
  if (hasLockfile) {
    console.log(`  [file] ${lockfilePath}`);
  }
  console.log();

  // 5. Confirm (unless --force)
  if (!force) {
    const confirmed = await confirm('Proceed with deletion?');
    if (!confirmed) {
      console.log('Aborted.');
      return;
    }
  }

  // 6. Delete
  for (const dir of projectDirs) {
    rmSync(join(projectsRoot, dir), { recursive: true, force: true });
  }
  if (hasSessionsFile) {
    rmSync(sessionsPath);
  }
  if (hasLockfile) {
    rmSync(lockfilePath);
  }

  console.log('State reset complete.');
}

async function confirm(message: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(`${message} (y/N) `, answer => {
      rl.close();
      resolve(answer.toLowerCase() === 'y');
    });
  });
}

main().catch(console.error);
