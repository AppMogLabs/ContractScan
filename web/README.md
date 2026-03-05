# ContractScan Web App

AI-powered smart contract analysis web interface.

## Features

- **Instant Analysis**: Paste any contract address and get AI-powered security insights
- **Multi-Network Support**: Ethereum, Base, and Arbitrum
- **Risk Scoring**: 0-100 risk score with clear explanations
- **Shareable Reports**: Every analysis gets a shareable URL
- **Free Tier**: 10 scans/hour, 30/day per user

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Google Gemini 2.0 Flash API
- Block Explorer APIs (Etherscan, Basescan, Arbiscan)

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy environment variables:
```bash
cp .env.example .env.local
```

3. Fill in your API keys in `.env.local`:
- Get Gemini API key: https://makersuite.google.com/app/apikey
- Get Etherscan API key: https://etherscan.io/apis
- Get Basescan API key: https://basescan.org/apis
- Get Arbiscan API key: https://arbiscan.io/apis

4. Run development server:
```bash
npm run dev
```

5. Open http://localhost:3000

## Deployment

### Vercel

```bash
npm i -g vercel
vercel
```

Add environment variables in Vercel dashboard.

## API Routes

- `POST /api/scan` - Analyze a contract
- `POST /api/follow-up` - Ask follow-up questions

## Rate Limits

- 10 scans per hour
- 30 scans per day
- 20 follow-up questions per 30-minute session
- Results cached for 24 hours

## Cost

Average cost per scan: ~$0.0015 USD
Daily budget cap: $0.50 USD
