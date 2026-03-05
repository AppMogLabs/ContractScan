import { Bot, Context, session, SessionFlavor } from "grammy";
import dotenv from "dotenv";
import type { BotSession, Network } from "./types/index.js";
import { fetchContract, detectNetwork } from "./lib/contract-fetcher.js";
import { analyzeContract, answerFollowUp } from "./lib/llm-analyzer.js";
import {
  getCachedAnalysis,
  setCachedAnalysis,
} from "./lib/cache.js";
import {
  checkScanLimit,
  consumeScanToken,
  checkFollowUpLimit,
  consumeFollowUpToken,
  getUserLimitInfo,
} from "./lib/rate-limiter.js";

dotenv.config();

// Bot token from environment
const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  throw new Error("TELEGRAM_BOT_TOKEN is not set");
}

// Define custom context type with session
type MyContext = Context & SessionFlavor<BotSession>;

// Create bot instance
const bot = new Bot<MyContext>(token);

// Session middleware
bot.use(
  session({
    initial: (): BotSession => ({
      contractAddress: null,
      network: null,
      qaHistory: [],
      lastAnalysis: undefined,
    }),
  })
);

// Ethereum address validation regex
const ETH_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

function validateAddress(address: string): boolean {
  return ETH_ADDRESS_REGEX.test(address);
}

// Network display names
const networkNames: Record<Network, string> = {
  ethereum: "Ethereum",
  base: "Base",
  arbitrum: "Arbitrum",
};

// Risk score emoji
function getRiskEmoji(score: number): string {
  if (score <= 20) return "🟢";
  if (score <= 40) return "🟡";
  if (score <= 60) return "🟠";
  if (score <= 80) return "🔴";
  return "⛔";
}

// Format analysis for display
function formatAnalysis(
  address: string,
  network: Network,
  analysis: import("./types/index.js").ContractAnalysis
): string {
  const riskEmoji = getRiskEmoji(analysis.riskScore);

  let message = `🔍 *Contract Analysis*\n\n`;
  message += `📋 *${analysis.summary}*\n\n`;
  message += `📍 *Address:* \`${address}\`\n`;
  message += `🔗 *Network:* ${networkNames[network]}\n`;
  message += `⚠️ *Risk Score:* ${riskEmoji} ${analysis.riskScore}/100\n\n`;

  if (analysis.keyFunctions.length > 0) {
    message += `🔧 *Key Functions:*\n`;
    analysis.keyFunctions.slice(0, 5).forEach((fn) => {
      const risk = fn.riskLevel === "HIGH" ? " ⚠️" : "";
      message += `• *${fn.name}* - ${fn.purpose.slice(0, 50)}${fn.purpose.length > 50 ? "..." : ""}${risk}\n`;
    });
    message += "\n";
  }

  if (analysis.adminPrivileges.length > 0) {
    message += `👤 *Admin Privileges:*\n`;
    analysis.adminPrivileges.slice(0, 3).forEach((priv) => {
      message += `• ${priv.capability}\n`;
    });
    message += "\n";
  }

  if (analysis.risks.length > 0) {
    message += `⚡ *Key Risks:*\n`;
    analysis.risks.slice(0, 4).forEach((risk) => {
      message += `• ${risk.slice(0, 100)}${risk.length > 100 ? "..." : ""}\n`;
    });
    message += "\n";
  }

  message += `💡 *Advice:*\n${analysis.advice.slice(0, 200)}${analysis.advice.length > 200 ? "..." : ""}\n\n`;
  message += `_Ask follow-up questions for 30 minutes!_`;

  return message;
}

// /start command
bot.command("start", (ctx) => {
  ctx.reply(
    `🔍 *Welcome to ContractScan!*

I analyze smart contracts and explain them in plain English.

*How to use:*
1. Send me a contract address (0x...)
2. Get instant analysis and risk assessment
3. Ask follow-up questions for 30 minutes

*Supported networks:*
• Ethereum
• Base  
• Arbitrum

*Commands:*
/help - Show commands
/scan <address> - Analyze a contract
/clear - Clear conversation history

*Rate limits:*
• 10 scans/hour
• 30 scans/day`,
    { parse_mode: "Markdown" }
  );
});

// /help command
bot.command("help", (ctx) => {
  const limits = getUserLimitInfo(String(ctx.from?.id || "unknown"));

  ctx.reply(
    `*ContractScan Commands:*

/start - Welcome message
/help - Show commands  
/scan <address> - Analyze a contract
/clear - Clear chat history

*Rate limits:*
• Hourly: ${limits.hourlyRemaining}/${10} remaining
• Daily: ${limits.dailyRemaining}/${30} remaining

*Example:*
\`/scan 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48\`

*Tip:* You can also just paste a contract address directly!`,
    { parse_mode: "Markdown" }
  );
});

