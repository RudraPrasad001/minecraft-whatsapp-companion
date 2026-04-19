import { redis, sendWhatsAppMessage, MC_IP, MC_PORT, GROUP_ID } from '../lib/store.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(200).send('OK');

    const body = req.body;
    if (!body || !body.messageData || !body.messageData.textMessageData) {
        return res.status(200).send('Ignored');
    }

    const messageText = body.messageData.textMessageData.textMessage;
    const senderId = body.senderData.chatId;
    const textMessage = messageText.trim();

    if (textMessage === '!status') {
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
        return res.status(200).json({ success: true });
    }

    if (textMessage === '!players') {
        try {
            const response = await fetch(`https://api.mcstatus.io/v2/status/java/${MC_IP}:${MC_PORT}`);
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

            await sendWhatsAppMessage(GROUP_ID, replyMessage);
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
            `🥇 *!leaderboard* - Show the leaderboard based on Playtime.\n` +
            `🔕 *!activity off* / 🔔 *!activity on* - Toggle activity alerts.\n` +
            `ℹ️ *!help* - Show this command menu.\n`;
        
        try {
            await sendWhatsAppMessage(GROUP_ID, helpMessage);
            return res.status(200).json({ success: true });
        } catch (error) {
            console.error("Error sending help message:", error);
            return res.status(500).json({ error: 'Failed to send help menu' });
        }
    }

    if (textMessage === "!ip") {
        const helpMessage = `🤖 *Minecraft Server IP Address*\n\n*IP* - ${MC_IP}:${MC_PORT}\n`;
        try {
            await sendWhatsAppMessage(GROUP_ID, helpMessage);
            return res.status(200).json({ success: true });
        } catch (error) {
            console.error("Error sending ip message:", error);
            return res.status(500).json({ error: 'Failed to send ip' });
        }
    }

    if (textMessage === '!leaderboard') {
        try {
            const keys = await redis.keys('playtime:*');
            let replyMessage = "🏆 *Playtime Leaderboard*\n\n";

            if (!keys || keys.length === 0) {
                replyMessage += "No playtime recorded yet! Start playing.";
            } else {
                const scores = await redis.mget(...keys);
                let leaderboard = keys.map((key, index) => {
                    return {
                        name: key.split(':')[1],
                        minutes: parseInt(scores[index]) || 0
                    };
                }).sort((a, b) => b.minutes - a.minutes);

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

            await sendWhatsAppMessage(GROUP_ID, replyMessage);
            return res.status(200).json({ success: true });
        } catch (error) {
            console.error("Leaderboard Error:", error);
            return res.status(500).json({ error: 'Failed to fetch leaderboard' });
        }
    }

    if (textMessage === '!activity off') {
        try {
            await redis.set('alerts_player_activity', false);
            await sendWhatsAppMessage(GROUP_ID, "🔕 *Player Activity Alerts MUTED.*\nI will no longer announce when people join or leave. (Server crashes will still be reported).");
            return res.status(200).json({ success: true });
        } catch (error) {
            console.error("Error muting alerts:", error);
            return res.status(500).json({ error: 'Failed to mute alerts' });
        }
    }

    if (textMessage === '!activity on') {
        try {
            await redis.set('alerts_player_activity', true);
            await sendWhatsAppMessage(GROUP_ID, "🔔 *Player Activity Alerts UNMUTED.*\nI will now announce when people join and leave the server.");
            return res.status(200).json({ success: true });
        } catch (error) {
            console.error("Error unmuting alerts:", error);
            return res.status(500).json({ error: 'Failed to unmute alerts' });
        }
    }

    res.status(200).send('OK');
}