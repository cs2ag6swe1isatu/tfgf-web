# Internet Play Setup Guide

This guide walks you through setting up internet multiplayer play for TFGF using a free Render.com relay server.

## Quick Setup (5 minutes)

### 1. Deploy the Relay Server to Render.com

1. Go to [https://render.com](https://render.com)
2. Sign up or log in
3. Click **"New +"** → **"Web Service"**
4. Connect your GitHub repository (fork this repo if needed)
5. Fill in the form:
   - **Name:** `tfgf-relay`
   - **Region:** Pick one closest to your players
   - **Branch:** `main`
   - **Build Command:** `npm install`
   - **Start Command:** `node server/relay.js`
   - **Free Tier:** Select (free tier is fine for small groups)
6. Click **"Create Web Service"**
7. Wait 2-3 minutes for deployment
8. Copy the URL (it'll look like `https://tfgf-relay-xxxx.onrender.com`)

### 2. Configure in TFGF

1. Launch the game
2. Go to **Multiplayer → Mode: Internet**
3. Paste the relay URL: `wss://tfgf-relay-xxxx.onrender.com`
   - Note: Change `https://` → `wss://` (WebSocket Secure)
4. Click **"OK"**

### 3. Test It

- **Player 1:** Click **"Host Game"** on the Multiplayer menu
- **Player 2:** Click **"Join Game"**, you should see Player 1's lobby
- Play a game!

---

## What's Happening

```
Game Instance 1                 Relay Server (Render.com)        Game Instance 2
(Host)                          ↓                                 (Client)
  │                       [WebSocket Hub]                           │
  ├─ Discovery packets  ──→    Broadcasts to all    ───→ Receives discovery
  ├─ Join request       ──→    (per lobbyId room)   ───→ Joins lobby
  ├─ Game state updates ──→    Relays messages      ───→ Receives updates
  └─ Answer submissions ──→    (JSON packets)       ───→ Receives answers
```

---

## Troubleshooting

### "Connection refused"
- Check the relay URL is correct (should start with `wss://`)
- Wait 30 seconds after deployment on Render.com
- Check Render dashboard for errors

### "Connection timeout"
- Your firewall may block WebSocket
- Try a different network or VPN
- Or deploy to a different region on Render.com

### "Relay server is slow"
- Free tier on Render.com spins down after 15 mins of inactivity
- First request takes 30 seconds to wake up
- For better performance, upgrade to paid tier

---

## Costs

**Free Tier:**
- 0.5GB RAM
- Spins down after 15 mins idle
- Perfect for casual play with friends
- **Cost: $0/month**

**Paid Tier (if needed):**
- $7/month for always-on server
- 512MB RAM
- Recommended for large groups (20+ players)

---

## Advanced: Custom Relay Server

Want to run your own? The relay server is simple Node.js:

```bash
npm install ws http
node server/relay.js
```

Then deploy to any Node.js hosting:
- **Render.com** (recommended)
- **Railway.app**
- **Heroku** (paid)
- **DigitalOcean** ($5/month)
- Your own VPS

---

## Future Improvements

- [ ] Support for TCP fallback (for restrictive firewalls)
- [ ] Lobby persistence (rejoin after disconnect)
- [ ] Encrypted connections (TLS)
- [ ] Player activity logging
- [ ] Rate limiting to prevent abuse

---

## Help?

If you hit issues:
1. Check the relay server logs on Render.com dashboard
2. Verify both players can reach the URL
3. Try pinging from browser console: `new WebSocket('wss://...')`
