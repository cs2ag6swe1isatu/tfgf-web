// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge } from "electron";
import * as dgram from "dgram";
import type {
  LobbyMember,
  MultiplayerDiscoveredPayload,
  MultiplayerHostExitPayload,
  MultiplayerJoinRequest,
  MultiplayerLeaveRequest,
  MultiplayerLobbySnapshot,
  MultiplayerReadyUpdate,
} from "./types/multiplayer";

type MultiplayerPacket =
  | { type: "lobby-broadcast"; snapshot: MultiplayerLobbySnapshot }
  | { type: "discovery-request" }
  | { type: "join-request"; payload: MultiplayerJoinRequest }
  | { type: "ready-update"; payload: MultiplayerReadyUpdate }
  | { type: "leave-request"; payload: MultiplayerLeaveRequest }
  | { type: "heartbeat"; payload: { lobbyId: string; playerId: string } }
  | { type: "host-exit"; payload: MultiplayerHostExitPayload };

const BROADCAST_PORT = 41234;
const BROADCAST_ADDR = "255.255.255.255";

let socket: dgram.Socket | null = null;
let broadcastInterval: NodeJS.Timeout | null = null;
let pendingHostExitTimeout: NodeJS.Timeout | null = null;

const onHostFoundCbs = new Set<(payload: MultiplayerDiscoveredPayload) => void>();
const onDiscoveryResponseCbs = new Set<(payload: MultiplayerDiscoveredPayload) => void>();
const onPlayerJoinedCbs = new Set<(player: LobbyMember) => void>();
const onPlayerReadyChangedCbs = new Set<(playerId: string, ready: boolean) => void>();
const onPlayerLeftCbs = new Set<(playerId: string) => void>();
const onHostExitCbs = new Set<(payload: MultiplayerHostExitPayload) => void>();

let activeSnapshot: MultiplayerLobbySnapshot | null = null;
let activeMode: "host" | "client" | null = null;
const playerHeartbeats = new Map<string, number>();

function createSocket() {
  if (socket) return socket;

  socket = dgram.createSocket({ type: "udp4", reuseAddr: true });
  socket.on("error", () => {
    // ignore socket errors to keep the app usable in environments that block UDP
  });
  socket.on("message", (msg, rinfo) => {
    try {
      const s = msg.toString();
      console.log('[preload] socket message from', rinfo.address, 'len', s.length, 'payload', s.slice(0, 400));
    } catch (e) {
      console.warn('[preload] socket message parse error', e);
    }
    handlePacket(msg.toString(), rinfo.address);
  });

  socket.bind(BROADCAST_PORT, () => {
    try {
      socket?.setBroadcast(true);
    } catch {
      // ignore broadcast capability errors
    }
  });

  return socket;
}

function emitHostFound(snapshot: MultiplayerLobbySnapshot, hostAddress: string) {
  const payload: MultiplayerDiscoveredPayload = {
    ...snapshot,
    hostAddress,
    lastSeen: Date.now(),
  };
  onHostFoundCbs.forEach((cb) => cb(payload));
  onDiscoveryResponseCbs.forEach((cb) => cb(payload));
}

function emitHostExit(payload: MultiplayerHostExitPayload) {
  onHostExitCbs.forEach((cb) => cb(payload));
}

function broadcastSnapshot(snapshot: MultiplayerLobbySnapshot) {
  const s = createSocket();
  const packet: MultiplayerPacket = { type: "lobby-broadcast", snapshot };
  const payload = Buffer.from(JSON.stringify(packet));

  s.send(payload, 0, payload.length, BROADCAST_PORT, BROADCAST_ADDR, (err) => {
    void err;
  });
}

function pruneStalePlayers(staleMs = 10000) {
  if (!activeSnapshot) return;

  const now = Date.now();
  const stalePlayerIds = activeSnapshot.players
    .filter((p) => p.id !== activeSnapshot?.hostId)
    .filter((p) => {
      const lastSeen = playerHeartbeats.get(p.id);
      return lastSeen !== undefined && now - lastSeen > staleMs;
    })
    .map((p) => p.id);

  if (stalePlayerIds.length === 0) return;

  activeSnapshot = {
    ...activeSnapshot,
    players: activeSnapshot.players.filter((p) => !stalePlayerIds.includes(p.id)),
    playerCount: activeSnapshot.players.filter((p) => !stalePlayerIds.includes(p.id)).length,
  };

  stalePlayerIds.forEach((playerId) => onPlayerLeftCbs.forEach((cb) => cb(playerId)));
  broadcastSnapshot(activeSnapshot);
}

