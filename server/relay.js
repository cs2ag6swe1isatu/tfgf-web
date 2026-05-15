/**
 * TFGF WebSocket Relay Server
 * 
 * Simple relay server for internet multiplayer play.
 * Deploy to Render.com free tier: https://render.com
 * 
 * Steps:
 * 1. Create new Web Service on render.com
 * 2. Connect to this repo
 * 3. Set Build Command: `npm install`
 * 4. Set Start Command: `npm start`
 * 5. Copy the Render URL and paste in app settings
 */

const WebSocket = require('ws');
const http = require('http');

const PORT = process.env.PORT || 10000;
const server = http.createServer();
const wss = new WebSocket.Server({ server });

// Store rooms (lobbies) and their clients
const rooms = new Map(); // lobbyId => Set<ws>

console.log(`[Relay] Starting WebSocket server on port ${PORT}`);

wss.on('connection', (ws) => {
  let clientLobbyId = null;

  console.log('[Relay] Client connected');

  ws.on('message', (data) => {
    try {
      const packet = JSON.parse(data);
      const { type, lobbyId, payload } = packet;

      if (!lobbyId) {
        console.warn('[Relay] Received packet without lobbyId:', type);
        return;
      }

      // Track which lobby this client belongs to
      if (!clientLobbyId && lobbyId) {
        if (!rooms.has(lobbyId)) {
          rooms.set(lobbyId, new Set());
        }
        rooms.get(lobbyId).add(ws);
        clientLobbyId = lobbyId;
        console.log(`[Relay] Client joined lobby ${lobbyId} (${rooms.get(lobbyId).size} total)`);
      }

      // Broadcast to all clients in the lobby
      const room = rooms.get(lobbyId);
      if (room) {
        const broadcast = JSON.stringify({ type, payload, sentAt: Date.now() });
        let sent = 0;
        room.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(broadcast);
            sent++;
          }
        });
        console.log(`[Relay] ${type} -> ${sent}/${room.size} clients in ${lobbyId}`);
      }
    } catch (err) {
      console.error('[Relay] Error processing message:', err);
    }
  });

  ws.on('close', () => {
    if (clientLobbyId && rooms.has(clientLobbyId)) {
      rooms.get(clientLobbyId).delete(ws);
      const room = rooms.get(clientLobbyId);
      console.log(`[Relay] Client left lobby ${clientLobbyId} (${room.size} remaining)`);

      // Clean up empty rooms
      if (room.size === 0) {
        rooms.delete(clientLobbyId);
      }
    }
  });

  ws.on('error', (err) => {
    console.error('[Relay] WebSocket error:', err.message);
  });
});

server.listen(PORT, () => {
  console.log(`[Relay] WebSocket server listening on port ${PORT}`);
  console.log(`[Relay] URL: ws://0.0.0.0:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Relay] SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('[Relay] HTTP server closed');
    process.exit(0);
  });
});