// /scan command
bot.command("scan", async (ctx) => {
  const userId = String(ctx.from?.id || "unknown");
  const address = ctx.match.trim();

  if (!address) {
    return ctx.reply(
      "❌ Please provide a contract address.\n\nExample:\n`/scan 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48`",
      { parse_mode: "Markdown" }
    );
  }

  if (!validateAddress(address)) {
    return ctx.reply(
      "❌ Invalid Ethereum address format.\n\nAddress must:\n• Start with 0x\n• Be 42 characters long\n• Contain only hex characters (0-9, a-f)",
      { parse_mode: "Markdown" }
    );
  }

  // Check rate limit
  const limitStatus = checkScanLimit(userId);
  if (!limitStatus.allowed) {
    return ctx.reply(
      `⏳ *Rate limit reached*\n\nYou've used your scan quota.\nResets in: ${Math.ceil((limitStatus.resetTime.getTime() - Date.now()) / 60000)} minutes`,
      { parse_mode: "Markdown" }
    );
  }

  // Send "analyzing" message
  const analyzingMsg = await ctx.reply(
    `🔍 *Analyzing contract...*\n\n\`${address}\`\n\n_Detecting network and fetching source code..._`,
    { parse_mode: "Markdown" }
  );

  try {
    // Detect network
    await ctx.api.editMessageText(
      ctx.chat.id,
      analyzingMsg.message_id,
      `🔍 *Analyzing contract...*\n\n\`${address}\`\n\n_Detecting network..._`,
      { parse_mode: "Markdown" }
    );

    const network = await detectNetwork(address);

    if (!network) {
      await ctx.api.deleteMessage(ctx.chat.id, analyzingMsg.message_id);
      return ctx.reply(
        `❌ *Contract not found*\n\nCould not find this address on Ethereum, Base, or Arbitrum.\n\nMake sure:\n• The address is correct\n• The contract exists\n• It's a verified contract`,
        { parse_mode: "Markdown" }
      );
    }

    // Check cache
    const cached = getCachedAnalysis(network, address);
    if (cached) {
      await ctx.api.deleteMessage(ctx.chat.id, analyzingMsg.message_id);

      // Update session
      ctx.session.contractAddress = address;
      ctx.session.network = network;
      ctx.session.lastAnalysis = cached;
      ctx.session.qaHistory = [];

      return ctx.reply(formatAnalysis(address, network, cached.analysis), {
        parse_mode: "Markdown",
      });
    }

    // Fetch contract
    await ctx.api.editMessageText(
      ctx.chat.id,
      analyzingMsg.message_id,
      `🔍 *Analyzing contract...*\n\n\`${address}\`\n\n📍 Network: ${networkNames[network]}\n_Fetching source code..._`,
      { parse_mode: "Markdown" }
    );

    const contract = await fetchContract(address, network);

    // Analyze
    await ctx.api.editMessageText(
      ctx.chat.id,
      analyzingMsg.message_id,
      `🔍 *Analyzing contract...*\n\n\`${address}\`\n\n📍 Network: ${networkNames[network]}\n📝 Name: ${contract.contractName}\n_AI analysis in progress..._`,
      { parse_mode: "Markdown" }
    );

    const analysis = await analyzeContract(contract);

    // Consume rate limit token
    consumeScanToken(userId);

    // Cache result
    const result = {
      contract,
      analysis,
      cached: false,
      timestamp: new Date(),
    };
    setCachedAnalysis(network, address, result);

    // Update session
    ctx.session.contractAddress = address;
    ctx.session.network = network;
    ctx.session.lastAnalysis = result;
    ctx.session.qaHistory = [];

    // Send result
    await ctx.api.deleteMessage(ctx.chat.id, analyzingMsg.message_id);
    await ctx.reply(formatAnalysis(address, network, analysis), {
      parse_mode: "Markdown",
    });
  } catch (error) {
    await ctx.api.deleteMessage(ctx.chat.id, analyzingMsg.message_id).catch(() => {});

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    if (errorMessage.includes("not verified")) {
      return ctx.reply(
        `❌ *Unverified Contract*\n\nThis contract's source code is not verified on the block explorer.\n\nI can only analyze verified contracts for security reasons.`,
        { parse_mode: "Markdown" }
      );
    }

    console.error("Scan error:", error);
    return ctx.reply(
      `❌ *Analysis failed*\n\n${errorMessage}\n\nPlease try again or contact support if the issue persists.`,
      { parse_mode: "Markdown" }
    );
  }
});

// /clear command
bot.command("clear", (ctx) => {
  ctx.session.contractAddress = null;
  ctx.session.network = null;
  ctx.session.qaHistory = [];
  ctx.session.lastAnalysis = undefined;

  ctx.reply("✅ Conversation history cleared!");
});

