# WhatsClaude

WhatsApp ↔ Claude Code bridge. Chat with Claude Code from WhatsApp.

## How It Works

1. Create a WhatsApp group named "Claude: my-project"
2. Send a message like "create a hello world Python script"
3. Claude Code creates the file in `~/claude-projects/my-project/`
4. Response appears in WhatsApp

Each group becomes a separate project with its own context, files, and conversation history.

## Quick Start

### Prerequisites

- Node.js 18+
- WhatsApp on your phone
- Claude Code installed and authenticated (`claude` command works in terminal)
  - Or: Anthropic API key

### Installation

```bash
# Clone the repo
git clone <your-repo-url>
cd whatsclaude

# Install dependencies
npm install

# Copy environment template
cp .env.example .env
# Edit .env if needed (defaults work for most cases)

# Start in development mode
npm run dev
```

### First Run

1. A QR code appears in your terminal
2. Open WhatsApp → Settings → Linked Devices → Link a Device
3. Scan the QR code
4. Create a WhatsApp group named "Claude: test"
5. Send a message!

## Configuration

Edit `.env`:

```bash
# Where projects are created (default: ~/claude-projects)
PROJECTS_ROOT=~/claude-projects

# Optional: Anthropic API key (if not using Claude Code auth)
ANTHROPIC_API_KEY=sk-ant-...

# Logging level: debug | info | warn | error
LOG_LEVEL=info
```

## Project Structure

Each WhatsApp group "Claude: X" creates:

```
~/claude-projects/X/
├── CLAUDE.md           # Project context (edit this!)
├── .whatsclaude/
│   └── history.jsonl   # Conversation log
└── ... (your code)
```

## Commands

```bash
npm run dev      # Development with hot reload
npm run build    # Build for production
npm start        # Run production build
npm test         # Run tests
```

## Production Deployment

### Using systemd (Linux)

```bash
# Install as systemd service
chmod +x scripts/install.sh
./scripts/install.sh

# Control the service
sudo systemctl start whatsclaude
sudo systemctl stop whatsclaude
sudo systemctl status whatsclaude

# View logs
journalctl -u whatsclaude -f
```

### Using PM2

```bash
npm run build
pm2 start dist/index.js --name whatsclaude
pm2 save
pm2 startup
```

## Troubleshooting

### QR code not appearing
- Ensure terminal supports Unicode
- Try: `npm run dev 2>&1 | cat`

### "Claude Code not found"
- Install Claude Code: `npm install -g @anthropic-ai/claude-code`
- Or run `claude` once to authenticate

### Messages not received
- Verify group name starts with "Claude:" (exact prefix)
- Check WhatsApp connection in terminal logs

### WhatsApp disconnects
- Re-scan QR code when prompted
- Session expires every ~2-3 weeks

## Architecture

See [CLAUDE.md](./CLAUDE.md) for detailed architecture and design decisions.

## License

MIT
