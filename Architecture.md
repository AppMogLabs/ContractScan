# ContractScan Architecture

**Version:** 1.0  
**Date:** 2026-03-02  
**Status:** Initial Design

---

## 1. System Overview

ContractScan is a dual-interface smart contract analysis tool:
- **Telegram Bot**: Conversational interface for quick scans
- **Web App**: Shareable reports with SEO optimization

Both interfaces share a common API service that orchestrates contract fetching, LLM analysis, and caching.

### High-Level Architecture

```
┌─────────────┐         ┌──────────────┐
│ Telegram    │         │  Web App     │
│ Bot Client  │         │  (Next.js)   │
└──────┬──────┘         └──────┬───────┘
       │                       │
       │    ┌──────────────────┘
       │    │
       ▼    ▼
┌─────────────────────────────┐
│   Shared API Service        │
│   (Contract Analysis Logic) │
│   - Validation              │
│   - Fetching                │
│   - LLM Integration         │
│   - Caching                 │
│   - Rate Limiting           │
└──────┬──────────────┬───────┘
       │              │
       ▼              ▼
┌─────────────┐  ┌──────────────┐
│ Block       │  │ Gemini 2.0   │
│ Explorers   │  │ Flash API    │
│ (Etherscan) │  │              │
└─────────────┘  └──────────────┘
```

### Supported Networks
- Ethereum (Mainnet)
- Base
- Arbitrum One

---

## 2. Component Breakdown

### 2.1 Telegram Bot

**Framework:** grammY  
**Rationale:**
- Modern TypeScript-first design (better DX)
- Built-in session management (needed for 30min follow-up)
- Active development and good documentation
- Lighter than Telegraf (fewer dependencies)
- Native conversation state handling

**Deployment:** Railway  
**Rationale:**
- Free tier sufficient for MVP (500hrs/month)
- Better DX than Render for bot processes
- Built-in PostgreSQL if we need persistent sessions later
- Easy GitHub integration
- Scales to paid tier cleanly

**Commands:**
- `/start` - Welcome message, usage instructions
- `/help` - Command reference
- `/scan <address>` - Analyze a contract
- `/risk <address>` - Quick risk assessment only
- `/clear` - Clear conversation history

**Session Management:**
- In-memory store (grammY built-in) for MVP
- TTL: 30 minutes after last interaction
- Stores: contract address, previous Q&A context
- Falls back to Redis if memory becomes issue

### 2.2 Web App

**Framework:** Next.js 14 (App Router)  
**Deployment:** Vercel  
**Rationale:**
- SEO requirements (static/SSR pages)
- API routes co-located with frontend
- Vercel free tier covers MVP traffic
- Edge functions for fast API responses
- Built-in OG image generation

**Routes:**
```
/                          # Landing page (SEO optimized)
/scan/[address]            # Report page (SSR for SEO)
/api/scan                  # Shared API endpoint
/api/follow-up             # Follow-up question API
/api/health                # Health check
```

**Features:**
- Server-side rendering for contract reports (SEO)
- Shareable URLs: `/scan/0x123...abc`
- Syntax-highlighted code snippets (Shiki)
- Copy-to-clipboard for contract address/code
- Rate limiting per IP (Vercel edge middleware)

### 2.3 Shared API Service

**Architecture Decision:** Embedded in Next.js API routes (not separate service)  
**Rationale:**
- Reduces deployment complexity (one app vs two)
- Next.js API routes support serverless + edge
- Sharing logic via shared modules
- Can extract to separate service later if needed

**Core Modules:**

#### Contract Fetcher
```typescript
// lib/contract-fetcher.ts
async function fetchContract(address: string, network: Network): Promise<ContractData> {
  // 1. Validate address format
  // 2. Determine block explorer API
  // 3. Fetch verified source code
  // 4. Parse ABI and implementation
  // 5. Return structured data
}
```

#### LLM Analyzer
```typescript
// lib/llm-analyzer.ts
async function analyzeContract(contract: ContractData, question?: string): Promise<Analysis> {
  // 1. Build prompt (comprehensive or follow-up)
  // 2. Call Gemini 2.0 Flash
  // 3. Parse structured response
  // 4. Return analysis with risk score
}
```

#### Cache Manager
```typescript
// lib/cache.ts
// In-memory LRU cache for MVP
// Redis fallback for production
```

#### Rate Limiter
```typescript
// lib/rate-limiter.ts
// In-memory token bucket for MVP
// Redis-backed for production multi-instance
```

---

## 3. Data Flow

### 3.1 Initial Scan Flow

