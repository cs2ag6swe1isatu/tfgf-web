// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge, ipcRenderer } from "electron";
import * as dgram from "dgram";
import * as os from "os"; 
import type {
  LobbyMember,
  MultiplayerDiscoveredPayload,
  MultiplayerHostExitPayload,
  MultiplayerJoinRequest,
  MultiplayerLeaveRequest,
  MultiplayerLobbySnapshot,
  MultiplayerReadyUpdate,
  MultiplayerGameState,
  MultiplayerJoinAck,
} from "./types/multiplayer";

function getLocalIp(): string {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    const interfaces = nets[name];
    if (!interfaces) continue;
    for (const net of interfaces) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return '127.0.0.1';
}

type MultiplayerPacket =
  & { sequence: number; packetId: string }
  & (
    | { type: "lobby-broadcast"; snapshot: MultiplayerLobbySnapshot; isGameActive?: boolean }
    | { type: "discovery-request" }
    | { type: "join-request"; payload: MultiplayerJoinRequest }
    | { type: "join-ack"; payload: MultiplayerJoinAck }
    | { type: "join-nack"; payload: MultiplayerJoinAck }
      | { type: "kick-player"; payload: { lobbyId: string; playerId: string; sessionId?: string } }
    | { type: "ready-update"; payload: MultiplayerReadyUpdate }
    | { type: "leave-request"; payload: MultiplayerLeaveRequest }
    | { type: "heartbeat"; payload: { lobbyId: string; hostAddress: string; playerId: string } }
    | { type: "host-exit"; payload: MultiplayerHostExitPayload }
    | { type: "game-state"; payload: MultiplayerGameState }
    | { type: "answer-submission"; payload: { lobbyId: string; hostAddress: string; playerId: string; questionIndex: number; answer: string } }
  );

const BROADCAST_PORT = 41234;
const BROADCAST_ADDR = "255.255.255.255";
const HOST_SILENCE_TIMEOUT_MS = 6000;
const HOST_WATCHDOG_INTERVAL_MS = 1000;

let socket: dgram.Socket | null = null;
let broadcastInterval: NodeJS.Timeout | null = null;
let pendingHostExitTimeout: NodeJS.Timeout | null = null;
let packetSequence = 0;
const lastSeenPacketSequenceByScope = new Map<string, number>();
const recentPacketIds = new Map<string, number>();

// Purge recent packetId cache periodically
setInterval(() => {
  const now = Date.now();
  for (const [id, ts] of recentPacketIds.entries()) {
    if (now - ts > 60_000) recentPacketIds.delete(id);
  }
}, 30_000);

const onHostFoundCbs = new Map<string, (payload: MultiplayerDiscoveredPayload) => void>();
const onDiscoveryResponseCbs = new Map<string, (payload: MultiplayerDiscoveredPayload) => void>();
const onPlayerJoinedCbs = new Map<string, (player: LobbyMember) => void>();
const onPlayerKickedCbs = new Map<string, (payload: { lobbyId: string; playerId: string; sessionId?: string }) => void>();
const onPlayerReadyChangedCbs = new Map<string, (playerId: string, ready: boolean) => void>();
const onPlayerLeftCbs = new Map<string, (playerId: string) => void>();
const onHostExitCbs = new Map<string, (payload: MultiplayerHostExitPayload) => void>();
const onJoinResponseCbs = new Map<string, (payload: MultiplayerJoinAck) => void>();
const onGameStateSyncCbs = new Map<string, (payload: MultiplayerGameState) => void>();
const onAnswerSubmissionCbs = new Map<string, (payload: { lobbyId: string; hostAddress: string; playerId: string; questionIndex: number; answer: string; remainingTime?: number }) => void>();

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

function nextPacketMeta() {
  packetSequence += 1;
  return { sequence: packetSequence, packetId: generateSessionId() };
}

function getPacketScope(packet: MultiplayerPacket, senderAddress?: string) {
  switch (packet.type) {
    case "lobby-broadcast":
      return `${senderAddress ?? 'unknown'}:${packet.snapshot.lobbyId}:${packet.snapshot.sessionId ?? 'no-session'}`;
    case "join-ack":
    case "join-nack":
      return `${senderAddress ?? 'unknown'}:${packet.payload.lobbyId}:${packet.payload.sessionId ?? 'no-session'}`;
    case "join-request":
      // scope join requests by player id to avoid collisions when multiple instances share the same IP
      return `${senderAddress ?? 'unknown'}:${packet.payload.lobbyId}:${(packet.payload.player && packet.payload.player.id) ?? 'no-player'}`;
    case "ready-update":
    case "leave-request":
    case "heartbeat":
    case "kick-player":
    case "answer-submission":
      // scope per-player where possible so different players on same IP don't share sequence state
      // payloads for these types include playerId
      // @ts-ignore - narrow by case above
      return `${senderAddress ?? 'unknown'}:${packet.payload.lobbyId}:${packet.payload.playerId ?? packet.payload.player?.id ?? 'no-player'}`;
    case "host-exit":
      return `${senderAddress ?? 'unknown'}:${packet.payload.lobbyId}`;
    case "game-state":
      return `${senderAddress ?? 'unknown'}:${packet.payload.sessionId ?? 'no-session'}`;
    default:
      return null;
  }
}

