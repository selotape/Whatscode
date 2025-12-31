/**
 * E2E Test Harness for WhatsClaude
 *
 * Provides utilities for running real end-to-end tests with actual WhatsApp connection.
 * Uses the same WhatsApp client and routing as production, but intercepts responses
 * for test assertions.
 *
 * IMPORTANT: Cannot run while main server is running - they share the same
 * WhatsApp session (.wwebjs_auth directory).
 */

import pkg from 'whatsapp-web.js';
const { Client } = pkg;
type ClientType = InstanceType<typeof Client>;
type Chat = pkg.Chat;

import { existsSync, rmSync } from 'fs';
import { join } from 'path';
import { createWhatsAppClient } from '../whatsapp.js';
import { routeMessage } from '../router.js';
import { loadSessions, deleteSession } from '../sessions.js';
import { ensureProjectsRoot, getProjectPath } from '../projects.js';
import { config, log, formatBotResponse, BOT_PREFIX, SERVER_PREFIX } from '../config.js';

const TEST_GROUP_NAME = 'Claude: AutomaticE2ETest';

// Chrome profile lock files created by Puppeteer when session is active
const CHROME_LOCK_FILES = [
  '.wwebjs_auth/session/SingletonLock', // Linux
  '.wwebjs_auth/session/SingletonCookie', // Windows/Mac indicator
  '.wwebjs_auth/session/lockfile', // Alternative lock
];

/**
 * Check if another WhatsApp client is already running
 * by looking for Chrome's profile lock files
 */
function isAnotherInstanceRunning(): boolean {
  for (const lockFile of CHROME_LOCK_FILES) {
    if (existsSync(lockFile)) {
      return true;
    }
  }
  return false;
}

export class E2EHarness {
  private client: ClientType | null = null;
  private testChat: Chat | null = null;
  private responseResolver: ((text: string) => void) | null = null;
  private responseRejector: ((error: Error) => void) | null = null;
  private isReady = false;
  private readyPromise: Promise<void> | null = null;
  private readyResolver: (() => void) | null = null;

  /**
   * Initialize the harness - creates WhatsApp client and waits for ready
   */
  async initialize(): Promise<void> {
    log('info', '[E2E] Initializing harness...');

    // Check for running instance BEFORE attempting to start
    if (isAnotherInstanceRunning()) {
      throw new Error(
        '\n' +
          '╔═══════════════════════════════════════════════════════════════════╗\n' +
          '║  E2E TEST BLOCKED: Another WhatsClaude instance is running!       ║\n' +
          '║                                                                   ║\n' +
          '║  The main server appears to be running and using the WhatsApp     ║\n' +
          '║  session. E2E tests cannot run simultaneously.                    ║\n' +
          '║                                                                   ║\n' +
          '║  To run E2E tests:                                                ║\n' +
          '║  1. Stop the main server (Ctrl+C or kill the process)             ║\n' +
          '║  2. Run: npm run test:e2e                                         ║\n' +
          '╚═══════════════════════════════════════════════════════════════════╝\n'
      );
    }

    // Initialize dependencies
    ensureProjectsRoot();
    loadSessions();

    // Create promise to wait for ready
    this.readyPromise = new Promise((resolve) => {
      this.readyResolver = resolve;
    });

    // Create client - we only need onReady since we route messages directly in sendMessage
    this.client = createWhatsAppClient({
      onReady: () => {
        log('info', '[E2E] WhatsApp client ready');
        this.isReady = true;
        this.readyResolver?.();
      },
    });

    // Start the client
    log('info', '[E2E] Starting WhatsApp client (this may take a while)...');

    try {
      await this.client.initialize();
    } catch (error) {
      // Check if this is a "profile in use" error from Chrome
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (
        errorMsg.includes('user data directory is already in use') ||
        errorMsg.includes('SingletonLock')
      ) {
        throw new Error(
          '\n' +
            '╔═══════════════════════════════════════════════════════════════════╗\n' +
            '║  E2E TEST BLOCKED: WhatsApp session already in use!              ║\n' +
            '║                                                                   ║\n' +
            '║  Another Chrome instance is using the WhatsApp session.          ║\n' +
            '║  This could be:                                                  ║\n' +
            '║  - The main WhatsClaude server                                   ║\n' +
            '║  - Another E2E test run                                          ║\n' +
            '║  - A stuck Chrome process                                        ║\n' +
            '║                                                                   ║\n' +
            '║  To fix:                                                         ║\n' +
            '║  1. Stop any running WhatsClaude servers                         ║\n' +
            '║  2. Kill any stuck Chrome processes                              ║\n' +
            '║  3. Try again: npm run test:e2e                                  ║\n' +
            '╚═══════════════════════════════════════════════════════════════════╝\n'
        );
      }
      throw error;
    }

    // Wait for ready event
    await this.readyPromise;
    log('info', '[E2E] Harness initialized successfully');
  }

