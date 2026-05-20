require('dotenv').config();
const { Telegraf } = require('telegraf');
const express = require('express');

// Adjust environment variable names to match what Render and Telegraf expect
const token = process.env.TELEGRAM_TOKEN || process.env.BOT_TOKEN;
const url = process.env.RENDER_EXTERNAL_URL; 
const port = process.env.PORT || 3000;

if (!token) {
    console.error('ERROR: Neither TELEGRAM_TOKEN nor BOT_TOKEN is set in the environment variables!');
    process.exit(1);
}

const bot = new Telegraf(token);

// --- CONFIGURATION ---
const BANNED_WORDS = ['scam', 'rugpull', 'pump', 'dump', 'trade', 'guaranteed 10x / 100x', 'get [2X]', 'group']; 
const CRYPTO_DETAILS = {
    dexscreener: 'https://dexscreener.com/base/0x505c61211c344E141b73057942Ce12E1E38468ee',
    blog: 'https://pharmachains.ai/health-hub/us',
    xus: 'https://x.com/pharmachainaius',
    xafrica: 'https://x.com/pharmachainai',
    instagram: 'https://www.instagram.com/pharmachainai',
    linkedin: 'https://www.linkedin.com/company/pharmachains',
    explorer: 'https://basescan.org/token/0x3513e4a7d27d18c2c894d98bc5a55406360b9ba3',
    ca: '0x3513e4a7d27d18c2c894d98bc5a55406360b9ba3',
    website: 'https://www.pharmachains.ai',
    telegram: 'https://t.me/PharmaChainsAI',
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
            await ctx.deleteMessage(); 
            await ctx.banChatMember(userId); 
            return ctx.reply(`❌ User ${ctx.from.first_name} was banned for using prohibited language.`);
        } catch (err) {
            console.error("Failed to ban/delete (Bot might lack admin rights):", err);
        }
    }

    // Check for Spam (detecting external links from non-admins)
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    if (urlRegex.test(messageText)) {
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
        await ctx.telegram.sendMessage(ctx.from.id, text, { parse_mode: 'Markdown' });
        if (ctx.chat.type !== 'private') {
            await ctx.reply(`📬 ${ctx.from.first_name}, I've sent the details to your DMs! Check your private messages.`);
        }
    } catch (error) {
        if (ctx.chat.type !== 'private') {
            ctx.reply(`❌ ${ctx.from.first_name}, I couldn't DM you. Please click @${ctx.botInfo?.username || 'bot'} and press "Start" first!`);
        }
    }
};

// Command Triggers
bot.command('ca', (ctx) => { sendToDM(ctx, `📄 *Contract Address:* \n\n${CRYPTO_DETAILS.ca}`); });
bot.command('dexscreener', (ctx) => { sendToDM(ctx, `📄 *DexScreener Link:* \n\n${CRYPTO_DETAILS.dexscreener}`); });
bot.command('blog', (ctx) => { sendToDM(ctx, `📄 *Blog Link:* \n\n${CRYPTO_DETAILS.blog}`); });
bot.command('xafrica', (ctx) => { sendToDM(ctx, `🐦 *Xafrica:* \n\n${CRYPTO_DETAILS.xafrica}`); });
bot.command('xus', (ctx) => { sendToDM(ctx, `🐦 *Xus:* \n\n${CRYPTO_DETAILS.xus}`); });
bot.command('explorer', (ctx) => { sendToDM(ctx, `🌐 *Explorer:* \n\n${CRYPTO_DETAILS.explorer}`); });
bot.command('website', (ctx) => { sendToDM(ctx, `🌐 *Official Website:* \n${CRYPTO_DETAILS.website}`); });
bot.command('links', (ctx) => {
    const linksMessage = `🔗 *Official Project Links:* \n\n` +
                         `🌐 Website: ${CRYPTO_DETAILS.website}\n` +
                         `📱 Telegram: ${CRYPTO_DETAILS.telegram}\n` +
                         `🐦 Xus: ${CRYPTO_DETAILS.xus}\n` +
                         `🐦 Xafrica: ${CRYPTO_DETAILS.xafrica}\n` +
                         `📱 DexScreener: ${CRYPTO_DETAILS.dexscreener}\n` +
                         `📄 Blog: ${CRYPTO_DETAILS.blog}\n`;
    sendToDM(ctx, linksMessage);
});

// --- WEBHOOK ENGINE SETTINGS ---
const app = express();
const webhookPath = `/bot-webhook-${token.slice(-10)}`; // Secure path using last 10 characters of the token

// Wire Telegraf's processing logic straight into Express
app.use(bot.webhookCallback(webhookPath));

// Web service health check page for Render's monitoring system
app.get('/', (req, res) => {
    res.send('PharmaChains Webhook Server is live.');
});

// Start listening and register webhook location with Telegram API
app.listen(port, async () => {
    console.log(`Express webhook server processing events on port ${port}`);
    if (url) {
        try {
            await bot.telegram.setWebhook(`${url}${webhookPath}`);
            console.log(`🚀 Webhook successfully synced to: ${url}${webhookPath}`);
        } catch (err) {
            console.error('CRITICAL: Failed to register webhook endpoint with Telegram:', err);
        }
    } else {
        console.warn('WARNING: RENDER_EXTERNAL_URL environment variable is empty. Webhook hook registration skipped.');
    }
});

// Clean shutdowns
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));