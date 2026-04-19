import { redis, sendWhatsAppMessage, MC_IP, MC_PORT, GROUP_ID } from '../lib/store.js';

export default async function handler(req, res) {
    let currentStatus = false;
    let mcData = null;

    try {
        const mcResponse = await fetch(`https://api.mcstatus.io/v2/status/java/${MC_IP}:${MC_PORT}`);
        mcData = await mcResponse.json();
        currentStatus = mcData.online;
    } catch (e) {
        currentStatus = false;
    }

    // --- 1. Server UP and DOWN Alert (Two-Strike System) ---
    const previousStatus = await redis.get('isServerUp');
    let failedAttempts = parseInt(await redis.get('failedAttempts')) || 0;
    
    // Define stateChanged so it can be returned safely at the end
    const stateChanged = currentStatus !== previousStatus;

    if (currentStatus) {
        if (previousStatus === false || previousStatus === null) {
            await sendWhatsAppMessage(GROUP_ID, `✅ *Minecraft Server Alert*\nThe server is now ONLINE! Connect via ${MC_IP}:${MC_PORT}`);
            await redis.set('isServerUp', true);
        }
        if (failedAttempts > 0) {
            await redis.set('failedAttempts', 0);
        }
    } else {
        failedAttempts += 1;
        await redis.set('failedAttempts', failedAttempts);

        if (failedAttempts === 2 && previousStatus !== false) {
            await sendWhatsAppMessage(GROUP_ID, `❌ *Minecraft Server Alert*\nThe server is OFFLINE or unresponsive.`);
            await redis.set('isServerUp', false);
        }
    }

    // --- 2. Player Joined / Left Alert ---
    let currentPlayers = [];
    if (currentStatus && mcData?.players?.list) {
        currentPlayers = mcData.players.list.map(p => p.name_clean);
    }

    const oldPlayers = (await redis.get('last_players')) || [];

    if (currentStatus) {
        const joined = currentPlayers.filter(player => !oldPlayers.includes(player));
        const left = oldPlayers.filter(player => !currentPlayers.includes(player));

        let alertMessage = "";
        if (joined.length > 0) alertMessage += `🟢 *Joined:* ${joined.join(', ')}\n`;
        if (left.length > 0) alertMessage += `🔴 *Left:* ${left.join(', ')}\n`;

        if (alertMessage !== "") {
            const alertsEnabled = await redis.get('alerts_player_activity');
            const shouldSend = alertsEnabled === null ? true : alertsEnabled;

            if (shouldSend) {
                await sendWhatsAppMessage(GROUP_ID, `*Player Activity:*\n${alertMessage.trim()}`);
            }
        }
    }

    // --- 3. Playtime Monitoring ---
    if (currentStatus && currentPlayers.length > 0) {
        const pipeline = redis.pipeline();
        currentPlayers.forEach(player => {
            pipeline.incrby(`playtime:${player}`, 1);
        });
        await pipeline.exec();
    }

    await redis.set('last_players', currentPlayers);

    res.status(200).json({
        status: currentStatus ? "UP" : "DOWN",
        stateChanged: stateChanged
    });
}