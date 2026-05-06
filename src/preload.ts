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
  MultiplayerGameState,
} from "./types/multiplayer";

type MultiplayerPacket =
  | { type: "lobby-broadcast"; snapshot: MultiplayerLobbySnapshot; isGameActive?: boolean }
  | { type: "discovery-request" }
  | { type: "join-request"; payload: MultiplayerJoinRequest }
  | { type: "ready-update"; payload: MultiplayerReadyUpdate }
  | { type: "leave-request"; payload: MultiplayerLeaveRequest }
  | { type: "heartbeat"; payload: { lobbyId: string; hostAddress: string; playerId: string } }
  | { type: "host-exit"; payload: MultiplayerHostExitPayload }
  | { type: "game-state"; payload: MultiplayerGameState }
  | { type: "answer-submission"; payload: { lobbyId: string; hostAddress: string; playerId: string; questionIndex: number; answer: string } };

const BROADCAST_PORT = 41234;
const BROADCAST_ADDR = "255.255.255.255";
const HOST_SILENCE_TIMEOUT_MS = 6000;
const HOST_WATCHDOG_INTERVAL_MS = 1000;

let socket: dgram.Socket | null = null;
let broadcastInterval: NodeJS.Timeout | null = null;
let pendingHostExitTimeout: NodeJS.Timeout | null = null;

const onHostFoundCbs = new Map<string, (payload: MultiplayerDiscoveredPayload) => void>();
const onDiscoveryResponseCbs = new Map<string, (payload: MultiplayerDiscoveredPayload) => void>();
const onPlayerJoinedCbs = new Map<string, (player: LobbyMember) => void>();
const onPlayerReadyChangedCbs = new Map<string, (playerId: string, ready: boolean) => void>();
const onPlayerLeftCbs = new Map<string, (playerId: string) => void>();
const onHostExitCbs = new Map<string, (payload: MultiplayerHostExitPayload) => void>();
const onGameStateSyncCbs = new Map<string, (payload: MultiplayerGameState) => void>();
const onAnswerSubmissionCbs = new Map<string, (payload: { lobbyId: string; hostAddress: string; playerId: string; questionIndex: number; answer: string }) => void>();

let activeSnapshot: MultiplayerLobbySnapshot | null = null;
let activeMode: "host" | "client" | null = null;
let isGameActive = false;
const playerHeartbeats = new Map<string, number>();
let activeClientLobbyId: string | null = null;
let lastHostSignalAt = 0;
let hasEmittedHostTimeout = false;
let hostWatchdogInterval: NodeJS.Timeout | null = null;

function startClientHostWatchdog() {
  if (hostWatchdogInterval) return;

  hostWatchdogInterval = setInterval(() => {
    if (activeMode !== "client") return;
    if (!activeClientLobbyId) return;
    if (!lastHostSignalAt) return;

    if (Date.now() - lastHostSignalAt <= HOST_SILENCE_TIMEOUT_MS) return;
    if (hasEmittedHostTimeout) return;

    hasEmittedHostTimeout = true;
    console.warn('[preload] host silence timeout for lobby', activeClientLobbyId);
    emitHostExit({ lobbyId: activeClientLobbyId });
  }, HOST_WATCHDOG_INTERVAL_MS);
}

function stopClientHostWatchdog(options?: { resetLobby?: boolean }) {
  if (hostWatchdogInterval) {
    clearInterval(hostWatchdogInterval);
    hostWatchdogInterval = null;
  }

  hasEmittedHostTimeout = false;
  lastHostSignalAt = 0;

  if (options?.resetLobby) {
    activeClientLobbyId = null;
  }
}

function markHostSignal(lobbyId?: string) {
  if (!activeClientLobbyId) return;
  if (lobbyId && lobbyId !== activeClientLobbyId) return;

  lastHostSignalAt = Date.now();
  hasEmittedHostTimeout = false;
}

function trackClientLobby(lobbyId: string) {
  activeClientLobbyId = lobbyId;
  lastHostSignalAt = Date.now();
  hasEmittedHostTimeout = false;
  startClientHostWatchdog();
}

