import { NextRequest, NextResponse } from "next/server";
import { fetchContract, detectNetwork } from "@/lib/contract-fetcher";
import { analyzeContract } from "@/lib/llm-analyzer";
import { getCachedAnalysis, setCachedAnalysis } from "@/lib/cache";
import { checkScanLimit, consumeScanToken } from "@/lib/rate-limiter";
import type { Network, AnalysisResult } from "@/lib/types";

// Simple IP-based user ID for web users
function getUserId(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "unknown";
  return `web:${ip}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { address, network } = body;

    // Validate address
    if (!address || typeof address !== "string") {
      return NextResponse.json(
        { error: "Contract address is required" },
        { status: 400 }
      );
    }

    // Basic address format validation
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return NextResponse.json(
        { error: "Invalid Ethereum address format" },
        { status: 400 }
      );
    }

    const userId = getUserId(req);

    // Check rate limit
    const rateLimit = checkScanLimit(userId);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          remaining: 0,
          resetTime: rateLimit.resetTime,
        },
        { status: 429 }
      );
    }

    // Detect or use provided network
    let targetNetwork: Network;
    if (network && ["ethereum", "base", "arbitrum"].includes(network)) {
      targetNetwork = network as Network;
    } else {
      // Auto-detect network
      const detected = await detectNetwork(address);
      if (!detected) {
        return NextResponse.json(
          { error: "Contract not found on supported networks (Ethereum, Base, Arbitrum)" },
          { status: 404 }
        );
      }
      targetNetwork = detected;
    }

    // Check cache
    const cached = getCachedAnalysis(targetNetwork, address);
    if (cached) {
      return NextResponse.json({
        ...cached,
        cached: true,
        rateLimit: {
          remaining: rateLimit.remaining,
          resetTime: rateLimit.resetTime,
        },
      });
    }

    // Consume rate limit token
    if (!consumeScanToken(userId)) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429 }
      );
    }

    // Fetch contract
    const contract = await fetchContract(address, targetNetwork);

    // Analyze contract
    const analysis = await analyzeContract(contract);

    // Build result
    const result: AnalysisResult = {
      contract,
      analysis,
      cached: false,
      timestamp: new Date(),
    };

    // Cache result
    setCachedAnalysis(targetNetwork, address, result);

    return NextResponse.json({
      ...result,
      rateLimit: {
        remaining: rateLimit.remaining - 1,
        resetTime: rateLimit.resetTime,
      },
    });
  } catch (error) {
    console.error("Scan error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to analyze contract",
      },
      { status: 500 }
    );
  }
}
