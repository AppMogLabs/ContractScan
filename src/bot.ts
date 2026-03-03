import { Bot, Context, session } from "grammy";
import dotenv from "dotenv";

dotenv.config();

// Bot token from environment
const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  throw new Error("TELEGRAM_BOT_TOKEN is not set");
}

// Create bot instance
const bot = new Bot(token);

// Session middleware (for future follow-up Q&A)
bot.use(
  session({
    initial: () => ({
      contractAddress: null,
      network: null,
      qaHistory: [],
    }),
  })
);

// Ethereum address validation regex
const ETH_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

function validateAddress(address: string): boolean {
  return ETH_ADDRESS_REGEX.test(address);
}

// /start command
bot.command("start", (ctx) => {
  ctx.reply(
    `🔍 *Welcome to ContractScan!*

I help you understand smart contracts in plain English.

*How to use:*
1. Send me a contract address (0x...)
2. Get instant analysis and risk assessment
3. Ask follow-up questions for 30 minutes

*Supported networks:*
• Ethereum
• Base  
• Arbitrum

*Commands:*
/help - Show this message
/scan <address> - Analyze a contract
/clear - Clear conversation history

_Currently in development. Full analysis coming Wed 4 Mar._`,
    { parse_mode: "Markdown" }
  );
});

// /help command
bot.command("help", (ctx) => {
  ctx.reply(
    `*ContractScan Commands:*

/start - Welcome message
/help - Show commands  
/scan <address> - Analyze a contract
/clear - Clear chat history

*Example:*
\`/scan 0x1234567890123456789012345678901234567890\`

*Tip:* You can also just paste a contract address directly!`,
    { parse_mode: "Markdown" }
  );
});

// /scan command
bot.command("scan", async (ctx) => {
  const address = ctx.match.trim();

  if (!address) {
    return ctx.reply(
      "❌ Please provide a contract address.\n\nExample:\n`/scan 0x1234...5678`",
      { parse_mode: "Markdown" }
    );
  }

  if (!validateAddress(address)) {
    return ctx.reply(
      "❌ Invalid Ethereum address format.\n\nAddress must:\n• Start with 0x\n• Be 42 characters long\n• Contain only hex characters (0-9, a-f)",
      { parse_mode: "Markdown" }
    );
  }

  // Placeholder response (bot scaffold working)
  await ctx.reply(
    `✅ *Bot scaffold working!*

📋 Contract: \`${address}\`

🚧 Full analysis pipeline coming *Wed 4 Mar*.

For now, this confirms:
✓ Bot is running
✓ Address validation working
✓ Command parsing functional

_Stay tuned for the complete analysis feature!_`,
    { parse_mode: "Markdown" }
  );
});

// /clear command
bot.command("clear", (ctx) => {
  ctx.session.contractAddress = null;
  ctx.session.network = null;
  ctx.session.qaHistory = [];
  
  ctx.reply("✅ Conversation history cleared!");
});

// Handle direct address input (no /scan prefix)
bot.on("message:text", async (ctx) => {
  const text = ctx.message.text.trim();

  // Skip if it's a command
  if (text.startsWith("/")) {
    return;
  }

  // Check if it looks like an Ethereum address
  if (validateAddress(text)) {
    await ctx.reply(
      `✅ *Bot scaffold working!*

📋 Contract: \`${text}\`

🚧 Full analysis pipeline coming *Wed 4 Mar*.

For now, this confirms:
✓ Bot is running
✓ Address validation working
✓ Direct address input functional

_Stay tuned for the complete analysis feature!_`,
      { parse_mode: "Markdown" }
    );
  } else {
    // Not a valid address, ignore or provide help
    await ctx.reply(
      "💡 Send me a contract address (0x...) to analyze it!\n\nOr use /help to see all commands."
    );
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
