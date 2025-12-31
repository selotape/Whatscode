#!/bin/bash
#
# Install WhatsClaude as a systemd service
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "Installing WhatsClaude..."
echo "Project directory: $PROJECT_DIR"
echo

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 18+."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js 18+ required. Found: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) found"

# Install dependencies
echo "Installing dependencies..."
cd "$PROJECT_DIR"
npm install

# Build
echo "Building..."
npm run build

# Create systemd service file
SERVICE_FILE="/etc/systemd/system/whatsclaude.service"

echo "Creating systemd service..."
sudo tee "$SERVICE_FILE" > /dev/null << EOF
[Unit]
Description=WhatsClaude - WhatsApp to Claude Code Bridge
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$PROJECT_DIR
ExecStart=$(which node) dist/index.js
Restart=on-failure
RestartSec=10
Environment=NODE_ENV=production

# Logging
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd
sudo systemctl daemon-reload

echo
echo "✅ Installation complete!"
echo
echo "Commands:"
echo "  sudo systemctl start whatsclaude   # Start the service"
echo "  sudo systemctl stop whatsclaude    # Stop the service"
echo "  sudo systemctl status whatsclaude  # Check status"
echo "  sudo systemctl enable whatsclaude  # Start on boot"
echo "  journalctl -u whatsclaude -f       # View logs"
echo
echo "⚠️  First run: Start interactively to scan QR code:"
echo "  npm run dev"
echo "  (Then Ctrl+C and start the service)"