```
User (Bot/Web)
  │
  ▼ /scan 0x123...abc
API Service
  │
  ├─▶ Validate address format
  │
  ├─▶ Check cache (key: address+network)
  │   ├─ HIT  → Return cached analysis ($0)
  │   └─ MISS → Continue
  │
  ├─▶ Check rate limit
  │   ├─ OK    → Continue
  │   └─ DENY  → Return 429 error
  │
  ├─▶ Fetch contract from block explorer
  │   └─ Parse source code + ABI
  │
  ├─▶ Call Gemini API with analysis prompt
  │   └─ Parse response
  │
  ├─▶ Calculate risk score (weighted)
  │
  ├─▶ Cache result (TTL: 24hr)
  │
  └─▶ Return analysis to user
```

**Cost per scan:** $0.01-$0.03 (cache miss)  
**Cost per follow-up:** $0.005-$0.01 (smaller context)

### 3.2 Follow-Up Question Flow

```
User: "What does the mint function do?"
  │
  ▼
API Service
  │
  ├─▶ Load conversation context (session)
  │
  ├─▶ Fetch cached contract data (should be cached)
  │
  ├─▶ Build follow-up prompt:
  │   - Original contract
  │   - Previous Q&A (last 3 exchanges)
  │   - New question
  │
  ├─▶ Call Gemini API
  │
  └─▶ Return answer + update session
```

**Session Lifetime:** 30 minutes from last interaction  
**Context Limit:** Last 3 Q&A pairs (prevents token bloat)

### 3.3 Cache Hit Flow

```
User: /scan 0x123...abc (already scanned <24hr ago)
  │
  ▼
API Service
  │
  ├─▶ Validate address
  │
  ├─▶ Check cache → HIT
  │
  └─▶ Return cached analysis immediately
      Cost: $0.00
      Response time: <100ms
```

---

## 4. External Dependencies

### 4.1 Block Explorer APIs

**Provider:** Etherscan + network variants (Basescan, Arbiscan)  
**Tier:** Free (5 calls/second, 100k calls/day)  
**Rationale:**
- Free tier sufficient for MVP (<1000 scans/day expected)
- 24hr caching reduces API usage significantly
- Can upgrade to paid tier ($50/month) if needed

**API Endpoints Used:**
```
GET /api?module=contract&action=getsourcecode&address=0x...
GET /api?module=contract&action=getabi&address=0x...
```

**Rate Limiting:** 5 req/sec (shared across instances)  
**Fallback:** Queue requests if rate limited

### 4.2 Gemini API (Google AI)

**Model:** Gemini 2.0 Flash  
**Pricing:** $0.075 per 1M input tokens, $0.30 per 1M output  
**Average Cost per Scan:**
- Input: ~10k tokens (contract code + prompt) = $0.00075
- Output: ~2k tokens (analysis) = $0.0006
- **Total: ~$0.0015 per scan**

**Budget:**
- Daily cap: $0.50 (~330 scans)
- Monthly cap: $15 (~10,000 scans)

**Cost Controls:**
- Log every API call with token counts
- Alert when daily spend >$0.40
- Hard stop at $0.50/day
- Cache aggressively

### 4.3 Telegram Bot API

**Provider:** Telegram  
**Cost:** Free  
**Rate Limits:** 30 messages/second  
**Usage:** Well within free tier

---

## 5. Caching Strategy

### Decision: **In-Memory LRU Cache for MVP**

**Rationale:**
- Simpler deployment (no Redis infrastructure)
- Free
- Sufficient for single-instance deployment
- 100MB cache = ~500-1000 contract analyses
- Can upgrade to Redis later if multi-instance needed

**Implementation:**
```typescript
import LRU from 'lru-cache';

const cache = new LRU<string, Analysis>({
  max: 1000,          // Max entries
  ttl: 24 * 60 * 60 * 1000,  // 24 hours
  updateAgeOnGet: false,     // Don't extend TTL on access
});
```

**Cache Key Format:**
```
{network}:{address}
e.g., "ethereum:0x1234...abcd"
```

**When to Invalidate:**
- TTL expires (24hr)
- Manual invalidation endpoint (admin only)
- Cache eviction (LRU when full)

**Redis Migration Path:**
- When scaling to multiple instances
- Implementation: Redis with same key format
- Drop-in replacement with same interface

---

## 6. Rate Limiting

### Decision: **In-Memory Token Bucket (MVP) → Redis (Production)**

**Limits:**
- Per User: 10 scans/hour, 30 scans/day
- Global: 100 scans/hour (prevent abuse)
- Follow-ups: 20 questions/30min session

**MVP Implementation:**
```typescript
// In-memory token bucket per user ID (Telegram) or IP (Web)
const userLimits = new Map<string, TokenBucket>();

// TokenBucket: refills 10 tokens/hour, max 30 tokens
```

