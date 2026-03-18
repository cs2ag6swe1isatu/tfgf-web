## 🌐 The "Web-But-Local" Architecture
In a standard web app, you'd use a cloud server. Here, one player's computer must act as the **Local Server**.

- [ ] **Node.js Backend:** You’ll need a local server (likely Node.js) to handle the Host logic and serve the frontend files to other players on the LAN.
- [ ] **Socket.io / WebSockets:** Essential for the "Real-time" requirement (NFR-P2). This replaces Godot’s RPC system to keep everyone synced under 1s.
- [ ] **mDNS / ZeroConf:** Since browsers can't easily "scan" a LAN for security reasons, you may need a small desktop wrapper (like **Electron**) to handle the Auto-Discovery (NFR-O2).
- [ ] **Local IP Hosting:** Players will join by navigating to the host's local IP (e.g., `192.168.1.5:3000`) unless you implement a custom discovery tool.

---

## 🛠️ Updated Technical Checklist

### 1. Networking & Sync
- [ ] **WebSocket Server:** Handle the "Question Push" so all clients receive data at the same millisecond.
- [ ] **Server-Side Timer:** The countdown must live on the Node.js server. If a client’s browser lags, the server's clock is the "source of truth" to meet the **±0.5s** accuracy.
- [ ] **Latency Compensation:** Use `Date.now()` timestamps in your socket messages to calculate offset between the host and clients.

### 2. Data Persistence (JSON)
- [ ] **FileSystem (fs) Module:** Since browsers have limited storage (LocalStorage is easily cleared), use the Node.js backend to write true `.json` files to the host's hard drive.
- [ ] **State Management:** Ensure XP and Achievements (FR-12, FR-13) are saved immediately after a game concludes to prevent data loss on page refresh.

### 3. Frontend & UI
- [ ] **Responsive Design:** Use Flexbox/Grid to satisfy **NFR-C4** (Auto-adjusting interface for different screen sizes).
- [ ] **Asset Preloading:** Since it's a "Fast" trivia game, preload images/sounds so there's no "loading" delay when a question pops up.

---

## ⚠️ The "Gotchas" (Constraints to Watch)
* **Browser Security:** Browsers often block "Insecure" (HTTP) requests to other devices. You'll need to ensure the LAN environment doesn't trigger "Mixed Content" or CORS errors.
* **The "Host" Requirement:** In the web version, the "Host" isn't just a player; they are running the web server. If they close their browser tab or kill the Node process, the whole game dies for everyone.
* **Electron Recommendation:** To meet the **SRS requirement for a "System"** that runs on laptops/desktops (NFR-C1), consider wrapping your HTML/JS in **Electron**. It gives you access to the file system and network hardware that a standard Chrome tab won't have.

---

### 📋 Revised "Web Migration" Checklist
- [ ] **Environment:** Set up a Node.js + Express + Socket.io boilerplate.
- [ ] **Discovery:** Research `bonjour` or `multicast-dns` packages for Node.js to handle the "Auto-Discovery."
- [ ] **Storage:** Create a `data/` folder with `players.json` and `questions.json`.
- [ ] **Offline Check:** Ensure all JS libraries (Bootstrap, Tailwind, Socket.io) are **local files**, not CDN links, so it works without internet (NFR-O1).
