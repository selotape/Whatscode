# WhatsClaude

A TypeScript service bridging WhatsApp ↔ Claude Code via the Claude Agent SDK.

## Status

**Alpha** - Core functionality complete, ready for testing.

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
npm run test     # Run tests
npm run build    # Build for production
npm start        # Run built version
```

## Testing Milestones

1. **Milestone 1**: WhatsApp echo test (verify connectivity)
2. **Milestone 2**: Claude SDK standalone test (verify SDK works)
3. **Milestone 3**: Full integration (end-to-end flow)

## Coding Instructions

- Always test your changes (including writing tests as appropriate and executing them) immediately after your changes and before continuing to the next phase of implementation.
- When no unit-tests are applicable or available, run the server locally, tail the logs and fix errors.

## Important Notes

- WhatsApp session persists in `.wwebjs_auth/` - don't delete unless re-authenticating
- Sessions file at `~/claude-projects/.whatsclaude-sessions.json`
- Re-scan QR code needed every ~2-3 weeks when WhatsApp expires session
