import { Redis } from '@upstash/redis';

// 1. Environment Variables
export const MC_IP = process.env.MC_SERVER_IP;
export const MC_PORT = process.env.MC_SERVER_PORT;
export const GROUP_ID = process.env.TARGET_GROUP_ID;

// 2. Redis Instance
export const redis = new Redis({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
});

// 3. Message Helper
export async function sendWhatsAppMessage(chatId, message) {
    const url = `https://api.green-api.com/waInstance${process.env.GREEN_API_ID}/sendMessage/${process.env.GREEN_API_TOKEN}`;
    await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId, message })
    });
}