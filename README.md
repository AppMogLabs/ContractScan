# ContractScan

Smart contract analysis bot for Telegram and Web. Get plain English explanations, risk assessments, and conversational Q&A for Ethereum, Base, and Arbitrum contracts.

## Status: Bot Scaffold (Phase 1)

**Current Features:**
- ✅ Telegram bot running and responsive
- ✅ Address validation (0x format)
- ✅ Commands: /start, /help, /scan, /clear
- ✅ Direct address input (no /scan prefix needed)
- ✅ Session management (grammY built-in)

**Coming Wed 4 Mar (Phase 2):**
- 🚧 Block explorer integration (Etherscan/Basescan/Arbiscan)
- 🚧 Gemini 2.0 Flash LLM analysis
- 🚧 Risk assessment engine
- 🚧 Caching layer (24hr TTL)
- 🚧 Follow-up Q&A (30min sessions)
- 🚧 Web app (Next.js)

---

## Architecture

See [Architecture.md](./Architecture.md) for complete technical design.

**System Overview:**
```
User → Telegram Bot → API Service → Block Explorer + LLM
                   → Web App    ↗
```

**Key Technologies:**
- Bot: grammY (TypeScript Telegram framework)
- LLM: Gemini 2.0 Flash (cost-efficient)
- Caching: In-memory LRU (MVP) → Redis (production)
- Hosting: Railway (bot) + Vercel (web)

---

## Local Development

### Prerequisites

- Node.js 18+ and npm
- Telegram bot token (from @BotFather)

### Setup

1. **Clone repo:**
   ```bash
   git clone <repo-url>
   cd contractscan
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create `.env` file:**
   ```bash
   cp .env.example .env
   ```

4. **Add your bot token:**
   ```
   TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz...
   ```

   **How to get a bot token:**
   1. Open Telegram and search for @BotFather
   2. Send `/newbot`
   3. Follow prompts to name your bot
   4. Copy the token provided

5. **Run the bot:**
   ```bash
   npm run dev
   ```

   You should see:
   ```
   ✅ Bot started as @YourBotName
   📍 Environment: development
   🚀 Ready to receive messages!
   ```

6. **Test in Telegram:**
   - Open Telegram and search for your bot
   - Send `/start`
   - Try: `/scan 0x1234567890123456789012345678901234567890`

---

## Bot Commands

| Command | Description |
|---------|-------------|
| `/start` | Welcome message and usage instructions |
| `/help` | Show available commands |
| `/scan <address>` | Analyze a contract (placeholder in Phase 1) |
| `/clear` | Clear conversation history |

**Tip:** You can also paste a contract address directly without `/scan`!

---

## Deployment

### Staging (Railway)

1. **Create Railway project:**
   - Connect GitHub repo
   - Add service: "Bot"

2. **Set environment variables:**
   ```
   TELEGRAM_BOT_TOKEN=<staging_bot_token>
   NODE_ENV=staging
   ```

3. **Deploy:**
   - Push to `main` branch
   - Railway auto-deploys

4. **Verify:**
   - Check logs: "✅ Bot started"
   - Test bot in Telegram

### Production (Railway)

Same process as staging, but:
- Use production bot token
- Set `NODE_ENV=production`
- Use dedicated Railway project

---

## Project Structure

```
contractscan/
├── src/
│   └── bot.ts              # Main bot code (grammY)
├── Architecture.md         # Complete system design
├── README.md               # This file
├── package.json
├── tsconfig.json
├── .env.example
└── .gitignore
```

**Future Structure (Phase 2+):**
```
src/
├── bot.ts                  # Telegram bot
├── lib/
│   ├── contract-fetcher.ts # Block explorer integration
│   ├── llm-analyzer.ts     # Gemini API wrapper
│   ├── cache.ts            # LRU cache manager
│   └── rate-limiter.ts     # Token bucket implementation
└── web/                    # Next.js web app (separate)
    ├── app/
    ├── components/
    └── lib/
```

---

## Testing

### Manual Testing Checklist

**Bot Scaffold (Phase 1):**
- [x] Bot responds to /start
- [x] Bot responds to /help
- [x] Bot validates address format correctly
- [x] Bot accepts `/scan 0x...` command
- [x] Bot accepts direct address input (no /scan)
- [x] Bot rejects invalid addresses
- [x] Bot handles /clear command
- [x] Session persists across messages (grammY built-in)

**Future (Phase 2):**
- [ ] End-to-end contract scan
- [ ] Follow-up questions work
- [ ] Cache hit avoids duplicate API calls
- [ ] Rate limiting blocks excess requests

### Automated Tests

Not yet implemented. Will add Jest tests in Phase 2 for:
- Address validation logic
- API response parsing
- LLM response parsing
- Risk score calculation

---

## Cost Budget

**Phase 1 (Scaffold):** $0/day (no external APIs)

**Phase 2+ (Full Analysis):**
- Gemini API: ~$0.0015 per scan
- Block explorers: Free tier (100k calls/day)
- Hosting: Free tier (Railway + Vercel)
- **Total per scan:** ~$0.0015

**Daily budget:** $0.50 (~330 scans)  
**Monthly budget:** $15 (~10,000 scans)

**Cost controls:**
- 24hr caching (reduces repeat scans to $0)
- Rate limiting (10 scans/hr per user)
- Daily spend cap with alerts

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | Yes | Bot token from @BotFather |
| `NODE_ENV` | No | `development`, `staging`, or `production` |
| `GEMINI_API_KEY` | Phase 2 | Google AI API key |
| `ETHERSCAN_API_KEY` | Phase 2 | Etherscan API key (free tier OK) |
| `BASESCAN_API_KEY` | Phase 2 | Basescan API key |
| `ARBISCAN_API_KEY` | Phase 2 | Arbiscan API key |

---

## Troubleshooting

### Bot doesn't respond

1. Check bot token is correct in `.env`
2. Verify bot is running (`npm run dev` should show "✅ Bot started")
3. Check logs for errors
4. Ensure no other process is using the same token

### "Invalid address format" error

Address must:
- Start with `0x`
- Be exactly 42 characters long
- Contain only hex characters (0-9, a-f, A-F)

Example valid address:
```
0x1234567890123456789012345678901234567890
```

### Bot crashes on startup

- Check Node.js version: `node --version` (need 18+)
- Reinstall dependencies: `rm -rf node_modules && npm install`
- Check `.env` file exists and has `TELEGRAM_BOT_TOKEN`

---

## Roadmap

**Week 1 (Current):**
- [x] Architecture document
- [x] Bot scaffold with grammY
- [x] Address validation
- [x] Deploy to staging

**Week 2 (Wed 4 Mar):**
- [ ] Block explorer integration
- [ ] Gemini API integration
- [ ] Risk assessment logic
- [ ] Caching layer
- [ ] Web app (Next.js basic setup)

**Week 3-4:**
- [ ] Follow-up Q&A system
- [ ] Rate limiting
- [ ] Cost monitoring dashboard
- [ ] Production deployment
- [ ] SEO optimization (web app)

**Future:**
- [ ] Multi-sig detection
- [ ] Historical contract analysis
- [ ] Comparative analysis
- [ ] PDF export
- [ ] Pro tier (monetization)

---

## Contributing

Not open source yet. Internal project by App Mog Labs.

---

## License

Proprietary - App Mog Labs

---

## Contact

**Questions?** Ask Argos (project coordinator) or Codie (CTO/developer).

---

**Built by:** Codie (CTO) | App Mog Labs  
**Last Updated:** 2026-03-02  
**Version:** 0.1.0 (Bot Scaffold)