function sendHostExitMessage(lobbyId: string) {
  console.log('[preload] sending host-exit for lobby', lobbyId);
  const s = createSocket();
  const packet: MultiplayerPacket = { type: "host-exit", payload: { lobbyId } };
  const payload = Buffer.from(JSON.stringify(packet));
  s.send(payload, 0, payload.length, BROADCAST_PORT, BROADCAST_ADDR, (err) => {
    void err;
  });
}

function discoveryRequest() {
  const s = createSocket();
  const packet: MultiplayerPacket = { type: "discovery-request" };
  const data = Buffer.from(JSON.stringify(packet));
  s.send(data, 0, data.length, BROADCAST_PORT, BROADCAST_ADDR, (err) => {
    if (err) console.warn('[preload] send discovery-request error', err);
  });
}

function upsertLobbyMember(snapshot: MultiplayerLobbySnapshot, member: LobbyMember) {
  const existingIndex = snapshot.players.findIndex((p) => p.id === member.id);
  if (existingIndex >= 0) {
    const players = [...snapshot.players];
    players[existingIndex] = { ...players[existingIndex], ...member };
    return { ...snapshot, players, playerCount: players.length };
  }

  return {
    ...snapshot,
    players: [...snapshot.players, member],
    playerCount: snapshot.players.length + 1,
  };
}

function updateHostSnapshot(mutator: (current: MultiplayerLobbySnapshot) => MultiplayerLobbySnapshot) {
  if (!activeSnapshot) return;
  activeSnapshot = mutator(activeSnapshot);
  console.log('[preload] updated activeSnapshot, players=', activeSnapshot.players.map(p => p.id).join(','));
  broadcastSnapshot(activeSnapshot);
  emitHostFound(activeSnapshot, activeSnapshot.hostAddress ?? BROADCAST_ADDR);
}

