/**
 * E2E Integration Tests for WhatsClaude
 *
 * These tests use a REAL WhatsApp connection to test the full message flow.
 * They require:
 * - WhatsApp already authenticated (QR code scanned previously)
 * - No other WhatsClaude instance running
 * - Network connectivity
 *
 * Run with: npm run test:e2e
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { E2EHarness } from '../../src/testing/e2e-harness.js';
import { BOT_PREFIX, SERVER_PREFIX } from '../../src/config.js';

describe('E2E Integration', () => {
  let harness: E2EHarness;

  beforeAll(async () => {
    harness = new E2EHarness();
    await harness.initialize();
    await harness.findOrCreateTestGroup();
  }, 180000); // 3 min for WhatsApp init

  afterAll(async () => {
    await harness.cleanup();
  }, 30000);

  it('should respond to a simple message', async () => {
    // Send a simple prompt that should produce a predictable response
    await harness.sendMessage('Say exactly "hello" and nothing else. Just the word hello.');
    const response = await harness.waitForResponse(90000);

    expect(response).toBeDefined();
    expect(response.length).toBeGreaterThan(0);
    expect(response.toLowerCase()).toContain('hello');
  }, 120000);

  it('should remember context across messages in the same session', async () => {
    // First message: establish a fact
    await harness.sendMessage('Remember this: My secret password is "banana123". Just acknowledge.');
    const ack = await harness.waitForResponse(90000);
    expect(ack).toBeDefined();

    // Second message: recall the fact
    await harness.sendMessage('What is my secret password that I just told you?');
    const response = await harness.waitForResponse(90000);

    expect(response).toBeDefined();
    expect(response.toLowerCase()).toContain('banana123');
  }, 180000);

  it('should handle multi-line messages', async () => {
    const multiLineMessage = `Please count these items:
1. Apple
2. Banana
3. Cherry

How many items are in the list above? Just respond with the number.`;

    await harness.sendMessage(multiLineMessage);
    const response = await harness.waitForResponse(90000);

    expect(response).toBeDefined();
    expect(response).toContain('3');
  }, 120000);

  it('should use different prefixes for Claude responses vs server messages', async () => {
    // Test 1: Claude response should have BOT_PREFIX
    await harness.sendMessage('Say hi');
    const claudeResponse = await harness.waitForResponse(90000);
    expect(claudeResponse.startsWith(BOT_PREFIX)).toBe(true);

    // Test 2: Server message should have SERVER_PREFIX
    await harness.sendMediaMessage();
    const serverResponse = await harness.waitForResponse(10000);
    expect(serverResponse.startsWith(SERVER_PREFIX)).toBe(true);
    expect(serverResponse).toContain("can't process media");
  }, 120000);
});
