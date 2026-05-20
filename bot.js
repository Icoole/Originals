// ... your bot.on() and bot.command() logic is up here ...

// 1. Create the basic HTTP server for Render's health check
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('PharmaChains Bot is active and running live!\n');
});

// 2. Launch the Telegram Bot connection
bot.launch()
    .then(() => console.log('🚀 PharmaChains Bot successfully connected to Telegram!'))
    .catch((err) => console.error('Failed to launch bot:', err));

// 3. Bind the server to Render's dynamic port (Crucial Fix)
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));