  /**
   * Find or create the test group
   */
  async findOrCreateTestGroup(): Promise<void> {
    if (!this.client || !this.isReady) {
      throw new Error('Harness not initialized. Call initialize() first.');
    }

    log('info', '[E2E] Looking for test group...');

    // Search existing chats - look for any group with the test name
    const chats = await this.client.getChats();
    for (const chat of chats) {
      if (chat.isGroup && chat.name) {
        // Normalize comparison (trim whitespace)
        const normalizedName = chat.name.trim();
        if (normalizedName === TEST_GROUP_NAME || normalizedName.startsWith(TEST_GROUP_NAME)) {
          log('info', `[E2E] Found existing test group: ${chat.id._serialized} (name: "${chat.name}")`);
          this.testChat = chat;
          return;
        }
      }
    }

    log('info', `[E2E] No existing test group found among ${chats.length} chats`);

    // Create new group if not found
    log('info', '[E2E] Test group not found, creating new one...');

    // Get our own contact to add to the group
    const info = this.client.info;
    const myNumber = info.wid._serialized;

    // Create group with just ourselves
    // Note: WhatsApp requires at least one other participant, but we'll try with just ourselves
    // If that fails, we need the user to create the group manually
    try {
      const createResult = await this.client.createGroup(TEST_GROUP_NAME, [myNumber]);
      log('info', `[E2E] Created test group: ${JSON.stringify(createResult)}`);

      // Get the group ID from the creation result
      const groupId = (createResult as any).gid?._serialized;
      if (groupId) {
        log('info', `[E2E] Getting chat by ID: ${groupId}`);

        // Wait for the group to be available, then get it by ID
        for (let attempt = 0; attempt < 10; attempt++) {
          await new Promise((resolve) => setTimeout(resolve, 2000));

          try {
            const chat = await this.client!.getChatById(groupId);
            if (chat && chat.isGroup) {
              this.testChat = chat;
              log('info', `[E2E] Test group ready: ${chat.id._serialized}`);
              return;
            }
          } catch (e) {
            log('debug', `[E2E] Attempt ${attempt + 1}: Group not ready yet`);
          }
        }
      }

      // Fallback: search in chats list
      log('info', '[E2E] Falling back to chat list search...');
      await new Promise((resolve) => setTimeout(resolve, 5000));

      const updatedChats = await this.client.getChats();
      for (const chat of updatedChats) {
        if (chat.isGroup && chat.name === TEST_GROUP_NAME) {
          this.testChat = chat;
          log('info', `[E2E] Test group ready: ${chat.id._serialized}`);
          return;
        }
      }
    } catch (error) {
      log('error', '[E2E] Failed to create group:', error);
      throw new Error(
        `Could not create test group "${TEST_GROUP_NAME}". ` +
          'Please create it manually in WhatsApp and add only yourself.'
      );
    }

    throw new Error(`Test group "${TEST_GROUP_NAME}" not found after creation.`);
  }

  /**
   * Send a message to the test group and route it through the system.
   *
   * NOTE: We can't rely on WhatsApp's message event because messages we send
   * don't trigger the incoming message handler (we're the only participant).
   * Instead, we send the message to WhatsApp for visibility AND directly
   * invoke the router to process it.
   */
  async sendMessage(text: string): Promise<void> {
    if (!this.testChat) {
      throw new Error('Test group not set. Call findOrCreateTestGroup() first.');
    }

    log('info', `[E2E] Sending: "${text.slice(0, 50)}${text.length > 50 ? '...' : ''}"`);

    // Send to WhatsApp so it shows up in the chat (for visibility)
    await this.testChat.sendMessage(`[TEST INPUT] ${text}`);

    // Create a mock message object that mimics the WhatsApp message structure
    const mockMessage = {
      body: text,
      id: { _serialized: `test-${Date.now()}` },
      hasMedia: false,
      getContact: async () => ({
        pushname: 'E2E Test',
        number: 'test',
        id: { _serialized: 'test@c.us' },
      }),
    };

    // Directly route the message through the system
    await routeMessage(
      mockMessage as any,
      this.testChat,
      async (responseText: string) => {
        // Send response to WhatsApp
        const formattedResponse = formatBotResponse(responseText);
        await this.testChat!.sendMessage(formattedResponse);

        // Resolve the response promise
        if (this.responseResolver) {
          log('info', `[E2E] Captured response (${responseText.length} chars)`);
          this.responseResolver(responseText);
          this.responseResolver = null;
          this.responseRejector = null;
        }
      }
    );
  }