function handlePacket(raw: string, senderAddress: string) {
  console.log('[preload] handlePacket raw from', senderAddress, '-', raw.slice(0, 300));
  let packet: MultiplayerPacket | null = null;
  try {
    packet = JSON.parse(raw) as MultiplayerPacket;
  } catch (err) {
    console.warn('[preload] JSON parse failed', err);
    return;
  }

  if (!packet) return;
  console.log('[preload] handlePacket parsed', packet.type, 'activeMode=', activeMode, 'activeSnapshot=', activeSnapshot?.lobbyId);

  // ------- shared discovery behavior (client+host) -------
  if (packet.type === "lobby-broadcast") {
    activeMode = activeMode ?? "client";
    emitHostFound(packet.snapshot, senderAddress);
    return;
  }

  if (packet.type === "discovery-request") {
    if (activeMode === "host" && activeSnapshot) {
      if (activeSnapshot.isPrivate) {
        console.log('[preload] ignoring discovery request for private lobby', activeSnapshot.lobbyId);
        return;
      }
      console.log('[preload] responding to discovery request with lobby', activeSnapshot.lobbyId);
      broadcastSnapshot(activeSnapshot);
    }
    return;
  }

  if (packet.type === "host-exit") {
    console.log('[preload] host-exit received for lobby', packet.payload.lobbyId);
    emitHostExit(packet.payload);

    // Only clear local host state if it is the same lobby that just exited.
    if (activeMode === "host" && activeSnapshot?.lobbyId === packet.payload.lobbyId) {
      console.log('[preload] clearing host state for lobby', packet.payload.lobbyId);
      activeSnapshot = null;
      activeMode = null;
    }
    return;
  }

  // ------- host-only handler block -------
  if (activeMode !== "host" || !activeSnapshot) return;

  if (packet.type === "heartbeat") {
    if (!activeSnapshot || packet.payload.lobbyId !== activeSnapshot.lobbyId) return;
    playerHeartbeats.set(packet.payload.playerId, Date.now());
    return;
  }

  if (packet.type === "join-request") {
    if (!activeSnapshot || packet.payload.lobbyId !== activeSnapshot.lobbyId) return;
    console.log('[preload] join-request for lobby', packet.payload.lobbyId, 'from', senderAddress, 'player', packet.payload.player.id);

    playerHeartbeats.set(packet.payload.player.id, Date.now());

    updateHostSnapshot((current) =>
      upsertLobbyMember(current, {
        ...packet.payload.player,
        isHost: false,
        isReady: false,
      }),
    );

    onPlayerJoinedCbs.forEach((cb) =>
      cb({
        ...packet.payload.player,
        isHost: false,
        isReady: false,
      }),
    );
    return;
  }

  if (packet.type === "ready-update") {
    if (!activeSnapshot || packet.payload.lobbyId !== activeSnapshot.lobbyId) return;
    console.log('[preload] ready-update for', packet.payload.playerId, 'ready=', packet.payload.ready);

    playerHeartbeats.set(packet.payload.playerId, Date.now());

    updateHostSnapshot((current) => ({
      ...current,
      players: current.players.map((player) =>
        player.id === packet.payload.playerId ? { ...player, isReady: packet.payload.ready } : player,
      ),
      playerCount: current.players.length,
    }));

    onPlayerReadyChangedCbs.forEach((cb) => cb(packet.payload.playerId, packet.payload.ready));
    return;
  }

  if (packet.type === "leave-request") {
    if (packet.payload.lobbyId !== activeSnapshot.lobbyId) return;
    console.log('[preload] leave-request for player', packet.payload.playerId);

    playerHeartbeats.delete(packet.payload.playerId);

    activeSnapshot = {
      ...activeSnapshot,
      players: activeSnapshot.players.filter((p) => p.id !== packet.payload.playerId),
      playerCount: activeSnapshot.players.filter((p) => p.id !== packet.payload.playerId).length,
    };
    broadcastSnapshot(activeSnapshot);
    onPlayerLeftCbs.forEach((cb) => cb(packet.payload.playerId));
  }
}

function startDiscovery() {
  console.log('[preload] startDiscovery');
  activeMode = "client";
  createSocket();
}

function stopDiscovery() {
  console.log('[preload] stopDiscovery');
  if (activeMode === "client") {
    activeMode = null;
  }
}

function startBroadcast(snapshot: MultiplayerLobbySnapshot) {
  console.log('[preload] startBroadcast lobby', snapshot.lobbyId);
  if (pendingHostExitTimeout) {
    clearTimeout(pendingHostExitTimeout);
    pendingHostExitTimeout = null;
  }

  activeMode = "host";
  createSocket();
  activeSnapshot = snapshot;
  broadcastSnapshot(snapshot);

  if (broadcastInterval) clearInterval(broadcastInterval);
  broadcastInterval = setInterval(() => {
    if (!activeSnapshot) return;
    pruneStalePlayers(9000);
    broadcastSnapshot(activeSnapshot);
  }, 2000);
}

function stopBroadcast() {
  console.log('[preload] stopBroadcast');

  if (activeMode === 'host' && activeSnapshot) {
    const lobbyId = activeSnapshot.lobbyId;
    if (pendingHostExitTimeout) {
      clearTimeout(pendingHostExitTimeout);
    }
    pendingHostExitTimeout = setTimeout(() => {
      sendHostExitMessage(lobbyId);
      pendingHostExitTimeout = null;
    }, 250);
  }

  if (broadcastInterval) {
    clearInterval(broadcastInterval);
    broadcastInterval = null;
  }

  playerHeartbeats.clear();
  if (activeMode === "host") {
    activeMode = null;
  }
  activeSnapshot = null;
}

function updateLobbySnapshot(snapshot: MultiplayerLobbySnapshot) {
  console.log('[preload] updateLobbySnapshot lobby', snapshot.lobbyId);
  activeSnapshot = snapshot;
  broadcastSnapshot(snapshot);
}

