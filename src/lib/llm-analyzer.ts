/**
 * Gemini 2.0 Flash LLM Integration
 * Contract analysis and risk assessment
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import type {
  ContractData,
  ContractAnalysis,
  Network,
} from "../types/index.js";

// Initialize Gemini
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("GEMINI_API_KEY is not set");
}

const genAI = new GoogleGenerativeAI(apiKey);

// Use Gemini 2.0 Flash for cost efficiency
const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
  generationConfig: {
    temperature: 0.2, // Lower for more consistent analysis
    maxOutputTokens: 2048,
  },
});

// Cost tracking
interface CostLog {
  timestamp: Date;
  operation: string;
  tokensIn: number;
  tokensOut: number;
  cost: number;
}

const costLogs: CostLog[] = [];
const DAILY_BUDGET = 0.5; // $0.50 USD

/**
 * Calculate cost based on token usage
 * Gemini 2.0 Flash pricing: $0.075 per 1M input, $0.30 per 1M output
 */
function calculateCost(tokensIn: number, tokensOut: number): number {
  const inputCost = (tokensIn / 1_000_000) * 0.075;
  const outputCost = (tokensOut / 1_000_000) * 0.3;
  return inputCost + outputCost;
}

/**
 * Check if we're within budget
 */
export function checkBudget(): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dailySpend = costLogs
    .filter((log) => log.timestamp >= today)
    .reduce((sum, log) => sum + log.cost, 0);

  return dailySpend < DAILY_BUDGET;
}

/**
 * Get daily spend
 */
export function getDailySpend(): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return costLogs
    .filter((log) => log.timestamp >= today)
    .reduce((sum, log) => sum + log.cost, 0);
}

/**
 * Build the analysis prompt
 */
function buildAnalysisPrompt(contract: ContractData): string {
  const networkNames: Record<Network, string> = {
    ethereum: "Ethereum Mainnet",
    base: "Base",
    arbitrum: "Arbitrum One",
  };

  return `You are a smart contract security analyst. Analyze the following verified Solidity contract and provide a structured security assessment.

CONTRACT DETAILS:
- Address: ${contract.address}
- Network: ${networkNames[contract.network]}
- Name: ${contract.contractName}
- Compiler: ${contract.compilerVersion}

SOURCE CODE:
\`\`\`solidity
${contract.sourceCode.slice(0, 50000)} // Truncated if very long
\`\`\`

INSTRUCTIONS:
Provide a comprehensive analysis in valid JSON format with the following structure:

{
  "summary": "2-3 sentence plain English summary of what this contract does",
  "keyFunctions": [
    {
      "name": "function name",
      "purpose": "what this function does",
      "accessControl": "who can call it (e.g., 'public', 'owner only', 'anyone')",
      "riskLevel": "LOW|MEDIUM|HIGH"
    }
  ],
  "adminPrivileges": [
    {
      "capability": "what the owner/admin can do",
      "risk": "potential risk this capability introduces"
    }
  ],
  "riskScore": 0-100,
  "risks": ["list of specific risks or red flags"],
  "advice": "actionable advice for users interacting with this contract"
}

RISK SCORING GUIDE:
- 0-20: Very safe, minimal admin powers, well-audited standard contract
- 21-40: Generally safe, some admin functions but standard patterns
- 41-60: Moderate risk, significant admin powers or unaudited
- 61-80: High risk, can drain funds or pause contracts, unaudited
- 81-100: Critical risk, unaudited, can steal funds, many red flags

Be thorough but concise. Focus on security-relevant functions and risks.`;
}

/**
 * Build follow-up prompt
 */
function buildFollowUpPrompt(
  contract: ContractData,
  previousAnalysis: ContractAnalysis,
  qaHistory: Array<{ q: string; a: string }>,
  newQuestion: string
): string {
  const recentQA = qaHistory.slice(-3); // Last 3 exchanges

  return `You are a smart contract analyst answering a follow-up question about a previously analyzed contract.

CONTRACT: ${contract.contractName} (${contract.address})

PREVIOUS ANALYSIS SUMMARY:
${previousAnalysis.summary}

KEY FUNCTIONS IDENTIFIED:
${previousAnalysis.keyFunctions.map((f) => `- ${f.name}: ${f.purpose}`).join("\n")}

RISK SCORE: ${previousAnalysis.riskScore}/100

RECENT CONVERSATION:
${recentQA.map((qa, i) => `Q${i + 1}: ${qa.q}\nA${i + 1}: ${qa.a}`).join("\n\n")}

USER QUESTION: ${newQuestion}

Provide a concise, accurate answer based on the contract code and previous analysis. If the question asks about code not shown in previous analysis, reference the contract's general behavior and risks.`;
}