  /**
   * Wait for a response from Claude
   */
  waitForResponse(timeoutMs: number = 90000): Promise<string> {
    return new Promise((resolve, reject) => {
      this.responseResolver = resolve;
      this.responseRejector = reject;

      // Set timeout
      const timeout = setTimeout(() => {
        if (this.responseResolver) {
          this.responseResolver = null;
          this.responseRejector = null;
          reject(new Error(`Response timeout after ${timeoutMs}ms`));
        }
      }, timeoutMs);

      // Clear timeout if resolved
      const originalResolver = this.responseResolver;
      this.responseResolver = (text: string) => {
        clearTimeout(timeout);
        originalResolver(text);
      };
    });
  }

  /**
   * Get the test group's chat ID (for session cleanup)
   */
  getTestGroupId(): string | null {
    return this.testChat?.id._serialized ?? null;
  }

  /**
   * Clean up test state
   */
  async cleanup(): Promise<void> {
    log('info', '[E2E] Cleaning up...');

    // 1. Delete project directory
    const testProjectPath = getProjectPath(TEST_GROUP_NAME);
    if (existsSync(testProjectPath)) {
      log('info', `[E2E] Deleting project directory: ${testProjectPath}`);
      rmSync(testProjectPath, { recursive: true, force: true });
    }

    // 2. Clear session
    const groupId = this.getTestGroupId();
    if (groupId) {
      log('info', `[E2E] Deleting session for: ${groupId}`);
      deleteSession(groupId);
    }

    // 3. Destroy client
    if (this.client) {
      log('info', '[E2E] Destroying WhatsApp client...');
      await this.client.destroy();
      this.client = null;
    }

    this.testChat = null;
    this.isReady = false;
    log('info', '[E2E] Cleanup complete');
  }

  /**
   * Send a simulated media message to trigger the "can't process media" server message.
   * Used for testing that server messages have the correct prefix.
   */
  async sendMediaMessage(): Promise<void> {
    if (!this.testChat) {
      throw new Error('Test group not set. Call findOrCreateTestGroup() first.');
    }

    log('info', '[E2E] Sending simulated media message');

    // Create a mock message with hasMedia: true
    const mockMessage = {
      body: '',
      id: { _serialized: `test-media-${Date.now()}` },
      hasMedia: true,
      getContact: async () => ({
        pushname: 'E2E Test',
        number: 'test',
        id: { _serialized: 'test@c.us' },
      }),
    };

    // Route the message - it should trigger the "can't process media" response
    await routeMessage(
      mockMessage as any,
      this.testChat,
      async (responseText: string) => {
        await this.testChat!.sendMessage(responseText);
        if (this.responseResolver) {
          log('info', `[E2E] Captured server response (${responseText.length} chars)`);
          this.responseResolver(responseText);
          this.responseResolver = null;
          this.responseRejector = null;
        }
      }
    );
  }

  /**
   * Check if the harness is ready
   */
  isInitialized(): boolean {
    return this.isReady && this.client !== null;
  }

  /**
   * Get the underlying WhatsApp client (for advanced testing)
   */
  getClient(): ClientType | null {
    return this.client;
  }
}

/**
 * Convenience function to clean up test state without a full harness
 */
export async function cleanupTestState(): Promise<void> {
  const testProjectPath = getProjectPath(TEST_GROUP_NAME);
  if (existsSync(testProjectPath)) {
    log('info', `[E2E] Deleting project directory: ${testProjectPath}`);
    rmSync(testProjectPath, { recursive: true, force: true });
  }
}
