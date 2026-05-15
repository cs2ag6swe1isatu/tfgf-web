# Internet Play Implementation Summary

## What Was Added

### 1. WebSocket Relay Server
**File:** `server/relay.js`

A minimal Node.js server that acts as a message relay between game instances. It:
- Listens for WebSocket connections
- Routes packets to clients in the same lobby (by lobbyId)
- Maintains room state
- Automatically cleans up empty rooms

**Deploy to:** Render.com (free tier)

---

### 2. WebSocket Bridge (`src/multiplayer-websocket.ts`)

A new transport bridge that implements the same `MultiplayerBridge` interface as the UDP version. It:
- Connects to a relay server via WebSocket
- Translates all multiplayer packets to JSON
- Maintains event callbacks for game state updates
- Includes cleanup methods for safe shutdown

**Key differences from UDP:**
- No NAT traversal needed (relay handles routing)
- No broadcast discovery (polls relay periodically)
- Lower latency than broadcast (direct connection)
- Supports cross-network play (internet)

---

### 3. Bridge Manager (`src/utils/multiplayerBridgeManager.ts`)

Controls switching between UDP and WebSocket transports:
- `setMultiplayerMode(mode, relayUrl)` - Switch active bridge
- `getCurrentBridge()` - Get the current transport
- `getCurrentMode()` - Get the active mode ('lan' | 'internet')
- `initBridgeManager()` - Initialize on app startup

**Usage:**
```typescript
import { setMultiplayerMode, getCurrentBridge } from '../utils/multiplayerBridgeManager';

// Switch to internet mode
await setMultiplayerMode('internet', 'wss://relay.example.com');

// Use the bridge
const bridge = getCurrentBridge();
bridge.startDiscovery();
```

---

### 4. Game Store Updates (`src/store/gameStore.ts`)

Added to `GameConfig`:
```typescript
multiplayerMode: 'lan' | 'internet' | null;
relayUrl: string | null;
```

New action:
```typescript
setMultiplayerMode(mode: 'lan' | 'internet' | null, relayUrl?: string | null): void
```

---

### 5. UI Mode Selector (`src/pages/MultiplayerMenuPage.tsx`)

Added to the multiplayer menu:
- **Mode toggle buttons:** LAN | INTERNET
- **Relay URL input:** When internet mode is selected
- **Visual feedback:** Highlighted border shows active mode

