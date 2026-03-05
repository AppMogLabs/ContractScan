/**
 * Block Explorer API Integration
 * Supports: Etherscan, Basescan, Arbiscan
 */

import axios from "axios";
import type {
  Network,
  ContractData,
  EtherscanSourceCodeResponse,
} from "../types/index.js";

// API endpoints and keys from environment
const EXPLORER_APIS: Record<Network, { url: string; keyEnv: string }> = {
  ethereum: {
    url: "https://api.etherscan.io/api",
    keyEnv: "ETHERSCAN_API_KEY",
  },
  base: {
    url: "https://api.basescan.org/api",
    keyEnv: "BASESCAN_API_KEY",
  },
  arbitrum: {
    url: "https://api.arbiscan.io/api",
    keyEnv: "ARBISCAN_API_KEY",
  },
};

// Default to free tier rate limits
const RATE_LIMIT_MS = 200; // 5 requests per second = 200ms between requests
let lastRequestTime = 0;

/**
 * Rate limit helper
 */
async function rateLimit(): Promise<void> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < RATE_LIMIT_MS) {
    await new Promise((resolve) =>
      setTimeout(resolve, RATE_LIMIT_MS - timeSinceLastRequest)
    );
  }

  lastRequestTime = Date.now();
}

/**
 * Get API key for network
 */
function getApiKey(network: Network): string {
  const key = process.env[EXPLORER_APIS[network].keyEnv];
  if (!key) {
    throw new Error(
      `Missing API key for ${network}. Set ${EXPLORER_APIS[network].keyEnv}`
    );
  }
  return key;
}

/**
 * Fetch contract source code from block explorer
 */
export async function fetchContract(
  address: string,
  network: Network = "ethereum"
): Promise<ContractData> {
  await rateLimit();

  const apiUrl = EXPLORER_APIS[network].url;
  const apiKey = getApiKey(network);

  try {
    const response = await axios.get<EtherscanSourceCodeResponse>(apiUrl, {
      params: {
        module: "contract",
        action: "getsourcecode",
        address: address,
        apikey: apiKey,
      },
      timeout: 30000,
    });

    if (response.data.status !== "1" || !response.data.result?.[0]) {
      throw new Error(
        response.data.message || "Failed to fetch contract from block explorer"
      );
    }

    const result = response.data.result[0];

    // Check if contract is verified
    if (!result.SourceCode || result.SourceCode === "") {
      throw new Error(
        "Contract source code not verified on block explorer. Cannot analyze unverified contracts."
      );
    }

    return {
      address: address.toLowerCase(),
      network,
      sourceCode: result.SourceCode,
      abi: result.ABI || "[]",
      contractName: result.ContractName || "Unknown",
      compilerVersion: result.CompilerVersion || "Unknown",
      isVerified: true,
      implementationAddress: result.Implementation,
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.code === "ECONNABORTED") {
        throw new Error("Request timeout. Block explorer API is slow.");
      }
      throw new Error(
        `Block explorer API error: ${error.response?.data?.message || error.message}`
      );
    }
    throw error;
  }
}

/**
 * Detect network from contract address
 * Tries Ethereum first, then Base, then Arbitrum
 * Returns first network where contract exists
 */
export async function detectNetwork(
  address: string
): Promise<Network | null> {
  const networks: Network[] = ["ethereum", "base", "arbitrum"];

  for (const network of networks) {
    try {
      const apiUrl = EXPLORER_APIS[network].url;
      const apiKey = getApiKey(network);

      await rateLimit();

      const response = await axios.get<EtherscanSourceCodeResponse>(apiUrl, {
        params: {
          module: "contract",
          action: "getsourcecode",
          address: address,
          apikey: apiKey,
        },
        timeout: 10000,
      });

      // If we get a successful response with source code, this is the right network
      if (
        response.data.status === "1" &&
        response.data.result?.[0]?.SourceCode
      ) {
        return network;
      }
    } catch {
      // Continue to next network
      continue;
    }
  }

  return null;
}

/**
 * Validate that an address exists on a network
 */
export async function validateContractOnNetwork(
  address: string,
  network: Network
): Promise<boolean> {
  try {
    await fetchContract(address, network);
    return true;
  } catch {
    return false;
  }
}
