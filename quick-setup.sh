#!/bin/bash
# quick-setup.sh - One-click setup script for AI PM Bot

echo "🚀 AI PM Bot Quick Setup Script"
echo "================================"
echo ""

# Check Node.js
echo "📦 Checking Node.js..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js first:"
    echo "   brew install node"
    exit 1
fi
echo "✅ Node.js $(node -v) installed"

# Check Claude CLI
echo "📦 Checking Claude CLI..."
if ! command -v claude &> /dev/null; then
    echo "⚠️  Claude CLI not found. Installing..."
    npm install -g @anthropic/claude-cli
fi
echo "✅ Claude CLI installed"

# Install dependencies
echo ""
echo "📦 Installing npm dependencies..."
npm install

# Check .env file
echo ""
echo "🔧 Checking configuration..."
if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    echo "Please create .env file with your configuration."
    echo "Copy from QUICKSTART.md or use .env.example"
    exit 1
fi
echo "✅ .env file found"

# Verify critical environment variables
source .env
if [ -z "$TELEGRAM_BOT_TOKEN" ]; then
    echo "⚠️  Warning: TELEGRAM_BOT_TOKEN not set in .env"
fi
if [ -z "$NOTION_API_KEY" ]; then
    echo "⚠️  Warning: NOTION_API_KEY not set in .env"
fi

# Configure Claude MCP (if not already configured)
echo ""
echo "🔧 Checking Claude MCP configuration..."
if ! claude mcp list 2>/dev/null | grep -q "notion"; then
    echo "📝 Setting up Notion MCP server..."
    echo "Please follow the prompts to add Notion MCP:"
    echo "  Name: notion"
    echo "  Command: npx @suekou/mcp-notion-server"
    echo "  Environment: NOTION_API_TOKEN=$NOTION_API_KEY"
    claude mcp add
else
    echo "✅ Notion MCP already configured"
fi

# Create PM2 start script
echo ""
echo "📝 Creating PM2 start script..."
cat > pm2-start.sh << 'EOF'
#!/bin/bash
npx pm2 delete all 2>/dev/null
npx pm2 start bot-claude.js --name "ai-pm-bot" \
  --max-memory-restart 500M \
  --log-date-format "YYYY-MM-DD HH:mm:ss" \
  --merge-logs \
  --time
npx pm2 save
npx pm2 status
EOF
chmod +x pm2-start.sh
echo "✅ PM2 script created"

# Display available start options
echo ""
echo "✨ Setup Complete!"
echo "=================="
echo ""
echo "Available start commands:"
echo "  npm run start:claude     # Start with Claude AI (recommended)"
echo "  npm run start:natural    # Start with natural language"
echo "  npm run start:claude-cli # Start pure CLI mode"
echo "  ./pm2-start.sh          # Start with PM2 (production)"
echo ""
echo "Bot commands in Telegram:"
echo "  /start  - Show welcome message"
echo "  /status - View progress report"
echo "  /help   - Show usage"
echo ""
echo "📚 Full documentation: See QUICKSTART.md"
echo ""

# Ask if user wants to start now
read -p "Start bot now? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Starting bot with Claude AI..."
    npm run start:claude
fi