/**
 * Parse Gemini response to extract JSON
 */
function parseAnalysisResponse(response: string): ContractAnalysis {
  try {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = response.match(/```json\s*([\s\S]*?)```/) ||
                     response.match(/```\s*([\s\S]*?)```/) ||
                     response.match(/(\{[\s\S]*\})/);

    const jsonString = jsonMatch ? jsonMatch[1] || jsonMatch[0] : response;
    const cleaned = jsonString.replace(/```json|```/g, "").trim();

    const parsed = JSON.parse(cleaned);

    // Validate required fields
    if (typeof parsed.riskScore !== "number") {
      parsed.riskScore = 50; // Default if missing
    }

    return {
      summary: parsed.summary || "No summary available",
      keyFunctions: Array.isArray(parsed.keyFunctions) ? parsed.keyFunctions : [],
      adminPrivileges: Array.isArray(parsed.adminPrivileges) ? parsed.adminPrivileges : [],
      riskScore: Math.min(100, Math.max(0, parsed.riskScore)),
      risks: Array.isArray(parsed.risks) ? parsed.risks : [],
      advice: parsed.advice || "No advice available",
    };
  } catch (error) {
    console.error("Failed to parse analysis response:", error);
    console.error("Raw response:", response);

    // Return fallback analysis
    return {
      summary: "Failed to parse analysis. Please try again.",
      keyFunctions: [],
      adminPrivileges: [],
      riskScore: 50,
      risks: ["Analysis parsing failed"],
      advice: "Please retry the scan or ask for clarification.",
    };
  }
}

/**
 * Analyze a contract using Gemini
 */
export async function analyzeContract(
  contract: ContractData
): Promise<ContractAnalysis> {
  if (!checkBudget()) {
    throw new Error(
      "Daily budget exceeded. Please try again tomorrow or contact support."
    );
  }

  const prompt = buildAnalysisPrompt(contract);

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // Log cost (approximate token counts)
    const tokensIn = prompt.length / 4; // Rough estimate
    const tokensOut = text.length / 4;
    const cost = calculateCost(tokensIn, tokensOut);

    costLogs.push({
      timestamp: new Date(),
      operation: "scan",
      tokensIn: Math.floor(tokensIn),
      tokensOut: Math.floor(tokensOut),
      cost,
    });

    console.log(
      `📊 Scan cost: $${cost.toFixed(4)} | Daily spend: $${getDailySpend().toFixed(4)}`
    );

    return parseAnalysisResponse(text);
  } catch (error) {
    console.error("Gemini API error:", error);
    throw new Error(
      `Analysis failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Answer follow-up question
 */
export async function answerFollowUp(
  contract: ContractData,
  previousAnalysis: ContractAnalysis,
  qaHistory: Array<{ q: string; a: string }>,
  question: string
): Promise<string> {
  if (!checkBudget()) {
    throw new Error(
      "Daily budget exceeded. Please try again tomorrow or contact support."
    );
  }

  const prompt = buildFollowUpPrompt(contract, previousAnalysis, qaHistory, question);

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // Log cost
    const tokensIn = prompt.length / 4;
    const tokensOut = text.length / 4;
    const cost = calculateCost(tokensIn, tokensOut);

    costLogs.push({
      timestamp: new Date(),
      operation: "follow-up",
      tokensIn: Math.floor(tokensIn),
      tokensOut: Math.floor(tokensOut),
      cost,
    });

    console.log(
      `📊 Follow-up cost: $${cost.toFixed(4)} | Daily spend: $${getDailySpend().toFixed(4)}`
    );

    return text.trim();
  } catch (error) {
    console.error("Gemini API error:", error);
    throw new Error(
      `Failed to answer: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Get cost logs for monitoring
 */
export function getCostLogs(): CostLog[] {
  return [...costLogs];
}
