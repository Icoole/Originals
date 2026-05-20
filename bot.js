require('dotenv').config();
const { Telegraf } = require('telegraf');
const http = require('http');
// ... your bot.on() and bot.command() logic is up here ...

const bot = new Telegraf(process.env.BOT_TOKEN);

// --- CONFIGURATION ---
const BANNED_WORDS = ['scam', 'rugpull', 'pump', 'dump']; // Add lowercase words to ban
const CRYPTO_DETAILS = {
    ca: "`0x1234567890abcdef1234567890abcdef12345678` (Base)",
    website: "https://yourcryptoproject.com",
    telegram: "https://t.me/yourprojectgroup",
    twitter: "https://x.com/yourproject"
};

// 1. GREET FIRST TIME USERS (When they join a group)
bot.on('new_chat_members', (ctx) => {
    const newMembers = ctx.message.new_chat_members;
    newMembers.forEach(member => {
        const username = member.username ? `@${member.username}` : member.first_name;
        ctx.reply(`Welcome to the community, ${username}! 👋\nType /help to see available commands.`);
    });
});

// 2. MODERATION: Ban users for specific words & Delete Spam links
bot.on('message', async (ctx, next) => {
    if (!ctx.message || !ctx.message.text) return next();

    const messageText = ctx.message.text.toLowerCase();
    const userId = ctx.from.id;
    const chatId = ctx.chat.id;

    // Check for Banned Words -> Ban User & Delete Message
    const containsBannedWord = BANNED_WORDS.some(word => messageText.includes(word));
    if (containsBannedWord) {
        try {
            await ctx.deleteMessage(); // Delete the offending message
            await ctx.banChatMember(userId); // Ban the user
            return ctx.reply(`❌ User ${ctx.from.first_name} was banned for using prohibited language.`);
        } catch (err) {
            console.error("Failed to ban/delete (Bot might lack admin rights):", err);
        }
    }

    // Check for Spam (e.g., detecting external links from non-admins)
    // Simple regex to find URLs
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    if (urlRegex.test(messageText)) {
        // Optional: Check if user is an admin before deleting (Admins should be allowed to post links)
        try {
            const member = await ctx.getChatMember(userId);
            if (member.status !== 'administrator' && member.status !== 'creator' && ctx.chat.type !== 'private') {
                await ctx.deleteMessage();
                return ctx.reply(`⚠️ ${ctx.from.first_name}, external links are not allowed here!`);
            }
        } catch (err) {
            console.error("Spam check error:", err);
        }
    }

    return next();
});

// 3. DM COMMAND RESPONSES (Sends details to user's DM)
const sendToDM = async (ctx, text) => {
    try {
        // Send message to the user's private chat
        await ctx.telegram.sendMessage(ctx.from.id, text, { parse_mode: 'Markdown' });
        // Inform the group that info was sent to DM (if command was used in group)
        if (ctx.chat.type !== 'private') {
            await ctx.reply(`📬 ${ctx.from.first_name}, I've sent the details to your DMs! Check your private messages.`);
        }
    } catch (error) {
        // Triggers if the user hasn't started the bot privately first
        if (ctx.chat.type !== 'private') {
            ctx.reply(`❌ ${ctx.from.first_name}, I couldn't DM you. Please click @${ctx.botInfo.username} and press "Start" first!`);
        }
    }
};

// Command Triggers
bot.command('ca', (ctx) => {
    sendToDM(ctx, `📄 *Contract Address:* \n\n${CRYPTO_DETAILS.ca}`);
});

bot.command('website', (ctx) => {
    sendToDM(ctx, `🌐 *Official Website:* \n${CRYPTO_DETAILS.website}`);
// 1. Create the basic HTTP server for Render's health check
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('PharmaChains Bot is active and running live!\n');
});

bot.command('links', (ctx) => {
    const linksMessage = `🔗 *Official Project Links:* \n\n` +
                         `🌐 Website: ${CRYPTO_DETAILS.website}\n` +
                         `📱 Telegram: ${CRYPTO_DETAILS.telegram}\n` +
                         `🐦 Twitter/X: ${CRYPTO_DETAILS.twitter}\n` +
                         `📄 CA: ${CRYPTO_DETAILS.ca}`;
    sendToDM(ctx, linksMessage);
});
// 2. Launch the Telegram Bot connection
bot.launch()
    .then(() => console.log('🚀 PharmaChains Bot successfully connected to Telegram!'))
    .catch((err) => console.error('Failed to launch bot:', err));

// Start the bot locally for testing
bot.launch().then(() => {
    console.log('🚀 Crypto Bot is running smoothly...');
// 3. Bind the server to Render's dynamic port (Crucial Fix)
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

// ... upper part of your bot.js code ...

// Start the bot locally
bot.launch().then(() => {
    console.log('🚀 PharmaChains Bot is live and running...');
});

// Web server for Render hosting uptime check (THIS GOES HERE, NOT IN PACKAGE.JSON)
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('PharmaChains Bot is alive\n');
});
server.listen(process.env.PORT || 3000);

// Graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));