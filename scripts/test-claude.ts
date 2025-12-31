/**
 * Claude SDK Standalone Test (Milestone 2)
 *
 * Usage:
 *   npx tsx scripts/test-claude.ts "your prompt here"
 *   npx tsx scripts/test-claude.ts "list files in current directory"
 *   npx tsx scripts/test-claude.ts "create a file called test.txt with hello world"
 *
 * This verifies the Claude Agent SDK is working correctly
 * before integrating with WhatsApp.
 */

import { query } from '@anthropic-ai/claude-agent-sdk';

async function main() {
  const prompt = process.argv[2];

  if (!prompt) {
    console.log('Usage: npx tsx scripts/test-claude.ts "your prompt here"');
    console.log('');
    console.log('Examples:');
    console.log('  npx tsx scripts/test-claude.ts "list files in current directory"');
    console.log('  npx tsx scripts/test-claude.ts "what is 2 + 2?"');
    console.log('  npx tsx scripts/test-claude.ts "create test.txt with hello world"');
    process.exit(1);
  }

  console.log('🤖 Claude SDK Test\n');
  console.log('='.repeat(50));
  console.log(`Prompt: "${prompt}"`);
  console.log('='.repeat(50));
  console.log();

  let sessionId: string | undefined;
  let result: string | undefined;

  try {
    console.log('⏳ Querying Claude...\n');

    for await (const message of query({
      prompt,
      options: {
        allowedTools: ['Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep'],
        permissionMode: 'acceptEdits',
      },
    })) {
      // Capture session ID
      if (message.type === 'system' && (message as any).subtype === 'init') {
        sessionId = (message as any).session_id;
        console.log(`📋 Session ID: ${sessionId}\n`);
      }

      // Show assistant messages (Claude's thinking)
      if (message.type === 'assistant' && (message as any).message?.content) {
        for (const block of (message as any).message.content) {
          if ('text' in block) {
            console.log('💭', block.text.slice(0, 200) + (block.text.length > 200 ? '...' : ''));
          } else if ('name' in block) {
            console.log(`🔧 Tool: ${block.name}`);
          }
        }
      }

      // Capture result
      if ('result' in message && typeof message.result === 'string') {
        result = message.result;
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('✅ Result:');
    console.log('='.repeat(50));
    console.log(result || '(no result)');

  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

main();
