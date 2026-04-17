import { Redis } from '@upstash/redis';

const redis = new Redis({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
});

async function sendWhatsAppMessage(chatId, message) {
    const url = `https://api.green-api.com/waInstance${process.env.GREEN_API_ID}/sendMessage/${process.env.GREEN_API_TOKEN}`;
    await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId, message })
    });
}

export default async function handler(req, res) {
    const MC_IP = process.env.MC_SERVER_IP;
    const MC_PORT = process.env.MC_SERVER_PORT;
    const GROUP_ID = process.env.TARGET_GROUP_ID;

    let currentStatus = false;
    let mcData = null; 

    try {
        const mcResponse = await fetch(`https://api.mcstatus.io/v2/status/java/${MC_IP}:${MC_PORT}`);
        mcData = await mcResponse.json();
        currentStatus = mcData.online;
    } catch (e) {
        currentStatus = false;
    }

    // --- 1. Server UP and DOWN Alert ---
    const previousStatus = await redis.get('isServerUp');
    const stateChanged = currentStatus !== previousStatus;

    if (stateChanged) {
        if (currentStatus) {
            await sendWhatsAppMessage(GROUP_ID, `✅ *Minecraft Server Alert*\nThe server is now ONLINE! Connect via ${MC_IP}:${MC_PORT}`);
        } else if (previousStatus !== null) { 
            await sendWhatsAppMessage(GROUP_ID, `❌ *Minecraft Server Alert*\nThe server just went OFFLINE.`);
        }
        
        await redis.set('isServerUp', currentStatus);
    }

    // --- 2. Player Joined / Left Alert ---
    let currentPlayers = [];
    
    // Only grab names if the server is online and people are playing
    if (currentStatus && mcData?.players?.list) {
        currentPlayers = mcData.players.list.map(p => p.name_clean);
    }

    const oldPlayers = (await redis.get('last_players')) || [];

    // Only broadcast player changes if the server is actively running
    if (currentStatus) {
        const joined = currentPlayers.filter(player => !oldPlayers.includes(player));
        const left = oldPlayers.filter(player => !currentPlayers.includes(player));

        let alertMessage = "";
        if (joined.length > 0) alertMessage += `🟢 *Joined:* ${joined.join(', ')}\n`;
        if (left.length > 0) alertMessage += `🔴 *Left:* ${left.join(', ')}\n`;

        if (alertMessage !== "") {
            await sendWhatsAppMessage(GROUP_ID, `*Player Activity:*\n${alertMessage.trim()}`);
        }
    }

    //Playtime Monitoring
    if (currentStatus && currentPlayers.length > 0) {
        const pipeline = redis.pipeline();
        currentPlayers.forEach(player => {
            pipeline.incrby(`playtime:${player}`, 1);
        });
        await pipeline.exec();
    }

    //Update the latest player list in Redis (saves [] if offline)
    await redis.set('last_players', currentPlayers);

    res.status(200).json({ 
        status: currentStatus ? "UP" : "DOWN", 
        stateChanged: stateChanged 
    });
}