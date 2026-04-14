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
    try {
        const mcResponse = await fetch(`https://api.mcstatus.io/v2/status/java/${MC_IP}:${MC_PORT}`);
        const mcData = await mcResponse.json();
        currentStatus = mcData.online;
    } catch (e) {
        currentStatus = false;
    }

    const previousStatus = await redis.get('isServerUp');

    if (currentStatus !== previousStatus) {
        if (currentStatus) {
            await sendWhatsAppMessage(GROUP_ID, `✅ *Minecraft Server Alert*\nThe server is now ONLINE! Connect via ${MC_IP}:${MC_PORT}`);
        } else if (previousStatus !== null) { 
            await sendWhatsAppMessage(GROUP_ID, `❌ *Minecraft Server Alert*\nThe server just went OFFLINE.`);
        }
        
        await redis.set('isServerUp', currentStatus);
    }

    res.status(200).json({ status: currentStatus ? "UP" : "DOWN", stateChanged: currentStatus !== previousStatus });
}
