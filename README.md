# tfgf-web

G ba guys reactJS + TypeScript ta if web

[todo]


# Vite-Only Multiplayer Testing Guide

## Quick Start

Instead of running heavy Electron with `npm start`, you can now test multiplayer features using just Vite:

```bash
npm run dev
```

Then open **multiple browser tabs/windows** at `http://localhost:5173` (or the displayed URL).

## How It Works

- **Browser 1 (Host)**: Create a lobby → becomes host
- **Browser 2 (Client)**: Join lobby → becomes client
- **Browser 3+ (More Clients)**: Join the same lobby

The mock bridge uses the **BroadcastChannel API** to simulate UDP broadcasts between browser tabs on the same machine.

## Features Supported

✅ Lobby discovery
✅ Join lobby
✅ Player listing
✅ Ready state sync
✅ All current multiplayer features

## Limitations

- Only works on **same machine** (tabs/windows share BroadcastChannel)
- No actual network communication (browser sandbox)
- Browser js throttling may affect timing (not a real UDP environment)
- Perfect for rapid development and UI testing

## Testing Workflow

1. **Terminal 1**: Run `npm run dev`
2. **Browser Tab 1**: Go to `http://localhost:5173` → Multiplayer → Create Lobby
3. **Browser Tab 2**: Go to `http://localhost:5173` → Multiplayer → Join Lobby (you'll see the lobby from Tab 1)
4. **Test**: Click ready, check player lists, etc.

## Switching to Electron

When you need to test real UDP networking or build:

```bash
npm start         # Full Electron with real UDP
npm run package   # Build for production
```

## Console Logs

Mock bridge logs start with `[mock]`:
- `[mock] MultiplayerBridge initialized`
- `[mock] startBroadcast lobby LOBBY-XXXX`
- `[mock] join-request for lobby...`
- `[mock] ready-update...`

Real preload logs start with `[preload]` (only in Electron).

## Troubleshooting

**Q: Tabs don't see each other?**
A: Make sure both tabs are on the **exact same origin** (same protocol, host, port).

**Q: Changes not reflecting?**
A: Hard refresh tabs: `Ctrl+Shift+R` (or `Cmd+Shift+R` on Mac)

**Q: Want to test across different machines?**
A: Use `npm start` with Electron for real UDP networking.

---

**Tip**: Keep Vite dev server running and just refresh browser tabs for instant feedback — much faster than restarting Electron!

todo-next:
- gameplay packets and sync
