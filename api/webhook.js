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

    if (messageText.trim() === '!status') {
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

    res.status(200).send('OK');
}