function createSocket() {
  if (socket) return socket;

  socket = dgram.createSocket({ type: "udp4", reuseAddr: true });
  socket.on("error", (err) => {
    // ignore socket errors to keep the app usable in environments that block UDP
    console.error('[preload] SOCKET ERROR:', err);
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
    } catch (err) {
      // ignore broadcast capability errors
      console.error('[preload] setBroadcast failed:', err);
    }
  });

  return socket;
}

// ------- shared functions -------

function emitHostFound(snapshot: MultiplayerLobbySnapshot, hostAddress: string, isGameActiveFlag?: boolean) {
  const payload: MultiplayerDiscoveredPayload = {
    ...snapshot,
    hostAddress,
    lastSeen: Date.now(),
    isGameActive: isGameActiveFlag,
  };
  onHostFoundCbs.forEach((cb) => cb(payload));
  onDiscoveryResponseCbs.forEach((cb) => cb(payload));
}

function emitHostExit(payload: MultiplayerHostExitPayload) {
  onHostExitCbs.forEach((cb) => cb(payload));
}

function broadcastSnapshot(snapshot: MultiplayerLobbySnapshot) {
  const s = createSocket();
  const packet: MultiplayerPacket = { type: "lobby-broadcast", snapshot, isGameActive };
  const payload = Buffer.from(JSON.stringify(packet));

  s.send(payload, 0, payload.length, BROADCAST_PORT, BROADCAST_ADDR, (err) => {
    void err;
  });
}

