# WhatsClaude - Post-Alpha TODO

Features and improvements to add after the alpha is working.

## High Priority

- [x] **Distinguish message sources** - Make a clear distinction between Claude responses and server messages (e.g. errors, unsupported operations)
- [x] **Queue acknowledgment messages** - Send "📥 Queued (position 2)..." when messages are queued
- [ ] **Response chunking** - Split long responses (>3000 chars) into multiple messages
- [ ] **"Working on it..." updates** - Send progress for long-running tasks (>30 seconds)
- [ ] **Better error messages** - Include troubleshooting hints in error responses

## Low Priority

- [ ] **Context summarization** - Summarize old messages when history gets too long
- [ ] **WhatsApp permission prompts** - Ask for approval via WhatsApp for risky operations
- [ ] **Message batching** - Combine rapid messages within N seconds into one prompt
- [ ] **Cancel/interrupt** - Support "stop" or "cancel" to abort current task
- [ ] **Session idle timeout** - Archive sessions after N hours of inactivity
- [ ] **Dedicated phone number** - Switch to a dedicated cellphone number for Claude (separate from developer's personal WhatsApp account)

## Features

- [ ] **Auto GitHub repo creation** - Create GitHub repos for new projects
- [ ] **Special commands** - `!new` (fresh session), `!status` (queue info), `!history`
- [ ] **Media handling** - Process images via Claude's vision capabilities
- [ ] **Voice messages** - Transcribe audio messages to text
- [ ] **Meta WhatsClaude group** - "Claude: WhatsClaude" modifies this app itself
- [ ] **Direct bash prefix** - `!ls` bypasses Claude, runs bash directly

## DevOps

- [ ] **Auth expiry notification** - Email/push when WhatsApp needs re-authentication
- [ ] **Health check endpoint** - HTTP endpoint for monitoring
- [ ] **Metrics/monitoring** - Track message counts, response times, errors
- [ ] **Log rotation** - Rotate log files to prevent disk fill

## Nice to Have

- [ ] **Web dashboard** - View sessions, history, queue status
- [ ] **Cross-group context** - "In project X we used Y, should we do the same?"
- [ ] **Scheduled messages** - Send reminders via WhatsApp
- [ ] **Multi-user permissions** - Different permission levels per group member
- [ ] **Conversation search** - Search across all history files

## Technical Debt

- [ ] **More comprehensive tests** - Integration tests with mocked SDK
- [ ] **TypeScript strict null checks** - Enable stricter TypeScript
- [ ] **Error type handling** - Better typed error handling throughout