**Production (Redis):**
```typescript
// Redis keys: rate:user:{userId}:hour, rate:user:{userId}:day
// Use INCR + EXPIRE for atomic counting
// Distributed across instances
```

**Reasoning:**
- In-memory: Simple, fast, free, sufficient for single Railway instance
- Redis: Required only when horizontal scaling needed
- Same logic, different storage backend

---

## 7. Cost Controls

### Daily Budget: $0.50

**Cost Breakdown per Scan:**
- Block explorer API: $0.00 (free tier)
- Gemini API: ~$0.0015 (average)
- Hosting: $0.00 (free tiers)
- **Total per scan: ~$0.0015**

**Daily Capacity:** ~330 scans  
**Monthly Projection:** ~10,000 scans = $15

### Cost Monitoring

**Logging:**
```typescript
{
  timestamp: Date,
  operation: "scan" | "follow-up",
  userId: string,
  address: string,
  tokensIn: number,
  tokensOut: number,
  cost: number,
  cached: boolean
}
```

**Alerts:**
- Email when daily spend > $0.40 (80%)
- Hard stop at $0.50 (return 503 + "daily limit reached")
- Weekly summary report

**Dashboard Metrics:**
- Scans today / this week / this month
- Cache hit rate
- Average cost per scan
- Top users by usage

---

## 8. LLM Prompt Strategy

### Decision: **Single Comprehensive Prompt** (Initial Scan)

**Rationale:**
- Single API call = lower cost
- Gemini Flash context window: 1M tokens (plenty of room)
- Easier to maintain one prompt template
- Faster response time (one roundtrip)

**Prompt Structure:**
```
You are a smart contract security analyst. Analyze the following verified Solidity contract.

CONTRACT DETAILS:
- Address: {address}
- Network: {network}
- Name: {contractName}
- Compiler: {compilerVersion}

SOURCE CODE:
{sourceCode}

INSTRUCTIONS:
Provide a structured analysis with:

1. PLAIN ENGLISH SUMMARY (2-3 sentences)
   - What this contract does
   - Main purpose and use case

2. KEY FUNCTIONS (5-7 most important)
   - Function name, purpose, access control
   - Risk level: LOW/MEDIUM/HIGH

3. ADMIN PRIVILEGES (if any)
   - Owner capabilities
   - Centralization risks
   - Upgrade mechanisms

4. RISK ASSESSMENT
   - Overall risk score: 0-100
   - Known vulnerabilities or red flags
   - Best practices violations

5. USER ADVICE
   - Should users trust this contract?
   - What to watch out for

OUTPUT FORMAT: JSON
{
  "summary": "...",
  "keyFunctions": [...],
  "adminPrivileges": [...],
  "riskScore": 0-100,
  "risks": [...],
  "advice": "..."
}
```

**Follow-Up Prompts:**
```
PREVIOUS ANALYSIS:
{cachedAnalysis}

CONVERSATION HISTORY:
{last3QA}

USER QUESTION: {newQuestion}

Provide a concise answer based on the contract code and previous analysis.
```

---

## 9. Session Management

### Telegram Bot Sessions (grammY)

**Storage:** In-memory (grammY built-in)  
**TTL:** 30 minutes from last message  
**Stored Data:**
```typescript
interface BotSession {
  contractAddress?: string;
  network?: Network;
  qaHistory: Array<{ q: string; a: string }>;
  createdAt: Date;
  lastActiveAt: Date;
}
```

**Cleanup:** Automatic (grammY handles expiry)

### Web App Sessions

**Stateless:** No server-side session needed  
**Client-side Context:**
- Store conversation in React state
- Pass context to API on each follow-up call
- Clear on page reload

**Rationale:**
- Simpler (no session store needed)
- Scales better (stateless API)
- User controls their own context

---

## 10. Testing Strategy

### Unit Tests (80% Target Coverage)

**Critical Modules:**
- Contract address validation (ethereum-js-util)
- Block explorer API response parsing
- LLM response parsing (JSON extraction)
- Risk score calculation (weighted algorithm)
- Rate limiter logic

**Tools:** Jest + ts-jest

### Integration Tests

**End-to-End Flows:**
1. Scan known contract → Verify analysis structure
2. Follow-up question → Verify context passed correctly
3. Cache hit → Verify no duplicate API calls
4. Rate limit exceeded → Verify 429 response

**Tools:** Supertest (API testing)

### Manual Testing Checklist