function pruneStalePlayers(staleMs = 10000) {
  // mid-game pruning guard
  if (!activeSnapshot || isGameActive) return;

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


function broadcastGameState(gameState: MultiplayerGameState) {
  isGameActive = true;
  const s = createSocket();
  const packet: MultiplayerPacket = { type: "game-state", payload: gameState };
  const payload = Buffer.from(JSON.stringify(packet));
  s.send(payload, 0, payload.length, BROADCAST_PORT, BROADCAST_ADDR, (err) => {
    if(err) console.warn('[preload] broadcast game state error', err);
  });
}

function sendAnswerSubmission(payload: { lobbyId: string; hostAddress: string; playerId: string; questionIndex: number; answer: string }) {
  const s = createSocket();
  const packet: MultiplayerPacket = { type: "answer-submission", payload };
  const data = Buffer.from(JSON.stringify(packet));
  s.send(data, 0, data.length, BROADCAST_PORT, BROADCAST_ADDR, (err) => {
    if (err) console.warn('[preload] send answer-submission error', err);
  });
}

function handlePacket(raw: string, senderAddress: string) {
  // console.log('[preload] handlePacket raw from', senderAddress, '-', raw.slice(0, 300));
  let packet: MultiplayerPacket | null = null;
  try {
    packet = JSON.parse(raw) as MultiplayerPacket;
  } catch (err) {
    console.warn('[preload] JSON parse failed', err);
    return;
  }

  if (!packet) return;
  // console.log('[preload] handlePacket parsed', packet.type, 'activeMode=', activeMode, 'activeSnapshot=', activeSnapshot?.lobbyId);

  // ------- shared discovery behavior (client+host) -------
  if (packet.type === "lobby-broadcast") {
    activeMode = activeMode ?? "client";
    emitHostFound(packet.snapshot, senderAddress, packet.isGameActive);
    markHostSignal(packet.snapshot.lobbyId);
    return;
  }

  if (packet.type === "discovery-request") {
    if (activeMode === "host" && activeSnapshot) {
      if (activeSnapshot.isPrivate) {
        // console.log('[preload] ignoring discovery request for private lobby', activeSnapshot.lobbyId);
        return;
      }
      // console.log('[preload] responding to discovery request with lobby', activeSnapshot.lobbyId);
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

  if (packet.type === "game-state") {
    if (activeMode === "client") {
      markHostSignal();
      onGameStateSyncCbs.forEach((cb) => cb(packet.payload));
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
    const isExistingPlayer = activeSnapshot.players.some((player) => player.id === packet.payload.player.id);
    if (isGameActive && !isExistingPlayer) {
      console.log('[preload] rejecting mid-game join for new player', packet.payload.player.id, 'lobby', packet.payload.lobbyId);
      return;
    }
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

  if (packet.type === "answer-submission") {
    if (packet.payload.lobbyId !== activeSnapshot.lobbyId) return;
    console.log('[preload] answer-submission from player', packet.payload.playerId, 'questionIndex', packet.payload.questionIndex, 'answer', packet.payload.answer);
    onAnswerSubmissionCbs.forEach((cb) => cb(packet.payload));
    return;
  }
}

function startDiscovery() {
  console.log('[preload] startDiscovery');
  activeMode = "client";
  createSocket();
}

function stopDiscovery() {
  console.log('[preload] stopDiscovery');
  if (activeMode === "client" && !activeClientLobbyId) {
    activeMode = null;
    stopClientHostWatchdog();
  }
}

function startBroadcast(snapshot: MultiplayerLobbySnapshot) {
  isGameActive = false;
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
  isGameActive = false;
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
  trackClientLobby(payload.lobbyId);
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
  // console.log('[preload] sending heartbeat', payload.playerId, 'lobby', payload.lobbyId);
  const s = createSocket();
  const packet: MultiplayerPacket = { type: "heartbeat", payload: { lobbyId: payload.lobbyId, hostAddress: payload.hostAddress, playerId: payload.playerId } };
  const data = Buffer.from(JSON.stringify(packet));
  s.send(data, 0, data.length, BROADCAST_PORT, BROADCAST_ADDR, (err) => {
    if (err) console.warn('[preload] send heartbeat error', err);
  });
}

function leaveLobby(payload: MultiplayerLeaveRequest) {
  console.log('[preload] sending leave-request to', payload.hostAddress, 'player', payload.playerId);
  if (activeClientLobbyId && payload.lobbyId === activeClientLobbyId) {
    stopClientHostWatchdog({ resetLobby: true });
    activeMode = null;
  }
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
  onDiscoveryResponse: (id: string, cb: (payload: MultiplayerDiscoveredPayload) => void) => { onDiscoveryResponseCbs.set(id, cb); },
  offDiscoveryResponse: (id: string) => { onDiscoveryResponseCbs.delete(id); },
  
  onHostFound: (id: string, cb: (payload: MultiplayerDiscoveredPayload) => void) => { onHostFoundCbs.set(id, cb); },
  offHostFound: (id: string) => { onHostFoundCbs.delete(id); },
  
  onPlayerJoined: (id: string, cb: (player: LobbyMember) => void) => { onPlayerJoinedCbs.set(id, cb); },
  offPlayerJoined: (id: string) => { onPlayerJoinedCbs.delete(id); },
  
  onPlayerReadyChanged: (id: string, cb: (playerId: string, ready: boolean) => void) => { onPlayerReadyChangedCbs.set(id, cb); },
  offPlayerReadyChanged: (id: string) => { onPlayerReadyChangedCbs.delete(id); },
  
  onPlayerLeft: (id: string, cb: (playerId: string) => void) => { onPlayerLeftCbs.set(id, cb); },
  offPlayerLeft: (id: string) => { onPlayerLeftCbs.delete(id); },
  
  onHostExit: (id: string, cb: (payload: MultiplayerHostExitPayload) => void) => { onHostExitCbs.set(id, cb); },
  offHostExit: (id: string) => { onHostExitCbs.delete(id); },
  
  onGameStateSync: (id: string, cb: (payload: MultiplayerGameState) => void) => { onGameStateSyncCbs.set(id, cb); },
  offGameStateSync: (id: string) => { onGameStateSyncCbs.delete(id); },
  
  onAnswerSubmission: (id: string, cb: (payload: { lobbyId: string; hostAddress: string; playerId: string; questionIndex: number; answer: string }) => void) => { onAnswerSubmissionCbs.set(id, cb); },
  offAnswerSubmission: (id: string) => { onAnswerSubmissionCbs.delete(id); },
  sendAnswerSubmission,
  requestJoin,
  setReady,
  discoveryRequest,
  sendHeartbeat,
  leaveLobby,
  updateLobbySnapshot,
  broadcastGameState,
});