function shouldAcceptPacket(packet: MultiplayerPacket, senderAddress?: string) {
  const scope = getPacketScope(packet, senderAddress);
  const now = Date.now();

  // Types that require ordering (we keep sequence-based filtering for these)
  const sequenceTypes = new Set(["lobby-broadcast", "game-state", "join-ack", "join-nack", "host-exit"]);

  if (sequenceTypes.has(packet.type)) {
    if (!scope) return true;
    const lastSeen = lastSeenPacketSequenceByScope.get(scope);
    if (lastSeen !== undefined && packet.sequence <= lastSeen) {
      console.warn('[preload] DROPPING (seq) packet due to sequence:', { type: packet.type, sequence: packet.sequence, lastSeen, scope, senderAddress });
      return false;
    }
    lastSeenPacketSequenceByScope.set(scope, packet.sequence);
    return true;
  }

  // For other packets use packetId deduplication to avoid sequence collisions across senders
  if (recentPacketIds.has(packet.packetId)) {
    const lastSeenTs = recentPacketIds.get(packet.packetId);
    console.warn('[preload] DROPPING (dup) packet due to packetId seen:', { type: packet.type, packetId: packet.packetId, scope, senderAddress, lastSeenTs });
    return false;
  }
  recentPacketIds.set(packet.packetId, now);
  return true;
}

function generateSessionId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
}

function sendJoinAck(lobbyId: string, hostId: string, sessionId: string | undefined, accepted: boolean, reason?: string) {
  const s = createSocket();
  const payload: MultiplayerJoinAck = { lobbyId, hostId, sessionId, accepted, reason };
  const packet: MultiplayerPacket = { ...nextPacketMeta(), type: accepted ? "join-ack" : "join-nack", payload };
  const data = Buffer.from(JSON.stringify(packet));
  s.send(data, 0, data.length, BROADCAST_PORT, BROADCAST_ADDR, (err) => { if (err) console.warn('[preload] send join-ack error', err); });
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
  const meta = nextPacketMeta();
  const sequencedSnapshot = { ...snapshot, sequence: meta.sequence };
  activeSnapshot = sequencedSnapshot;
  const packet: MultiplayerPacket = { ...meta, type: "lobby-broadcast", snapshot: sequencedSnapshot, isGameActive };
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
  const packet: MultiplayerPacket = { ...nextPacketMeta(), type: "host-exit", payload: { lobbyId, sessionId: activeSnapshot?.sessionId } };
  const payload = Buffer.from(JSON.stringify(packet));
  s.send(payload, 0, payload.length, BROADCAST_PORT, BROADCAST_ADDR, (err) => {
    void err;
  });
}

function discoveryRequest() {
  const s = createSocket();
  const packet: MultiplayerPacket = { ...nextPacketMeta(), type: "discovery-request" };
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
  const current = activeSnapshot;
  const updated = mutator(current);
  activeSnapshot = {
    ...updated,
    hostAddress: updated.hostAddress ?? current.hostAddress ?? BROADCAST_ADDR,
    sessionId: updated.sessionId ?? current.sessionId ?? generateSessionId(),
  };
  console.log('[preload] updated activeSnapshot, players=', activeSnapshot.players.map((p) => p.id).join(','));
  broadcastSnapshot(activeSnapshot);
  emitHostFound(activeSnapshot, activeSnapshot.hostAddress ?? BROADCAST_ADDR);
}

function sendKickPlayer(payload: { lobbyId: string; playerId: string; sessionId?: string }) {
  const s = createSocket();
  const packet: MultiplayerPacket = { ...nextPacketMeta(), type: "kick-player", payload: { ...payload, sessionId: payload.sessionId ?? activeSnapshot?.sessionId } };
  const data = Buffer.from(JSON.stringify(packet));
  s.send(data, 0, data.length, BROADCAST_PORT, BROADCAST_ADDR, (err) => {
    if (err) console.warn('[preload] send kick-player error', err);
  });
}


