#!/usr/bin/env npx tsx
/**
 * Creates a git worktree with node_modules copied and .wwebjs_auth symlinked.
 *
 * Usage: npm run worktree:add -- <branch-name>
 *
 * This avoids:
 * - Reinstalling npm packages (copies node_modules)
 * - Re-authenticating WhatsApp (symlinks .wwebjs_auth)
 *
 * WARNING: Only one worktree can run WhatsClaude at a time since they share
 * the WhatsApp session. The existing Chrome lock file detection will catch conflicts.
 */

import { execSync } from 'child_process';
import { cpSync, symlinkSync, existsSync, mkdirSync } from 'fs';
import { resolve, basename } from 'path';

const branchName = process.argv[2];

if (!branchName) {
  console.error('Usage: npm run worktree:add -- <branch-name>');
  console.error('Example: npm run worktree:add -- feature/chunking');
  process.exit(1);
}

const repoRoot = resolve(import.meta.dirname, '..');
const repoName = basename(repoRoot);
const worktreePath = resolve(repoRoot, '..', `${repoName}-${branchName.replace(/\//g, '-')}`);

console.log(`Creating worktree at: ${worktreePath}`);
console.log(`Branch: ${branchName}`);
console.log('');

// Check if worktree already exists
if (existsSync(worktreePath)) {
  console.error(`Error: ${worktreePath} already exists`);
  process.exit(1);
}

// Create the worktree
console.log('1. Creating git worktree...');
try {
  execSync(`git worktree add "${worktreePath}" -b "${branchName}"`, {
    cwd: repoRoot,
    stdio: 'inherit'
  });
} catch {
  // Branch might already exist, try without -b
  console.log('   Branch exists, checking out...');
  execSync(`git worktree add "${worktreePath}" "${branchName}"`, {
    cwd: repoRoot,
    stdio: 'inherit'
  });
}

// Copy node_modules
const srcNodeModules = resolve(repoRoot, 'node_modules');
const dstNodeModules = resolve(worktreePath, 'node_modules');

if (existsSync(srcNodeModules)) {
  console.log('2. Copying node_modules (this may take a moment)...');
  cpSync(srcNodeModules, dstNodeModules, { recursive: true });
  console.log('   Done.');
} else {
  console.log('2. Skipping node_modules (not found in source)');
}

// Symlink .wwebjs_auth
const srcAuth = resolve(repoRoot, '.wwebjs_auth');
const dstAuth = resolve(worktreePath, '.wwebjs_auth');

if (existsSync(srcAuth)) {
  console.log('3. Symlinking .wwebjs_auth...');
  try {
    symlinkSync(srcAuth, dstAuth, 'junction'); // 'junction' works on Windows without admin
    console.log('   Done.');
  } catch (err) {
    console.error(`   Warning: Could not create symlink: ${err}`);
    console.log('   You may need to copy .wwebjs_auth manually or run as admin.');
  }
} else {
  console.log('3. Skipping .wwebjs_auth (not found - authenticate in main repo first)');
}

console.log('');
console.log('Worktree ready!');
console.log('');
console.log(`  cd ${worktreePath}`);
console.log('');
console.log('Note: Only run WhatsClaude in ONE worktree at a time (shared WhatsApp session).');
