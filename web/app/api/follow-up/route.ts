import { NextRequest, NextResponse } from "next/server";
import { answerFollowUp } from "@/lib/llm-analyzer";
import { checkFollowUpLimit, consumeFollowUpToken } from "@/lib/rate-limiter";
import { getCachedAnalysis } from "@/lib/cache";
import type { Network, ContractAnalysis } from "@/lib/types";

// In-memory session store for MVP (per IP)
interface Session {
  contractAddress: string;
  network: Network;
  qaHistory: Array<{ q: string; a: string }>;
  lastAnalysis: ContractAnalysis;
  lastActivity: Date;
}

const sessions = new Map<string, Session>();
const SESSION_TTL = 30 * 60 * 1000; // 30 minutes

function getUserId(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "unknown";
  return `web:${ip}`;
}

function getOrCreateSession(userId: string, address?: string, network?: Network, analysis?: ContractAnalysis): Session | null {
  // Clean expired sessions periodically
  const now = new Date();
  for (const [id, session] of sessions.entries()) {
    if (now.getTime() - session.lastActivity.getTime() > SESSION_TTL) {
      sessions.delete(id);
    }
  }

  let session = sessions.get(userId);
  
  // If we have address/network/analysis, create/update session
  if (address && network && analysis) {
    session = {
      contractAddress: address,
      network,
      qaHistory: session?.contractAddress === address ? session.qaHistory : [],
      lastAnalysis: analysis,
      lastActivity: now,
    };
    sessions.set(userId, session);
  }

  return session || null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { address, network, question } = body;

    if (!question || typeof question !== "string") {
      return NextResponse.json(
        { error: "Question is required" },
        { status: 400 }
      );
    }

    const userId = getUserId(req);

    // Check follow-up rate limit
    const rateLimit = checkFollowUpLimit(userId);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Follow-up question limit exceeded",
          remaining: 0,
          resetTime: rateLimit.resetTime,
        },
        { status: 429 }
      );
    }

    // Get or initialize session
    let session: Session | null = null;
    
    if (address && network) {
      // New contract context provided
      const cached = getCachedAnalysis(network as Network, address);
      if (cached) {
        session = getOrCreateSession(userId, address, network as Network, cached.analysis);
      }
    } else {
      // Use existing session
      session = getOrCreateSession(userId);
    }

    if (!session) {
      return NextResponse.json(
        { error: "No active contract analysis session. Please scan a contract first." },
        { status: 400 }
      );
    }

    // Consume follow-up token
    if (!consumeFollowUpToken(userId)) {
      return NextResponse.json(
        { error: "Follow-up question limit exceeded" },
        { status: 429 }
      );
    }

    // Build contract data from session
    const contractData = {
      address: session.contractAddress,
      network: session.network,
      sourceCode: "", // We don't store full source code in session
      abi: "[]",
      contractName: "Unknown",
      compilerVersion: "Unknown",
      isVerified: true,
    };

    // Get answer from LLM
    const answer = await answerFollowUp(
      contractData,
      session.lastAnalysis,
      session.qaHistory,
      question
    );

    // Update session with Q&A
    session.qaHistory.push({ q: question, a: answer });
    session.lastActivity = new Date();
    sessions.set(userId, session);

    return NextResponse.json({
      answer,
      contractAddress: session.contractAddress,
      rateLimit: {
        remaining: rateLimit.remaining - 1,
        resetTime: rateLimit.resetTime,
      },
    });
  } catch (error) {
    console.error("Follow-up error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to process question",
      },
      { status: 500 }
    );
  }
}
