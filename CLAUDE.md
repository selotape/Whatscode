# WhatsClaude

A TypeScript service bridging WhatsApp ↔ Claude Code via the Claude Agent SDK.

## Status

**Alpha** - Core functionality complete, ready for testing. See `TODO.md` for post-alpha roadmap.

## Architecture

```
src/
├── index.ts      # Entry point, wires everything together
├── whatsapp.ts   # WhatsApp Web client (whatsapp-web.js)
├── router.ts     # Message routing with per-group queues (p-queue)
├── claude.ts     # Claude Agent SDK wrapper with session management
├── sessions.ts   # Session ID persistence (JSON file)
├── history.ts    # Conversation logging (JSONL files)
├── projects.ts   # Project directory management
├── config.ts     # Environment-based configuration
└── types.ts      # TypeScript type definitions
```

## Data Flow

```
WhatsApp message → router.ts (queue) → claude.ts (SDK) → response → WhatsApp
                                            ↓
                                    sessions.ts (persist)
                                    history.ts (log)
```

## Key Design Decisions

1. **TypeScript only** - Single language for simplicity, using Claude Agent SDK TypeScript package
2. **Claude Agent SDK sessions** - SDK manages conversation context; we store session IDs for resume
3. **JSONL history** - Append-only logs for auditing (not used for context - SDK handles that)
4. **Sequential queue per group** - p-queue with concurrency:1 prevents race conditions
5. **Permissive permissions** - acceptEdits mode, no interactive prompts for alpha
6. **Identity caveat** - Claude authenticates using the developer's personal WhatsApp account; all messages sent by Claude appear to come from the developer's phone number

## Key Files Per Project

Each WhatsApp group "Claude: X" creates a project at `~/claude-projects/X/`:

```
X/
├── CLAUDE.md           # Project context (auto-generated, editable)
├── .whatsclaude/
│   └── history.jsonl   # Conversation log
└── ... (your code)
```

## Configuration

Environment variables (`.env`):
- `PROJECTS_ROOT` - Where projects are created (default: `~/claude-projects`)
- `ANTHROPIC_API_KEY` - Optional if using Claude Code auth
- `LOG_LEVEL` - debug/info/warn/error (default: info)

## Running

```bash
npm run dev      # Development with hot reload
npm run test     # Run unit tests
npm run build    # Build for production
npm start        # Run built version
```

## E2E Testing

Real end-to-end tests using actual WhatsApp connection.

### Prerequisites
- WhatsApp must be authenticated (QR code already scanned)
- **No other WhatsClaude instance running** (they share the same WhatsApp session)

### Running E2E Tests
```bash
npm run test:e2e        # Run all E2E tests
npm run test:e2e:watch  # Watch mode (re-run on changes)
```

### What E2E Tests Do
1. Initialize WhatsApp client (uses existing auth from `.wwebjs_auth/`)
2. Find or create "Claude: AutomaticE2ETest" group
3. Send real messages, wait for Claude responses
4. Assert on response content
5. Clean up test project directory + session

### Test Timeouts
- WhatsApp init: 3 minutes
- Each Claude response: 90 seconds
- Full test suite: ~10 minutes

### Debugging E2E Tests
- Set `DEBUG_WHATSAPP=true` to see the browser
- Check `~/claude-projects/AutomaticE2ETest/` for test project state
- Check `~/claude-projects/.whatsclaude-sessions.json` for session state

### Adding New E2E Tests
Edit `tests/e2e/integration.test.ts`. Use the harness methods:
- `harness.sendMessage(text)` - Send to test group
- `harness.waitForResponse(timeout)` - Wait for Claude's reply
- `harness.cleanup()` - Clean up (called automatically in afterAll)

### Conflict Detection
The E2E harness checks for Chrome's profile lock files before starting. If another instance is running (main server or stuck process), tests will fail fast with a clear error message telling you to stop the other instance.

## Testing Milestones

1. **Milestone 1**: WhatsApp echo test (verify connectivity)
2. **Milestone 2**: Claude SDK standalone test (verify SDK works)
3. **Milestone 3**: Full integration (end-to-end flow)

## Coding Instructions

- Always test your changes (including writing tests as appropriate and executing them) immediately after your changes and before continuing to the next phase of implementation.
- When no unit-tests are applicable or available, run the server locally, tail the logs and fix errors.
- **Commit your work once tests/verifications pass.** Don't wait for the user to ask.

## Important Notes

- WhatsApp session persists in `.wwebjs_auth/` - don't delete unless re-authenticating
- Sessions file at `~/claude-projects/.whatsclaude-sessions.json`
- Re-scan QR code needed every ~2-3 weeks when WhatsApp expires session
