# Minecraft SMP WhatsApp Companion

A lightweight WhatsApp bot that acts as a personal companion for your Minecraft SMP group chat. It monitors your server status, tracks playtime, and responds to commands directly from WhatsApp without needing any server plugins.

## Features
* **Automated Alerts:** Checks the server every 5 minutes and sends a message to the group/chat if the status changes (UP/DOWN).
* **Activity Tracking:** Announces in the chat when players join or leave the server (can be muted/unmuted).
* **Playtime Leaderboard:** Automatically tracks how long players are online and ranks them.
* **Interactive Commands:** Group/Chat members can use commands to instantly get server IP, player lists, and stats.
* **Flexible Hosting:** Can be deployed on any serverless platform (like Render, Netlify, Railway) or run on a traditional VPS.

## Commands
The bot currently supports the following commands in the WhatsApp group/chat:
* `!status` - Check if the server is UP or DOWN and see the current capacity.
* `!players` - Get a live list of everyone currently playing on the server.
* `!ip` - Get the IP Address of the server.
* `!leaderboard` - Show the leaderboard based on Playtime.
* `!activity off` / `!activity on` - Mute or unmute player join/leave notifications.
* `!help` - Show the command menu.

## Tech Stack
* **Hosting / Cron:** Any platform that can host Node.js API routes and trigger a 5-minute background Cron Job.
* **Green-API:** Handles the WhatsApp connection (sending messages and receiving webhooks).
* **Redis (e.g., Upstash):** A lightweight database that remembers if the server was "UP" or "DOWN" during the last check and stores player data.
* **mcstatus.io:** A fast API used to ping the Minecraft server.
* **Node.js:** The core logic.

## Prerequisites
Before deploying, you need accounts/details for the following:
1. **Green-API:** A free "Developer" account, your Instance ID, and API Token.
2. **Hosting Provider:** A platform to host your code (Render, Railway, VPS, etc.).
3. **Redis Database:** A free Upstash Redis database (or your own Redis instance).
4. **Minecraft Server:** Your public IP/Host and Port (e.g., from Playit.gg).
5. **WhatsApp Group/Chat:** The specific ID of your WhatsApp Group/Chat.

## Setup & Deployment

### 1. Environment Variables
In your chosen hosting environment, you will need to add the following Environment Variables:

| Variable | Description | Example |
| :--- | :--- | :--- |
| `MC_SERVER_IP` | Your public server address | `my-minecraft-server.domain` |
| `MC_SERVER_PORT` | Your server port | `23531` |
| `GREEN_API_ID` | From your Green-API console | `7107...` |
| `GREEN_API_TOKEN` | From your Green-API console | `abc123...` |
| `TARGET_GROUP_ID` | Your WhatsApp Group/Chat ID | `120363...123@g.us` |
| `UPSTASH_REDIS_REST_URL` | From your Upstash console | `https://...upstash.io` |
| `UPSTASH_REDIS_REST_TOKEN` | From your Upstash console | `AX...` |

### 2. Redis Configuration
Ensure you have a Redis database accessible via a REST API (such as Upstash). Add the connection URL and Token to your environment variables as `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.

### 3. Deploy and Set Up the Cron Job
1. Deploy the project to your hosting provider.
2. Set up a Cron Job to ping the `/api/cron` endpoint of your hosted app every 5 minutes.

### 4. Webhook Configuration (Green-API)
To enable the interactive commands, configure your Green-API instance to forward webhooks to `https://<your-hosted-domain>/api/webhook`. Ensure it is set to receive notifications for incoming messages (and optionally, outgoing messages if you want the bot to reply to your own commands).

## Testing
* Type `!help` or `!players` in your WhatsApp group/chat.
* Turn your server off, wait for the cron job to run (or manually visit `https://<your-hosted-domain>/api/cron`), and watch for the offline alert!