function broadcastGameState(gameState: MultiplayerGameState) {
  isGameActive = true;
  const s = createSocket();
  const packet: MultiplayerPacket = { ...nextPacketMeta(), type: "game-state", payload: { ...gameState, sessionId: activeSnapshot?.sessionId } };
  const payload = Buffer.from(JSON.stringify(packet));
  s.send(payload, 0, payload.length, BROADCAST_PORT, BROADCAST_ADDR, (err) => {
    if(err) console.warn('[preload] broadcast game state error', err);
  });
}

function sendAnswerSubmission(payload: { lobbyId: string; hostAddress: string; playerId: string; questionIndex: number; answer: string; remainingTime?: number }) {
  const s = createSocket();
  const packet: MultiplayerPacket = { ...nextPacketMeta(), type: "answer-submission", payload };
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
  if (!shouldAcceptPacket(packet, senderAddress)) return;
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
    if (packet.payload.sessionId && activeSnapshot?.sessionId && packet.payload.sessionId !== activeSnapshot.sessionId) return;
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

  if (packet.type === 'join-ack' || packet.type === 'join-nack') {
    if (activeMode === 'client') {
      onJoinResponseCbs.forEach((cb) => cb(packet.payload));
    }
    return;
  }

  if (packet.type === "kick-player") {
    if (packet.payload.sessionId && activeSnapshot?.sessionId && packet.payload.sessionId !== activeSnapshot.sessionId) return;
    onPlayerKickedCbs.forEach((cb) => cb(packet.payload));
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
      // send explicit join-nack so client knows it was rejected
      sendJoinAck(packet.payload.lobbyId, activeSnapshot.hostId ?? '', activeSnapshot.sessionId, false, 'in-game');
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
    // acknowledge the join so the requesting client can proceed
    sendJoinAck(packet.payload.lobbyId, activeSnapshot.hostId ?? '', activeSnapshot.sessionId, true);
    return;
  }

  if (packet.type === "ready-update") {
    if (!activeSnapshot || packet.payload.lobbyId !== activeSnapshot.lobbyId) return;
    const playerExists = activeSnapshot.players.some((p) => p.id === packet.payload.playerId);
    console.log('[preload] ready-update for', packet.payload.playerId, 'ready=', packet.payload.ready, 'playerExists=', playerExists);

    if (!playerExists) {
      console.warn('[preload] ready-update received for unknown player', packet.payload.playerId);
      return;
    }

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
  const localIp = getLocalIp();
  console.log('[preload] startBroadcast lobby', snapshot.lobbyId, 'hostAddress', localIp);

  if (pendingHostExitTimeout) {
    clearTimeout(pendingHostExitTimeout);
    pendingHostExitTimeout = null;
  }

  activeMode = "host";
  createSocket();
  // merge with any existing activeSnapshot to avoid accidentally dropping recently-joined players
  const existing = activeSnapshot && activeSnapshot.lobbyId === snapshot.lobbyId ? activeSnapshot : null;
  const mergedPlayers = [
    ...(snapshot.players || []),
    ...(existing?.players || []).filter((p) => !(snapshot.players || []).some((sp) => sp.id === p.id)),
  ];
  activeSnapshot = {
    ...snapshot,
    hostAddress: localIp,
    players: mergedPlayers,
    playerCount: mergedPlayers.length,
    sessionId: existing?.sessionId ?? generateSessionId(),
  };
  broadcastSnapshot(activeSnapshot);

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
  console.log('[preload] updateLobbySnapshot lobby', snapshot.lobbyId, 'players', snapshot.players.map(p => p.id).join(','));
  // Treat incoming snapshot players as authoritative to avoid re-adding removed players.
  const existing = activeSnapshot && activeSnapshot.lobbyId === snapshot.lobbyId ? activeSnapshot : null;
  const incomingPlayerIds = (snapshot.players || []).map((p) => p.id).join(',');
  const existingPlayerIds = (existing?.players || []).map((p) => p.id).join(',');
  console.log('[preload] updateLobbySnapshot incomingPlayers=', incomingPlayerIds, 'existingPlayers=', existingPlayerIds);
  activeSnapshot = {
    ...snapshot,
    players: snapshot.players || [],
    playerCount: (snapshot.players || []).length,
    sessionId: snapshot.sessionId ?? existing?.sessionId ?? generateSessionId(),
    hostAddress: snapshot.hostAddress ?? existing?.hostAddress ?? BROADCAST_ADDR,
  };
  broadcastSnapshot(activeSnapshot);
}

function requestJoin(payload: MultiplayerJoinRequest) {
  console.log('[preload] sending join-request to', payload.hostAddress, 'lobby', payload.lobbyId, 'player', payload.player?.id, 'via broadcast');
  trackClientLobby(payload.lobbyId);
  const s = createSocket();

  // Strip player to essential fields only to avoid EMSGSIZE
 const slimPayload = {
  ...payload,
  player: {
    id: payload.player.id,
    name: payload.player.name,
    level: payload.player.level,
    avatar: payload.player.avatar,
    rank: payload.player.rank,
    isHost: payload.player.isHost,
    isReady: payload.player.isReady,
  }
};

  const packet: MultiplayerPacket = { ...nextPacketMeta(), type: "join-request", payload: slimPayload };
  const data = Buffer.from(JSON.stringify(packet));
  console.log('[preload] join-request packet size:', data.length);
  s.send(data, 0, data.length, BROADCAST_PORT, BROADCAST_ADDR, (err) => {
    if (err) console.warn('[preload] send join-request error', err);
  });
}

function setReady(payload: MultiplayerReadyUpdate) {
  console.log('[preload] sending ready-update to', payload.hostAddress, 'player', payload.playerId, 'ready', payload.ready, 'via broadcast');
  const s = createSocket();
  const packet: MultiplayerPacket = { ...nextPacketMeta(), type: "ready-update", payload };
  const data = Buffer.from(JSON.stringify(packet));
  s.send(data, 0, data.length, BROADCAST_PORT, BROADCAST_ADDR, (err) => {
    if (err) console.warn('[preload] send ready-update error', err);
  });
}

function sendHeartbeat(payload: { lobbyId: string; hostAddress: string; playerId: string }) {
  // console.log('[preload] sending heartbeat', payload.playerId, 'lobby', payload.lobbyId);
  const s = createSocket();
  const packet: MultiplayerPacket = { ...nextPacketMeta(), type: "heartbeat", payload: { lobbyId: payload.lobbyId, hostAddress: payload.hostAddress, playerId: payload.playerId } };
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
  const packet: MultiplayerPacket = { ...nextPacketMeta(), type: "leave-request", payload };
  const data = Buffer.from(JSON.stringify(packet));
  s.send(data, 0, data.length, BROADCAST_PORT, BROADCAST_ADDR, (err) => {
    if (err) console.warn('[preload] send leave-request error', err);
  });
}

// Expose file-based player storage API for Electron
contextBridge.exposeInMainWorld("playerStorage", {
  read: async () => ipcRenderer.invoke('player-storage:read'),
  write: async (data: string) => ipcRenderer.invoke('player-storage:write', data),
  delete: async () => ipcRenderer.invoke('player-storage:delete'),
});

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
  onPlayerKicked: (id: string, cb: (payload: { lobbyId: string; playerId: string; sessionId?: string }) => void) => { onPlayerKickedCbs.set(id, cb); },
  offPlayerKicked: (id: string) => { onPlayerKickedCbs.delete(id); },
  
  onPlayerReadyChanged: (id: string, cb: (playerId: string, ready: boolean) => void) => { onPlayerReadyChangedCbs.set(id, cb); },
  offPlayerReadyChanged: (id: string) => { onPlayerReadyChangedCbs.delete(id); },
  
  onPlayerLeft: (id: string, cb: (playerId: string) => void) => { onPlayerLeftCbs.set(id, cb); },
  offPlayerLeft: (id: string) => { onPlayerLeftCbs.delete(id); },
  
  onHostExit: (id: string, cb: (payload: MultiplayerHostExitPayload) => void) => { onHostExitCbs.set(id, cb); },
  offHostExit: (id: string) => { onHostExitCbs.delete(id); },
  onJoinResponse: (id: string, cb: (payload: MultiplayerJoinAck) => void) => { onJoinResponseCbs.set(id, cb); },
  offJoinResponse: (id: string) => { onJoinResponseCbs.delete(id); },
  
  onGameStateSync: (id: string, cb: (payload: MultiplayerGameState) => void) => { onGameStateSyncCbs.set(id, cb); },
  offGameStateSync: (id: string) => { onGameStateSyncCbs.delete(id); },
  
  onAnswerSubmission: (id: string, cb: (payload: { lobbyId: string; hostAddress: string; playerId: string; questionIndex: number; answer: string; remainingTime?: number }) => void) => { onAnswerSubmissionCbs.set(id, cb); },
  offAnswerSubmission: (id: string) => { onAnswerSubmissionCbs.delete(id); },
  sendAnswerSubmission,
  requestJoin,
  setReady,
  discoveryRequest,
  sendHeartbeat,
  leaveLobby,
  kickPlayer: sendKickPlayer,
  updateLobbySnapshot,
  broadcastGameState,
});