**Before Production:**
- [ ] Scan USDT contract (Ethereum)
- [ ] Scan USDC contract (Base)
- [ ] Scan GMX contract (Arbitrum)
- [ ] Ask 3 follow-up questions per contract
- [ ] Verify cache hit on second scan
- [ ] Trigger rate limit (30 scans rapid-fire)
- [ ] Test invalid addresses (error handling)
- [ ] Test unverified contracts (graceful fail)

---

## 11. Deployment Plan

### Staging Environment

**Bot:**
- Platform: Railway (staging project)
- URL: N/A (Telegram bot, webhook-based)
- Env vars: `TELEGRAM_BOT_TOKEN_STAGING`, `GEMINI_API_KEY`

**Web:**
- Platform: Vercel (preview deployment)
- URL: `contractscan-staging.vercel.app`
- Env vars: Same as production

**Database:** None needed for MVP (in-memory only)

### Production Environment

**Bot:**
- Platform: Railway (production project)
- Auto-deploy: main branch via GitHub Actions

**Web:**
- Platform: Vercel (production deployment)
- Domain: `contractscan.app` (TBD - DNS setup)
- Auto-deploy: main branch

### CI/CD Pipeline

**GitHub Actions:**
```yaml
# .github/workflows/deploy.yml
on:
  push:
    branches: [main]

jobs:
  test:
    - Run Jest tests
    - Build Next.js app
    - TypeScript check

  deploy-bot:
    - Deploy to Railway (production)

  deploy-web:
    - Deploy to Vercel (automatic)
```

**Manual Steps:**
- Environment variable management (Railway + Vercel dashboards)
- Telegram webhook setup (one-time)

---

## 12. Open Questions

### For Operator Decision

1. **Domain Name:** Should we acquire `contractscan.app` or use `contractscan.vercel.app` for MVP?
   - Cost: ~$15/year for .app domain
   - Recommendation: Start with Vercel subdomain, buy domain after validation

2. **Error Handling for Unverified Contracts:** What should bot/web return?
   - Option A: "Contract not verified on block explorer. Cannot analyze."
   - Option B: Attempt analysis anyway (risky - could be proxy/malicious)
   - Recommendation: Option A (safer)

3. **Rate Limit Response:** When user hits limit, suggest what?
   - Option A: "Try again in X minutes"
   - Option B: "Upgrade to Pro for unlimited scans" (monetization seed)
   - Recommendation: Option A for MVP, B for future

4. **Analytics:** Should we track usage metrics from day 1?
   - Tool: PostHog (free tier) or simple logging
   - Metrics: Scans/day, top contracts scanned, cache hit rate
   - Recommendation: Yes - lightweight logging to file, analyze later

5. **Multi-Language Support:** English only for MVP?
   - Recommendation: Yes, English only. Add i18n later if demand

### Technical Decisions to Revisit

1. **Redis Migration Trigger:** At what scale do we move from in-memory to Redis?
   - Threshold: When deploying >1 instance (horizontal scaling)
   - Or: When cache eviction rate >20% (memory pressure)

2. **LLM Model Upgrade Path:** When to consider Gemini Pro or GPT-4?
   - Trigger: User complaints about analysis quality
   - Or: Budget allows ($0.05-0.10 per scan)

3. **Block Explorer Paid Tier:** When to upgrade from free?
   - Trigger: Hitting 100k calls/day limit
   - Cost: $50/month for 1M calls

---

## 13. Success Metrics (MVP)

**Week 1:**
- [ ] 50+ unique scans
- [ ] <5% error rate
- [ ] Cache hit rate >30%
- [ ] Average response time <10s

**Week 4:**
- [ ] 500+ unique scans
- [ ] Cache hit rate >50%
- [ ] Cost <$0.003 per scan (including cache hits)
- [ ] User retention: 20% return users

**Month 3:**
- [ ] 5,000+ scans
- [ ] SEO: Ranking for "contract scanner" (top 50)
- [ ] Viral coefficient >1.0 (shared reports)

---

## 14. Future Enhancements (Out of Scope for MVP)

1. **Multi-sig Detection:** Identify multi-sig contracts and ownership structure
2. **Historical Analysis:** Track contract changes over time (upgrades)
3. **Comparative Analysis:** Compare similar contracts (e.g., all DEX routers)
4. **PDF Export:** Generate shareable PDF reports
5. **Email Alerts:** Monitor contract for changes and alert users
6. **Pro Tier:** Unlimited scans, priority support, API access
7. **Audit Mode:** Detailed line-by-line code review for power users
8. **Integration:** Zapier webhook for automated scanning

---

**Document Version:** 1.0  
**Last Updated:** 2026-03-02  
**Next Review:** After MVP deployment (Week 2)

---

_Architecture by Codie (CTO) | App Mog Labs_
