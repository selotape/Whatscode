# WhatsClaude Design Document

This document captures the design decisions made during the planning phase.

## Overview

WhatsClaude bridges WhatsApp and Claude Code, enabling users to interact with Claude Code via WhatsApp messages. Each WhatsApp group prefixed with "Claude:" becomes a separate project.

## Architecture Decisions

### 1. Single Language: TypeScript

**Decision**: Use TypeScript for the entire codebase.

**Rationale**:
- whatsapp-web.js is JavaScript/TypeScript
- Claude Agent SDK has official TypeScript support
- Single language simplifies the architecture
- No Python↔TypeScript bridge needed

### 2. WhatsApp Access: whatsapp-web.js

**Decision**: Use whatsapp-web.js (unofficial library).

**Alternatives considered**:
- Twilio WhatsApp API (official but costs money, requires business verification)
- Baileys (similar to whatsapp-web.js, TypeScript native)

**Rationale**:
- Free for personal use
- Quick setup with QR code
- Acceptable ban risk for personal, low-volume use
- Event-driven (WebSocket), not polling

### 3. Claude Integration: Claude Agent SDK

**Decision**: Use the official Claude Agent SDK.

**Key features used**:
- `query()` for sending prompts
- Session resume for conversation continuity
- Built-in tools (Read, Write, Edit, Bash, etc.)
- `permissionMode: 'acceptEdits'` for non-interactive operation

**Session management**:
- SDK maintains conversation context within sessions
- We store session IDs in JSON file for resume after restarts
- Session persists until explicitly cleared or expired

### 4. Message Queue: p-queue

**Decision**: Use p-queue for per-group message queuing.

**Behavior**:
- One queue per WhatsApp group
- Concurrency: 1 (sequential processing within each group)
- Max queue size: 100 messages
- Messages are processed in order received

**Rationale**:
- Prevents race conditions when multiple messages arrive quickly
- Simple and predictable behavior
- Well-maintained library

### 5. History Storage: JSONL

**Decision**: Store conversation history in JSONL files.

**Location**: `<project>/.whatsclaude/history.jsonl`

**Purpose**:
- Auditing (who said what, when)
- Debugging
- Future features (search, summarization)

**Not used for**:
- Claude context (SDK handles this via sessions)

**Format**:
```json
{"id":"...","ts":"2025-01-15T10:30:00Z","role":"user","sender":"...","senderName":"Ron","content":"fix the bug"}
```

### 6. Project Structure

**Decision**: One directory per WhatsApp group under a configurable root.

**Structure**:
```
~/claude-projects/           # PROJECTS_ROOT
├── my-webapp/               # "Claude: my-webapp" group
│   ├── CLAUDE.md            # Project context (auto-generated)
│   ├── .whatsclaude/
│   │   └── history.jsonl    # Conversation log
│   └── ... (project files)
└── .whatsclaude-sessions.json  # Session ID store
```

**Project name derivation**:
- "Claude: My App!" → "My-App" (sanitized)
- Special characters removed
- Spaces become dashes

### 7. Permissions: Permissive (Alpha)

**Decision**: Use `permissionMode: 'acceptEdits'` for alpha.

**What this allows**:
- File read/write/edit without prompting
- Bash command execution
- Web search

**Future (post-alpha)**:
- WhatsApp-based approval for risky operations
- Configurable permission levels

## Deferred Decisions (Post-Alpha)

See [TODO.md](../TODO.md) for the full list. Key items:

1. **Context summarization** - For long conversation histories
2. **Message batching** - Combine rapid messages
3. **WhatsApp permission prompts** - Interactive approval
4. **Auto GitHub repo creation** - New project → new repo
5. **Response chunking** - Long responses split into multiple messages

## Security Considerations

### WhatsApp Authentication
- QR code authentication via phone
- Session persists in `.wwebjs_auth/`
- Re-authentication needed every ~2-3 weeks

### API Authentication
- Uses existing Claude Code auth OR `ANTHROPIC_API_KEY`
- No credentials stored in code

### Access Control
- Only groups prefixed with "Claude:" are processed
- All group members can send messages (no per-user whitelist in alpha)
- Projects isolated by directory

## Testing Strategy

### Milestones
1. **WhatsApp connectivity** - Echo messages back
2. **Claude SDK** - Standalone test script
3. **Full integration** - End-to-end WhatsApp→Claude→WhatsApp

### Test Approach
- Unit tests for pure functions (config, projects)
- Smoke tests for integration points
- Manual E2E testing for alpha
