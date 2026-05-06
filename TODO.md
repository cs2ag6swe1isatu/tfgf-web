# TODO

# Implementation
- [x] **Node.js Backend:** You’ll need a local server (likely Node.js) to handle the Host logic and serve the frontend files to other players on the LAN.
- [ ] **Socket.io / WebSockets:** Essential for the "Real-time" requirement (NFR-P2). This replaces Godot’s RPC system to keep everyone synced under 1s.
- [ ] **mDNS / ZeroConf:** Since browsers can't easily "scan" a LAN for security reasons, you may need a small desktop wrapper (like **Electron**) to handle the Auto-Discovery (NFR-O2).
- [ ] **Local IP Hosting:** Players will join by navigating to the host's local IP (e.g., `192.168.1.5:3000`) unless you implement a custom discovery tool.

### 1. Networking & Sync
- [ ] **WebSocket Server:** Handle the "Question Push" so all clients receive data at the same millisecond.
- [ ] **Server-Side Timer:** The countdown must live on the Node.js server. If a client’s browser lags, the server's clock is the "source of truth" to meet the **±0.5s** accuracy.
- [ ] **Latency Compensation:** Use `Date.now()` timestamps in your socket messages to calculate offset between the host and clients.

### 2. Data Persistence (JSON)
- [ ] **FileSystem (fs) Module:** Since browsers have limited storage (LocalStorage is easily cleared), use the Node.js backend to write true `.json` files to the host's hard drive.
- [x] **State Management:** Ensure XP and Achievements (FR-12, FR-13) are saved immediately after a game concludes to prevent data loss on page refresh.

### 3. Frontend & UI
- [x] **Responsive Design:** Use Flexbox/Grid to satisfy **NFR-C4** (Auto-adjusting interface for different screen sizes).
- [ ] **Asset Preloading:** Since it's a "Fast" trivia game, preload images/sounds so there's no "loading" delay when a question pops up.

# Features
## Progression System
- [x] Progression Rule Manager
- [ ] values: xp, level, ranks, performance stats, achievements
- [x] Achievement Rule Manager

## Navigation System
- [x] Page/Menu Navigation
- [x] pages: "home","mode-select","category","difficulty","question","result","profile","settings","standing","multiplayer-menu","multiplayer-lobby","multiplayer-discovery"