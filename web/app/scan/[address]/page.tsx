import { notFound } from "next/navigation";
import type { AnalysisResult, Network } from "@/lib/types";
import { getCachedAnalysis, setCachedAnalysis } from "@/lib/cache";
import { fetchContract } from "@/lib/contract-fetcher";
import { analyzeContract } from "@/lib/llm-analyzer";
import ScanReport from "@/components/ScanReport";

interface ScanPageProps {
  params: Promise<{
    address: string;
  }>;
  searchParams: Promise<{
    network?: string;
  }>;
}

// Generate metadata for SEO
export async function generateMetadata({ params }: ScanPageProps) {
  const { address } = await params;
  return {
    title: `Contract Analysis: ${address.slice(0, 6)}...${address.slice(-4)} | ContractScan`,
    description: `AI-powered security analysis of smart contract ${address} on Ethereum, Base, or Arbitrum.`,
  };
}

async function getAnalysisResult(
  address: string,
  networkParam?: string
): Promise<AnalysisResult | null> {
  const networks: Network[] = ["ethereum", "base", "arbitrum"];
  const targetNetwork = networkParam as Network | undefined;

  if (targetNetwork && networks.includes(targetNetwork)) {
    // Use specified network
    const cached = getCachedAnalysis(targetNetwork, address);
    if (cached) {
      return cached;
    }

    // Fetch and analyze
    const contract = await fetchContract(address, targetNetwork);
    const analysis = await analyzeContract(contract);
    const result: AnalysisResult = {
      contract,
      analysis,
      cached: false,
      timestamp: new Date(),
    };
    setCachedAnalysis(targetNetwork, address, result);
    return result;
  }

  // Try all networks - check cache first
  for (const network of networks) {
    const cached = getCachedAnalysis(network, address);
    if (cached) {
      return cached;
    }
  }

  // Try to fetch from each network
  for (const network of networks) {
    try {
      const contract = await fetchContract(address, network);
      const analysis = await analyzeContract(contract);
      const result: AnalysisResult = {
        contract,
        analysis,
        cached: false,
        timestamp: new Date(),
      };
      setCachedAnalysis(network, address, result);
      return result;
    } catch {
      continue;
    }
  }

  return null;
}

export default async function ScanPage({ params, searchParams }: ScanPageProps) {
  const { address } = await params;
  const { network: networkParam } = await searchParams;

  // Validate address format
  if (!/^0x[a-fA-F0-9]{40}$/i.test(address)) {
    notFound();
  }

  const normalizedAddress = address.toLowerCase();

  try {
    const result = await getAnalysisResult(normalizedAddress, networkParam);

    if (!result) {
      notFound();
    }

    return (
      <main className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
        <ScanReport result={result} />
      </main>
    );
  } catch (error) {
    console.error("Scan error:", error);
    notFound();
  }
}
