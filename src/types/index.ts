/**
 * ContractScan Types
 */

export type Network = "ethereum" | "base" | "arbitrum";

export interface ContractData {
  address: string;
  network: Network;
  sourceCode: string;
  abi: string;
  contractName: string;
  compilerVersion: string;
  isVerified: boolean;
  implementationAddress?: string; // For proxy contracts
}

export interface ContractAnalysis {
  summary: string;
  keyFunctions: Array<{
    name: string;
    purpose: string;
    accessControl: string;
    riskLevel: "LOW" | "MEDIUM" | "HIGH";
  }>;
  adminPrivileges: Array<{
    capability: string;
    risk: string;
  }>;
  riskScore: number; // 0-100
  risks: string[];
  advice: string;
}

export interface AnalysisResult {
  contract: ContractData;
  analysis: ContractAnalysis;
  cached: boolean;
  timestamp: Date;
}

export interface BotSession {
  contractAddress: string | null;
  network: Network | null;
  qaHistory: Array<{ q: string; a: string }>;
  lastAnalysis?: AnalysisResult;
}

export interface RateLimitStatus {
  allowed: boolean;
  remaining: number;
  resetTime: Date;
}

// Block explorer API response types
export interface EtherscanSourceCodeResponse {
  status: string;
  message: string;
  result: Array<{
    SourceCode: string;
    ABI: string;
    ContractName: string;
    CompilerVersion: string;
    Implementation?: string;
  }>;
}