// Handle direct address input (no /scan prefix)
bot.on("message:text", async (ctx) => {
  const userId = String(ctx.from?.id || "unknown");
  const text = ctx.message.text.trim();

  // Skip if it's a command
  if (text.startsWith("/")) {
    return;
  }

  // Check if it looks like an Ethereum address
  if (validateAddress(text)) {
    // Check rate limit
    const limitStatus = checkScanLimit(userId);
    if (!limitStatus.allowed) {
      return ctx.reply(
        `⏳ *Rate limit reached*\n\nYou've used your scan quota.`,
        { parse_mode: "Markdown" }
      );
    }

    // Send "analyzing" message
    const analyzingMsg = await ctx.reply(
      `🔍 *Analyzing contract...*\n\n\`${text}\`\n\n_Detecting network..._`,
      { parse_mode: "Markdown" }
    );

    try {
      // Detect network
      const network = await detectNetwork(text);

      if (!network) {
        await ctx.api.deleteMessage(ctx.chat.id, analyzingMsg.message_id);
        return ctx.reply(
          `❌ *Contract not found*\n\nCould not find this address on any supported network.`,
          { parse_mode: "Markdown" }
        );
      }

      // Check cache
      const cached = getCachedAnalysis(network, text);
      if (cached) {
        await ctx.api.deleteMessage(ctx.chat.id, analyzingMsg.message_id);

        ctx.session.contractAddress = text;
        ctx.session.network = network;
        ctx.session.lastAnalysis = cached;
        ctx.session.qaHistory = [];

        return ctx.reply(formatAnalysis(text, network, cached.analysis), {
          parse_mode: "Markdown",
        });
      }

      // Fetch and analyze
      const contract = await fetchContract(text, network);

      await ctx.api.editMessageText(
        ctx.chat.id,
        analyzingMsg.message_id,
        `🔍 *Analyzing contract...*\n\n📝 ${contract.contractName}\n_AI analysis in progress..._`,
        { parse_mode: "Markdown" }
      );

      const analysis = await analyzeContract(contract);

      consumeScanToken(userId);

      const result = {
        contract,
        analysis,
        cached: false,
        timestamp: new Date(),
      };
      setCachedAnalysis(network, text, result);

      ctx.session.contractAddress = text;
      ctx.session.network = network;
      ctx.session.lastAnalysis = result;
      ctx.session.qaHistory = [];

      await ctx.api.deleteMessage(ctx.chat.id, analyzingMsg.message_id);
      await ctx.reply(formatAnalysis(text, network, analysis), {
        parse_mode: "Markdown",
      });
    } catch (error) {
      await ctx.api.deleteMessage(ctx.chat.id, analyzingMsg.message_id).catch(() => {});

      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      if (errorMessage.includes("not verified")) {
        return ctx.reply(
          `❌ *Unverified Contract*\n\nThis contract's source code is not verified. I can only analyze verified contracts.`,
          { parse_mode: "Markdown" }
        );
      }

      console.error("Scan error:", error);
      return ctx.reply(
        `❌ *Analysis failed*\n\n${errorMessage}`,
        { parse_mode: "Markdown" }
      );
    }
  } else {
    // Check if it's a follow-up question
    if (
      ctx.session.contractAddress &&
      ctx.session.network &&
      ctx.session.lastAnalysis
    ) {
      const followUpLimit = checkFollowUpLimit(userId);
      if (!followUpLimit.allowed) {
        return ctx.reply(
          `⏳ *Follow-up limit reached*\n\nYou've used your 20 follow-up questions. Start a new scan to continue.`,
          { parse_mode: "Markdown" }
        );
      }

      const thinkingMsg = await ctx.reply(
        "🤔 *Thinking...*",
        { parse_mode: "Markdown" }
      );

      try {
        const answer = await answerFollowUp(
          ctx.session.lastAnalysis.contract,
          ctx.session.lastAnalysis.analysis,
          ctx.session.qaHistory,
          text
        );

        consumeFollowUpToken(userId);

        // Store Q&A
        ctx.session.qaHistory.push({ q: text, a: answer });

        await ctx.api.deleteMessage(ctx.chat.id, thinkingMsg.message_id);
        await ctx.reply(answer, { parse_mode: "Markdown" });
      } catch (error) {
        await ctx.api.deleteMessage(ctx.chat.id, thinkingMsg.message_id).catch(() => {});
        console.error("Follow-up error:", error);
        await ctx.reply(
          `❌ *Failed to answer*\n\n${error instanceof Error ? error.message : "Unknown error"}`,
          { parse_mode: "Markdown" }
        );
      }
    } else {
      // Not a valid address and no active session
      await ctx.reply(
        "💡 Send me a contract address (0x...) to analyze it!\n\nOr use /help to see all commands."
      );
    }
  }
});

// Error handling
bot.catch((err) => {
  console.error("Bot error:", err);
});

// Start the bot
bot.start({
  onStart: (botInfo) => {
    console.log(`✅ Bot started as @${botInfo.username}`);
    console.log(`📍 Environment: ${process.env.NODE_ENV || "development"}`);
    console.log(`🚀 Ready to receive messages!`);
  },
});

// Graceful shutdown
process.once("SIGINT", () => {
  console.log("\n🛑 Shutting down bot...");
  bot.stop();
  process.exit(0);
});

process.once("SIGTERM", () => {
  console.log("\n🛑 Shutting down bot...");
  bot.stop();
  process.exit(0);
});
