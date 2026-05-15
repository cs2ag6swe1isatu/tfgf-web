# Internet Play Quick Start

## In 10 Minutes

### Step 1: Deploy Relay Server (3 min)

Go to [render.com](https://render.com) and click **"New +"** → **"Web Service"**

Fill in:
```
Name: tfgf-relay
Repository: [your-repo-url]
Branch: main
Build: npm install
Start Command: node server/relay.js
Plan: Free
```

Click **"Create"** and wait for the green "Live" status.

Copy the URL (example: `https://tfgf-relay-abc123.onrender.com`)

---

### Step 2: Configure Game

1. Launch TFGF
2. Go **Multiplayer** menu
3. Click **"INTERNET"** button
4. Paste your relay URL and change `https://` to `wss://`:
   ```
   wss://tfgf-relay-abc123.onrender.com
   ```
5. Click **"OK"**

---

### Step 3: Play

**Player 1 (Host):**
- Click **"HOST GAME"**
- Configure lobby (category, difficulty)
- Wait for players to join

**Player 2+ (Clients):**
- Click **"JOIN GAME"**
- You should see Player 1's lobby appear
- Click to join

**Start Game:**
- Everyone clicks **"READY"**
- Host starts game
- Play normally!

---

## What Changed?

- ✅ New relay server in `server/relay.js`
- ✅ Internet bridge in `src/multiplayer-websocket.ts`
- ✅ Mode selector in multiplayer menu (LAN | INTERNET)
- ✅ Stores your relay URL in settings
- ✅ Deployment guide: see `INTERNET_PLAY.md`

---

## LAN Still Works

Don't worry! The **LAN mode** (UDP broadcast) still works exactly as before. Internet mode is **optional**.

Just toggle back to **"LAN"** to play on your local network.

---

## It's Free

- Render.com free tier: $0/month
- No credit card needed
- Can host 10+ players casually
- Auto-sleeps after 15 min idle (wakes in 30 sec on next request)

---

## Troubleshooting

**"Connection refused"**
- Check relay URL starts with `wss://` (not `https://`)
- Wait 30 seconds after deploying on Render
- Verify green "Live" status on Render dashboard

**"Relay server is slow"**
- First connection takes 30 sec (free tier wake-up)
- Subsequent connections are fast
- Keep it awake by playing continuously

**"Players not discovering each other"**
- Relay URL must match exactly (case-sensitive)
- Both players must use same relay URL
- Check firewall isn't blocking WebSocket port

---

## Next Steps

- Play with friends across the internet! 🎮
- Report bugs or issues
- Want a custom relay server? See `INTERNET_IMPLEMENTATION.md`

