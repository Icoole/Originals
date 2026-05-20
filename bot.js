require('dotenv').config();
const { Telegraf } = require('telegraf');
const express = require('express');

// Pull whichever naming convention you have set in your Render dashboard
const token = process.env.BOT_TOKEN || process.env.TELEGRAM_TOKEN;
const url = process.env.RENDER_EXTERNAL_URL; 
const port = process.env.PORT || 3000;

// SAFE GUARD: Create a dummy path if token is missing so the script never crashes on evaluation
const secretSuffix = token ? token.slice(-10) : 'fallback-secure-key';
const webhookPath = `/bot-webhook-${secretSuffix}`;

if (!token) {
    console.error('CRITICAL WARNING: BOT_TOKEN or TELEGRAM_TOKEN environment variable is missing entirely!');
}

const bot = token ? new Telegraf(token) : null;

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

// Only bind hooks if bot initialized successfully
if (bot) {
    // 1. GREET FIRST TIME USERS
    bot.on('new_chat_members', (ctx) => {
        const newMembers = ctx.message.new_chat_members;
        newMembers.forEach(member => {
            const username = member.username ? `@${member.username}` : member.first_name;
            ctx.reply(`Welcome to the community, ${username}! 👋\nType /help to see available commands.`);
        });
    });

    // 2. MODERATION
    bot.on('message', async (ctx, next) => {
        if (!ctx.message || !ctx.message.text) return next();

        const messageText = ctx.message.text.toLowerCase();
        const userId = ctx.from.id;

        const containsBannedWord = BANNED_WORDS.some(word => messageText.includes(word));
        if (containsBannedWord) {
            try {
                await ctx.deleteMessage(); 
                await ctx.banChatMember(userId); 
                return ctx.reply(`❌ User ${ctx.from.first_name} was banned for prohibited language.`);
            } catch (err) {
                console.error("Failed to ban/delete:", err);
            }
        }

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

    // 3. DM COMMAND RESPONSES Helper
    const sendToDM = async (ctx, text) => {
        try {
            await ctx.telegram.sendMessage(ctx.from.id, text, { parse_mode: 'Markdown' });
            if (ctx.chat.type !== 'private') {
                await ctx.reply(`📬 ${ctx.from.first_name}, I've sent the details to your DMs!`);
            }
        } catch (error) {
            if (ctx.chat.type !== 'private') {
                ctx.reply(`❌ ${ctx.from.first_name}, I couldn't DM you. Please click @${ctx.botInfo?.username || 'bot'} and press "Start" first!`);
            }
        }
    };

    // Commands
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
}

// --- EXPRESS SERVER ENGINE SETUP ---
const app = express();

if (bot) {
    app.use(bot.webhookCallback(webhookPath));
}

app.get('/', (req, res) => {
    if (!token) {
        res.status(500).send('Server active, but missing bot credentials configuration.');
    } else {
        res.send('PharmaChains Webhook Server is live and listening.');
    }
});

app.listen(port, async () => {
    console.log(`Express engine running on port ${port}`);
    if (bot && url) {
        try {
            await bot.telegram.setWebhook(`${url}${webhookPath}`);
            console.log(`🚀 Webhook successfully synced to: ${url}${webhookPath}`);
        } catch (err) {
            console.error('Failed to sync webhook structure with Telegram:', err);
        }
    } else if (!url) {
        console.warn('RENDER_EXTERNAL_URL missing; auto-sync skipped.');
    }
});

// Graceful exit
process.once('SIGINT', () => bot && bot.stop('SIGINT'));
process.once('SIGTERM', () => bot && bot.stop('SIGTERM'));