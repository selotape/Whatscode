/**
 * Project directory management for WhatsClaude
 */

import { mkdirSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import { config, log } from './config.js';

/**
 * Convert a WhatsApp group name to a valid directory name
 *
 * @example
 * sanitizeProjectName("Claude: My App!") // "My-App"
 * sanitizeProjectName("Claude: test") // "test"
 */
export function sanitizeProjectName(groupName: string): string {
  return groupName
    .replace(config.groupPrefix, '') // Remove "Claude:" prefix
    .trim()
    .replace(/[^a-zA-Z0-9-_\s]/g, '') // Remove special chars except dash, underscore, space
    .replace(/\s+/g, '-') // Replace spaces with dashes
    .replace(/-+/g, '-') // Collapse multiple dashes
    .replace(/^-|-$/g, ''); // Remove leading/trailing dashes
}

/**
 * Get the project path for a WhatsApp group
 */
export function getProjectPath(groupName: string): string {
  const projectName = sanitizeProjectName(groupName);
  return join(config.projectsRoot, projectName);
}

/**
 * Ensure the projects root directory exists
 */
export function ensureProjectsRoot(): void {
  if (!existsSync(config.projectsRoot)) {
    log('info', `Creating projects root: ${config.projectsRoot}`);
    mkdirSync(config.projectsRoot, { recursive: true });
  }
}

/**
 * Create a default CLAUDE.md file for a new project
 */
function createClaudeMd(projectPath: string, projectName: string): void {
  const content = `# ${projectName}

Created via WhatsClaude on ${new Date().toISOString().split('T')[0]}.

## Project Context

Add project-specific context, conventions, and instructions here.
Claude will read this file to understand the project.

## Tech Stack

- (Add your tech stack here)

## Important Files

- (List important files and their purposes)
`;

  writeFileSync(join(projectPath, 'CLAUDE.md'), content);
}

/**
 * Ensure a project directory exists with proper structure
 *
 * Creates:
 * - The project directory
 * - CLAUDE.md with project template
 * - .whatsclaude/ directory for history
 */
export function ensureProjectExists(projectPath: string, groupName: string): void {
  if (!existsSync(projectPath)) {
    const projectName = sanitizeProjectName(groupName);
    log('info', `Creating project directory: ${projectPath}`);

    // Create project directory
    mkdirSync(projectPath, { recursive: true });

    // Create CLAUDE.md
    createClaudeMd(projectPath, projectName);

    // Create .whatsclaude directory for history
    mkdirSync(join(projectPath, '.whatsclaude'), { recursive: true });

    log('info', `Project "${projectName}" initialized`);
  }
}
