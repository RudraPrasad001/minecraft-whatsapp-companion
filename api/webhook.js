import { Redis } from '@upstash/redis';
async function sendWhatsAppMessage(chatId, message) {
    const url = `https://api.green-api.com/waInstance${process.env.GREEN_API_ID}/sendMessage/${process.env.GREEN_API_TOKEN}`;
    await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId, message })
    });
}

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(200).send('OK');

    const body = req.body;
    
    if (!body || !body.messageData || !body.messageData.textMessageData) {
        return res.status(200).send('Ignored');
    }

    const messageText = body.messageData.textMessageData.textMessage;
    const senderId = body.senderData.chatId;
    const textMessage = messageText.trim()
    if (textMessage === '!status') {
        const MC_IP = process.env.MC_SERVER_IP;
        const MC_PORT = process.env.MC_SERVER_PORT;

        try {
            const mcResponse = await fetch(`https://api.mcstatus.io/v2/status/java/${MC_IP}:${MC_PORT}`);
            const status = await mcResponse.json();

            if (status.online) {
                const reply = `🟢 *Server is ONLINE*\nPlayers: ${status.players.online}/${status.players.max}\nVersion: ${status.version.name_clean}`;
                await sendWhatsAppMessage(senderId, reply);
            } else {
                await sendWhatsAppMessage(senderId, `🔴 *Server is OFFLINE*\nThe machine or tunnel is currently unreachable.`);
            }
        } catch (e) {
            await sendWhatsAppMessage(senderId, `🔴 *Server is OFFLINE*\nError fetching status.`);
        }
    }

    if (textMessage === '!players') {
    const mcIp = process.env.MC_SERVER_IP;
    const mcPort = process.env.MC_SERVER_PORT;
    const apiUrl = `https://api.mcstatus.io/v2/status/java/${mcIp}:${mcPort}`;

    try {
        const response = await fetch(apiUrl);
        const data = await response.json();

        let replyMessage = "";

        if (!data.online) {
            replyMessage = "❌ *The server is currently offline.*";
        } else if (data.players.online === 0) {
            replyMessage = "👻 *Server is UP, but nobody is playing right now.*";
        } else {
            const playerNames = data.players.list.map(p => `• ${p.name_clean}`).join('\n');
            
            replyMessage = `🎮 *Players Online (${data.players.online}/${data.players.max}):*\n\n${playerNames}`;
        }

        const greenApiUrl = `https://api.green-api.com/waInstance${process.env.GREEN_API_ID}/sendMessage/${process.env.GREEN_API_TOKEN}`;
        await fetch(greenApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chatId: process.env.TARGET_GROUP_ID,
                message: replyMessage
            })
        });

        return res.status(200).json({ success: true });

    } catch (error) {
        console.error("Error fetching player list:", error);
        return res.status(500).json({ error: 'Failed to fetch players' });
        }
    }

    if (textMessage === '!help') {
    const helpMessage = `🤖 *Web-Server Bot Commands*\n\n` +
        `🟢 *!status* - Check if the server is UP or DOWN and see the current capacity.\n` +
        `🎮 *!players* - Get a live list of everyone currently playing on the server.\n` +
        `🏠 *!ip* - Get the IP Address of the server.\n` +
        `ℹ️ *!help* - Show this command menu.\n` +
        `🥇 *!leaderboard* - Show the leaderboard based on Playtime.\n` ;

    const greenApiUrl = `https://api.green-api.com/waInstance${process.env.GREEN_API_ID}/sendMessage/${process.env.GREEN_API_TOKEN}`;
    
    try {
        await fetch(greenApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chatId: process.env.TARGET_GROUP_ID,
                message: helpMessage
            })
        });

        return res.status(200).json({ success: true });

    } catch (error) {
        console.error("Error sending help message:", error);
        return res.status(500).json({ error: 'Failed to send help menu' });
        }
    }

    if (textMessage === "!ip") {
    const mcIp = process.env.MC_SERVER_IP;
    const mcPort = process.env.MC_SERVER_PORT;
    const helpMessage = `🤖 *Minecraft Server IP Address*\n\n`+`*IP* - ${mcIp}:${mcPort}\n`

    const greenApiUrl = `https://api.green-api.com/waInstance${process.env.GREEN_API_ID}/sendMessage/${process.env.GREEN_API_TOKEN}`;
    
    try {
        await fetch(greenApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chatId: process.env.TARGET_GROUP_ID,
                message: helpMessage
            })
        });

        return res.status(200).json({ success: true });

    } catch (error) {
        console.error("Error sending help message:", error);
        return res.status(500).json({ error: 'Failed to send help menu' });
        }
    }

    if (textMessage === '!leaderboard') {
    try {
        const redis = new Redis({
            url: process.env.KV_REST_API_URL,
            token: process.env.KV_REST_API_TOKEN,
        });

        // 1. Find all playtime 
        const keys = await redis.keys('playtime:*');
        
        let replyMessage = "🏆 *Playtime Leaderboard*\n\n";

        if (!keys || keys.length === 0) {
            replyMessage += "No playtime recorded yet! Start playing.";
        } else {
            const scores = await redis.mget(...keys);
            
            //Map keys and scores together, highest to lowest
            let leaderboard = keys.map((key, index) => {
                return { 
                    name: key.split(':')[1],
                    minutes: parseInt(scores[index]) || 0 
                };
            }).sort((a, b) => b.minutes - a.minutes);

            //Format with medals and hours/minutes
            const medals = ['🥇', '🥈', '🥉'];
            
            leaderboard.forEach((player, index) => {
                const hours = Math.floor(player.minutes / 60);
                const mins = player.minutes % 60;
                const medal = medals[index] || '🎮';
                
                let timeStr = "";
                if (hours > 0) timeStr += `${hours}h `;
                timeStr += `${mins}m`;

                replyMessage += `${medal} *${player.name}* - ${timeStr}\n`;
            });
        }

        const greenApiUrl = `https://api.green-api.com/waInstance${process.env.GREEN_API_ID}/sendMessage/${process.env.GREEN_API_TOKEN}`;
        await fetch(greenApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chatId: process.env.TARGET_GROUP_ID,
                message: replyMessage
            })
        });

        return res.status(200).json({ success: true });

        } catch (error) {
            console.error("Leaderboard Error:", error);
            return res.status(500).json({ error: 'Failed to fetch leaderboard' });
        }
    }

    res.status(200).send('OK');
}
