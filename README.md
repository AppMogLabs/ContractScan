# ContractScan

AI-powered smart contract analysis for Telegram and Web. Get plain English explanations, risk assessments, and conversational Q&A for Ethereum, Base, and Arbitrum contracts.

## Status: Complete (All Phases) ✅

| Phase | Status | Deliverable |
|-------|--------|-------------|
| Phase 1 | ✅ Complete | Architecture + Bot scaffold |
| Phase 2 | ✅ Complete | AI analysis with Gemini + Telegram bot |
| Phase 3 | ✅ Complete | Next.js web app |

---

## Features

### Telegram Bot
- Contract analysis via `/scan <address>` or direct address input
- AI-powered risk assessment (0-100 score)
- Plain English contract summaries
- Follow-up Q&A (30-minute sessions)
- Rate limiting: 10 scans/hour, 30/day

### Web App
- Landing page with contract search
- Shareable reports: `/scan/0x...`
- Auto network detection (Ethereum, Base, Arbitrum)
- Full contract analysis UI with risk visualization
- SEO-optimized pages

---

## Architecture

```
┌─────────────┐         ┌──────────────┐
│ Telegram    │         │  Web App     │
│ Bot Client  │         │  (Next.js)   │
└──────┬──────┘         └──────┬───────┘
       │                       │
       └───────────┬───────────┘
                   ▼
       ┌─────────────────────┐
       │  Shared API Logic   │
       │  - Contract Fetch   │
       │  - LLM Analysis     │
       │  - Caching          │
       │  - Rate Limiting    │
       └──────────┬──────────┘
                  │
       ┌──────────┴──────────┐
       ▼                     ▼
┌──────────────┐    ┌──────────────┐
│ Block        │    │ Gemini 2.0   │
│ Explorers    │    │ Flash API    │
└──────────────┘    └──────────────┘
```

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| Bot Framework | grammY (TypeScript) |
| Web Framework | Next.js 14 (App Router) |
| LLM | Google Gemini 2.0 Flash |
| Block Explorers | Etherscan, Basescan, Arbiscan |
| Caching | In-memory LRU (MVP) |
| Styling | Tailwind CSS |

---

## Local Development

### Prerequisites
- Node.js 18+
- API keys (see below)

### Setup

1. **Install bot dependencies:**
   ```bash
   npm install
   ```

2. **Install web app dependencies:**
   ```bash
   cd web && npm install
   ```

3. **Create root `.env` file:**
   ```bash
   cp .env.example .env
   ```

4. **Add API keys to `.env`:**
   ```
   TELEGRAM_BOT_TOKEN=<from @BotFather>
   GEMINI_API_KEY=<from Google AI Studio>
   ETHERSCAN_API_KEY=<from etherscan.io/apis>
   BASESCAN_API_KEY=<from basescan.org/apis>
   ARBISCAN_API_KEY=<from arbiscan.io/apis>
   ```

5. **Run the bot:**
   ```bash
   npm run dev
   ```

6. **Run the web app (separate terminal):**
   ```bash
   cd web && npm run dev
   ```

---

## Deployment

### Web App (Vercel)

1. **Connect repo to Vercel:**
   ```bash
   cd web
   vercel
   ```

2. **Add environment variables in Vercel dashboard:**
   - `GEMINI_API_KEY`
   - `ETHERSCAN_API_KEY`
   - `BASESCAN_API_KEY`
   - `ARBISCAN_API_KEY`

3. **Deploy:**
   ```bash
   vercel --prod
   ```

### Bot (Railway)

1. **Create Railway project and connect GitHub repo**

2. **Add environment variables:**
   - `TELEGRAM_BOT_TOKEN`
   - `GEMINI_API_KEY`
   - `ETHERSCAN_API_KEY`
   - `BASESCAN_API_KEY`
   - `ARBISCAN_API_KEY`

3. **Deploy** (auto-deploys on push to main)

---

## Project Structure

```
contractscan/
├── src/
│   ├── bot.ts              # Telegram bot
│   └── lib/
│       ├── cache.ts        # LRU caching
│       ├── contract-fetcher.ts  # Block explorer APIs
│       ├── llm-analyzer.ts # Gemini integration
│       ├── rate-limiter.ts # Token bucket limits
│       └── types/          # TypeScript types
├── web/                    # Next.js web app
│   ├── app/
│   │   ├── page.tsx        # Landing page
│   │   ├── scan/[address]/ # Report pages
│   │   └── api/            # API routes
│   ├── components/         # React components
│   └── lib/                # Shared modules
├── Architecture.md         # Full system design
├── vercel.json            # Vercel config
├── railway.json           # Railway config
└── README.md
```

---

## Bot Commands

| Command | Description |
|---------|-------------|
| `/start` | Welcome message |
| `/help` | Show commands and rate limit status |
| `/scan <address>` | Analyze a contract |
| `/clear` | Clear conversation history |

**Tip:** You can paste a contract address directly without `/scan`!

---

## API Endpoints

### POST /api/scan
Analyze a smart contract.

```json
{
  "address": "0x...",
  "network": "ethereum" // optional (auto-detect if omitted)
}
```

### POST /api/follow-up
Ask a follow-up question about a previously scanned contract.

```json
{
  "question": "What does the mint function do?"
}
```

---

## Cost Budget

| Item | Cost |
|------|------|
| Per scan | ~$0.0015 |
| Daily budget | $0.50 (~330 scans) |
| Monthly budget | $15 (~10,000 scans) |

**Cost controls:**
- 24hr caching (repeat scans = $0)
- Rate limiting (10/hr, 30/day per user)
- Daily spend cap with alerts

---

## Rate Limits

- **Scans:** 10/hour, 30/day per user
- **Follow-ups:** 20 per 30-minute session
- **Cache:** Results cached for 24 hours

---

## Environment Variables

| Variable | Required For | Source |
|----------|--------------|--------|
| `TELEGRAM_BOT_TOKEN` | Bot | @BotFather |
| `GEMINI_API_KEY` | Bot + Web | Google AI Studio |
| `ETHERSCAN_API_KEY` | Bot + Web | etherscan.io/apis |
| `BASESCAN_API_KEY` | Bot + Web | basescan.org/apis |
| `ARBISCAN_API_KEY` | Bot + Web | arbiscan.io/apis |

---

## Testing

### Test Contracts

| Contract | Address | Network |
|----------|---------|---------|
| USDT | 0xdAC17F958D2ee523a2206206994597C13D831ec7 | Ethereum |
| USDC | 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 | Ethereum |
| Uniswap V3 | 0xE592427A0AEce92De3Edee1F18E0157C05861564 | Ethereum |

### Manual Test Checklist

- [ ] Bot responds to `/start` and `/help`
- [ ] `/scan <address>` returns analysis
- [ ] Direct address input works
- [ ] Web app search works
- [ ] Report page displays correctly
- [ ] Rate limiting blocks excess requests
- [ ] Cache returns results instantly

---

## Changelog

### v1.0.0 (2026-03-05)
- ✅ Phase 3: Next.js web app with shareable reports
- ✅ Phase 2: AI analysis with Gemini 2.0 Flash
- ✅ Phase 1: Telegram bot scaffold

---

## License

Proprietary - App Mog Labs

**Built by:** Codie (CTO) | App Mog Labs  
**Last Updated:** 2026-03-05