**Flow:**
1. User clicks "INTERNET" button
2. Relay URL input appears
3. User pastes the relay server URL (wss://...)
4. User clicks "OK"
5. Bridge manager switches transport
6. Game proceeds with internet discovery/lobbies

---

### 6. Deployment Guide (`INTERNET_PLAY.md`)

Complete walkthrough for:
- Deploying relay server to Render.com (5 minutes)
- Configuring the game to use relay
- Testing internet play
- Troubleshooting common issues
- Cost information (free tier available)

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ Game Instance (Renderer Process)                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ MultiplayerMenuPage                                      │  │
│  │  └─ Shows mode selector (LAN | INTERNET)                 │  │
│  │  └─ Input relay URL if internet mode                     │  │
│  │  └─ Calls setMultiplayerMode(mode, url)                 │  │
│  └──────────────────────────────────────────────────────────┘  │
│                           │                                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Bridge Manager                                           │  │
│  │  └─ setMultiplayerMode()                                │  │
│  │  ┌─────────────────┬──────────────────┐                 │  │
│  │  │ LAN Mode        │ Internet Mode    │                 │  │
│  │  │ (Default)       │ (Optional)       │                 │  │
│  │  │                 │                  │                 │  │
│  │  │ UDP Bridge      │ WebSocket Bridge │                 │  │
│  │  │ (preload.ts)    │ (multiplayer-    │                 │  │
│  │  │                 │  websocket.ts)   │                 │  │
│  │  │ • Broadcast UDP │ • ws/wss         │                 │  │
│  │  │ • mDNS discovery│ • Relay routing  │                 │  │
│  │  │ • Local only    │ • Internet play  │                 │  │
│  │  └─────────────────┴──────────────────┘                 │  │
│  └──────────────────────────────────────────────────────────┘  │
│                           │                                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Game Multiplayer Logic                                   │  │
│  │  └─ Lobby management                                     │  │
│  │  └─ Player sync                                          │  │
│  │  └─ Game state sync                                      │  │
│  │  (Uses getCurrentBridge())                               │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                           │
                  (UDP broadcast OR WebSocket)
                           │
                ┌──────────────────────────┐
                │ LAN (same subnet)        │  UDP packets via broadcast
                │ Players on same network  │
                └──────────────────────────┘
                           OR
                ┌──────────────────────────┐
                │ Relay Server             │  WebSocket packets
                │ (Render.com)             │
                │ • Lobby routing          │  ┌────────────────────┐
                │ • Message relay          ├─→│ Game Instance 2    │
                │ • Connection mgmt        │  │ (Remote player)    │
                │ (server/relay.js)        │  └────────────────────┘
                └──────────────────────────┘
```

---

## Packet Flow (Internet Mode)

### Discovery Phase
```
Player A (Host)                 Relay Server              Player B (Client)
    │                               │                          │
    ├─ startBroadcast()            │                          │
    │   (lobbies itself)            │                          │
    ├─ lobby-broadcast packet ─────→ (broadcasts to all) ─────→ onHostFound()
    │                               │                          │
    │                               │                     startDiscovery()
    │                               │                          │
    │                               │ ←─ discovery-request ────┤
    │ (every 3 seconds) ────────────→ (response) ─────────────→
```

### Join Phase
```
    ├─ join-request ────────────────→ (broadcasts) ───────────→ onPlayerJoined()
    │                               │                          │
    └─ waits for ack                │                          │
```

### Game Phase
```
    ├─ game-state ──────────────────→ (broadcasts) ───────────→ onGameStateSync()
    │                               │                          │
    └─ answer-submission ────┐      │                          │
                             ├─────→ (broadcasts) ───────────→ Host receives answers
```

---

## Configuration Files Changed

1. **`src/store/gameStore.ts`**
   - Added `multiplayerMode` and `relayUrl` to GameConfig
   - Added `setMultiplayerMode()` action

2. **`src/config/gameConfig.ts`**
   - Added default values for new config fields

3. **`src/pages/MultiplayerMenuPage.tsx`**
   - Added mode selector UI
   - Added relay URL input
   - Added mode switching handlers

---

## Testing Checklist

- [ ] Deploy relay server to Render.com
- [ ] Test LAN mode still works (UDP broadcast)
- [ ] Test internet mode with relay
  - [ ] Host can create a lobby
  - [ ] Remote client can discover lobby
  - [ ] Client can join lobby
  - [ ] Both can start a game
  - [ ] Answer submissions sync
  - [ ] Results display correctly
- [ ] Test mode switching (LAN ↔ Internet)
- [ ] Test reconnection after connection loss
- [ ] Test with firewall/NAT (should work via relay)

---

## Future Enhancements

1. **TCP Fallback** - Support restrictive firewalls
2. **Encryption** - TLS/WSS with certificates
3. **Persistence** - Rejoin after disconnect
4. **Logging** - Activity tracking & analytics
5. **Rate Limiting** - Prevent abuse
6. **WebRTC** - Peer-to-peer with relay signaling
7. **Auto-Failover** - Switch relay servers on failure
8. **Latency Monitoring** - Display ping time

---

## Deployment Steps Summary

1. **Clone repo** → Update with relay server files
2. **Sign up to Render.com**
3. **Create Web Service** → Connect GitHub
4. **Set startup command** → `node server/relay.js`
5. **Copy URL** → Paste in game (INTERNET mode)
6. **Test** → Play with remote friend

Total time: ~10 minutes

**Cost:** Free tier unlimited (no credit card needed)

---

## Important Notes

- UDP bridge (LAN mode) remains unchanged and always works
- Internet mode is **optional** - users choose when they want it
- No server authentication/authorization yet (add later if needed)
- Relay server broadcasts all packets to all clients in a lobby (design choice)
- For security in production, add IP allowlisting or authentication tokens