function requestJoin(payload: MultiplayerJoinRequest) {
  console.log('[preload] sending join-request to', payload.hostAddress, 'lobby', payload.lobbyId, 'player', payload.player?.id, 'via broadcast');
  const s = createSocket();
  const packet: MultiplayerPacket = { type: "join-request", payload };
  const data = Buffer.from(JSON.stringify(packet));
  s.send(data, 0, data.length, BROADCAST_PORT, BROADCAST_ADDR, (err) => {
    if (err) console.warn('[preload] send join-request error', err);
  });
}

function setReady(payload: MultiplayerReadyUpdate) {
  console.log('[preload] sending ready-update to', payload.hostAddress, 'player', payload.playerId, 'ready', payload.ready, 'via broadcast');
  const s = createSocket();
  const packet: MultiplayerPacket = { type: "ready-update", payload };
  const data = Buffer.from(JSON.stringify(packet));
  s.send(data, 0, data.length, BROADCAST_PORT, BROADCAST_ADDR, (err) => {
    if (err) console.warn('[preload] send ready-update error', err);
  });
}

function sendHeartbeat(payload: { lobbyId: string; hostAddress: string; playerId: string }) {
  console.log('[preload] sending heartbeat', payload.playerId, 'lobby', payload.lobbyId);
  const s = createSocket();
  const packet: MultiplayerPacket = { type: "heartbeat", payload: { lobbyId: payload.lobbyId, playerId: payload.playerId } };
  const data = Buffer.from(JSON.stringify(packet));
  s.send(data, 0, data.length, BROADCAST_PORT, BROADCAST_ADDR, (err) => {
    if (err) console.warn('[preload] send heartbeat error', err);
  });
}

function leaveLobby(payload: MultiplayerLeaveRequest) {
  console.log('[preload] sending leave-request to', payload.hostAddress, 'player', payload.playerId);
  const s = createSocket();
  const packet: MultiplayerPacket = { type: "leave-request", payload };
  const data = Buffer.from(JSON.stringify(packet));
  s.send(data, 0, data.length, BROADCAST_PORT, BROADCAST_ADDR, (err) => {
    if (err) console.warn('[preload] send leave-request error', err);
  });
}

contextBridge.exposeInMainWorld("multiplayer", {
  startBroadcast,
  stopBroadcast,
  startDiscovery,
  stopDiscovery,
  onDiscoveryResponse: (cb: (payload: MultiplayerDiscoveredPayload) => void) => {
    onDiscoveryResponseCbs.add(cb);
  },
  offDiscoveryResponse: (cb: (payload: MultiplayerDiscoveredPayload) => void) => {
    onDiscoveryResponseCbs.delete(cb);
  },
  onHostFound: (cb: (payload: MultiplayerDiscoveredPayload) => void) => {
    onHostFoundCbs.add(cb);
  },
  offHostFound: (cb: (payload: MultiplayerDiscoveredPayload) => void) => {
    onHostFoundCbs.delete(cb);
  },
  onPlayerJoined: (cb: (player: LobbyMember) => void) => {
    onPlayerJoinedCbs.add(cb);
  },
  offPlayerJoined: (cb: (player: LobbyMember) => void) => {
    onPlayerJoinedCbs.delete(cb);
  },
  onPlayerReadyChanged: (cb: (playerId: string, ready: boolean) => void) => {
    onPlayerReadyChangedCbs.add(cb);
  },
  offPlayerReadyChanged: (cb: (playerId: string, ready: boolean) => void) => {
    onPlayerReadyChangedCbs.delete(cb);
  },
  onPlayerLeft: (cb: (playerId: string) => void) => {
    onPlayerLeftCbs.add(cb);
  },
  offPlayerLeft: (cb: (playerId: string) => void) => {
    onPlayerLeftCbs.delete(cb);
  },
  onHostExit: (cb: (payload: MultiplayerHostExitPayload) => void) => {
    onHostExitCbs.add(cb);
  },
  offHostExit: (cb: (payload: MultiplayerHostExitPayload) => void) => {
    onHostExitCbs.delete(cb);
  },
  requestJoin,
  setReady,
  discoveryRequest,
  sendHeartbeat,
  leaveLobby,
  updateLobbySnapshot,
});
