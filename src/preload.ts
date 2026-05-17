// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge, ipcRenderer } from "electron";
import * as os from "os"; 
import type {
  LobbyMember,
  PlayerConnectionState,
  MultiplayerDiscoveredPayload,
  MultiplayerHostExitPayload,
  MultiplayerJoinRequest,
  MultiplayerLeaveRequest,
  MultiplayerJoinAck,
  MultiplayerLobbySnapshot,
  MultiplayerReadyUpdate,
  MultiplayerGameState,
} from "./types/multiplayer";

function getLocalIp(): string {
  const nets = os.networkInterfaces();
  const candidates: { address: string; internal: boolean; name: string }[] = [];

  for (const name of Object.keys(nets)) {
    const interfaces = nets[name];
    if (!interfaces) continue;

    // Skip virtual/internal-only interfaces that commonly break LAN discovery
    const lowerName = name.toLowerCase();
    if (
      lowerName.includes('docker') ||
      lowerName.includes('vbox') ||
      lowerName.includes('vmware') ||
      lowerName.includes('vnet') ||
      lowerName.includes('virtual') ||
      lowerName.includes('tun') ||
      lowerName.includes('tap') ||
      lowerName.includes('wsl')
    ) {
      continue;
    }

    for (const net of interfaces) {
      if (net.family === 'IPv4') {
        candidates.push({ address: net.address, internal: net.internal, name });
      }
    }
  }

  // 1. Prioritize non-internal, likely-LAN addresses (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
  const lanMatch = candidates.find(c => 
    !c.internal && 
    (c.address.startsWith('192.168.') || c.address.startsWith('10.') || /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(c.address))
  );
  if (lanMatch) return lanMatch.address;

  // 2. Fallback to any non-internal IPv4
  const externalMatch = candidates.find(c => !c.internal);
  if (externalMatch) return externalMatch.address;

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
    | { type: "ack"; payload: { packetId: string; lobbyId: string; playerId?: string } }
  );

const BROADCAST_ADDR = "255.255.255.255";
const HOST_SILENCE_TIMEOUT_MS = 6000;
const HOST_WATCHDOG_INTERVAL_MS = 1000;

let broadcastInterval: NodeJS.Timeout | null = null;
let pendingHostExitTimeout: NodeJS.Timeout | null = null;
let packetSequence = 0;
const lastSeenPacketSequenceByScope = new Map<string, number>();
const recentPacketIds = new Map<string, number>();

interface PendingAck {
  packet: MultiplayerPacket;
  address: string;
  attempts: number;
  timeout: NodeJS.Timeout;
}
const pendingAcks = new Map<string, PendingAck>();
const MAX_ACK_ATTEMPTS = 5;
const ACK_RETRY_MS = 600;

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
const onPlayerReadyChangedCbs = new Map<string, (playerId: string, ready: boolean, member?: Partial<LobbyMember>) => void>();
const onPlayerLeftCbs = new Map<string, (playerId: string) => void>();
const onPlayerStatusChangedCbs = new Map<string, (playerId: string, connectionState: PlayerConnectionState) => void>();
const onHostExitCbs = new Map<string, (payload: MultiplayerHostExitPayload) => void>();
const onGameStateSyncCbs = new Map<string, (payload: MultiplayerGameState) => void>();
const onAnswerSubmissionCbs = new Map<string, (payload: { lobbyId: string; hostAddress: string; playerId: string; questionIndex: number; answer: string; remainingTime?: number }) => void>();
const onHttpServerStartedCbs = new Map<string, (port: number) => void>();

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

  console.log(`[preload] Starting host watchdog, timeout=${HOST_SILENCE_TIMEOUT_MS}ms, check interval=${HOST_WATCHDOG_INTERVAL_MS}ms`);
  hostWatchdogInterval = setInterval(() => {
    if (activeMode !== "client") return;
    if (!activeClientLobbyId) return;
    if (!lastHostSignalAt) return;

    const silenceMs = Date.now() - lastHostSignalAt;
    if (silenceMs <= HOST_SILENCE_TIMEOUT_MS) return;
    if (hasEmittedHostTimeout) return;

    hasEmittedHostTimeout = true;
    console.warn(`[preload] host silence timeout for lobby ${activeClientLobbyId} (${silenceMs}ms without host signal, threshold=${HOST_SILENCE_TIMEOUT_MS}ms)`);
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

  const now = Date.now();
  const oldLastSignal = lastHostSignalAt;
  lastHostSignalAt = now;
  hasEmittedHostTimeout = false;
  
  // Only log every few seconds to avoid spam, unless watchdog is close to timeout
  const silenceMs = oldLastSignal ? now - oldLastSignal : 0;
  if (silenceMs > 3000 || silenceMs === 0) {
    console.log(`[preload] Host signal received for lobby ${activeClientLobbyId} (${silenceMs}ms since last signal)`);
  }
}

function trackClientLobby(lobbyId: string) {
  activeClientLobbyId = lobbyId;
  lastHostSignalAt = Date.now();
  hasEmittedHostTimeout = false;
  startClientHostWatchdog();
}

function sendAck(packetId: string, lobbyId: string, address: string, playerId?: string) {
  const packet: MultiplayerPacket = {
    ...nextPacketMeta(),
    type: "ack",
    payload: { packetId, lobbyId, playerId }
  };
  getCriticalTargets(address).forEach((target) => sendUdpMessage(JSON.stringify(packet), target));
}

function getCriticalTargets(address: string): string[] {
  const normalized = address?.trim() || BROADCAST_ADDR;
  if (normalized === BROADCAST_ADDR) return [BROADCAST_ADDR];
  return [...new Set([normalized, BROADCAST_ADDR])];
}

function sendCriticalUdpMessage(packet: MultiplayerPacket, address: string = BROADCAST_ADDR) {
  const packetId = packet.packetId;
  const message = JSON.stringify(packet);
  const targets = getCriticalTargets(address);
  
  const attempt = (count: number) => {
    if (count >= MAX_ACK_ATTEMPTS) {
      console.warn(`[preload] Critical packet ${packet.type} (${packetId}) failed after ${MAX_ACK_ATTEMPTS} attempts`);
      pendingAcks.delete(packetId);
      return;
    }

    targets.forEach((target) => sendUdpMessage(message, target));

    const timeout = setTimeout(() => {
      const pending = pendingAcks.get(packetId);
      if (pending) {
        console.log(`[preload] Retrying critical packet ${packet.type} (${packetId}), attempt ${count + 1}`);
        attempt(count + 1);
      }
    }, ACK_RETRY_MS);

    pendingAcks.set(packetId, { packet, address: targets.join(","), attempts: count + 1, timeout });
  };

  attempt(0);
}

function sendUdpMessage(message: string, address: string = BROADCAST_ADDR) {
  ipcRenderer.send('multiplayer:udp-send', message, address);
}

// IPC listener for UDP messages from Main process
ipcRenderer.on('multiplayer:udp-message', (_event, message: string, senderAddress: string) => {
  handlePacket(message, senderAddress);
});

ipcRenderer.on('multiplayer:http-server-started', (_event, port: number) => {
  onHttpServerStartedCbs.forEach(cb => cb(port));
});

ipcRenderer.on('multiplayer:mdns-host-found', (_event, address: string) => {
  console.log('[preload] mDNS discovered host at', address);
  if (activeMode === "host" || activeClientLobbyId) return;
  directJoin(address);
});

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
      // payloads for these types include playerId, except kick-player which also carries playerId
      return `${senderAddress ?? 'unknown'}:${packet.payload.lobbyId}:${packet.payload.playerId ?? 'no-player'}`;
    case "host-exit":
      return `${senderAddress ?? 'unknown'}:${packet.payload.lobbyId}`;
    case "game-state":
      return `${senderAddress ?? 'unknown'}:${packet.payload.sessionId ?? 'no-session'}`;
    default:
      return null;
  }
}

function shouldAcceptPacket(packet: MultiplayerPacket, senderAddress?: string) {
  // Always accept ACKs to ensure we stop retrying even if sequence looks old
  if (packet.type === 'ack') return true;

  const scope = getPacketScope(packet, senderAddress);
  const now = Date.now();

  // Types that require strict ordering
  const sequenceTypes = new Set(["lobby-broadcast", "game-state", "join-ack", "join-nack", "host-exit"]);

  if (sequenceTypes.has(packet.type)) {
    if (!scope) return true;
    const lastSeen = lastSeenPacketSequenceByScope.get(scope);
    
    // Strict sequencing: only accept packets with HIGHER sequence than what we've seen
    if (lastSeen !== undefined && packet.sequence <= lastSeen) {
      // console.warn('[preload] DROPPING (seq) packet due to sequence:', { type: packet.type, sequence: packet.sequence, lastSeen, scope, senderAddress });
      return false;
    }
    lastSeenPacketSequenceByScope.set(scope, packet.sequence);
    return true;
  }

  // For other packets (requests/submissions) use packetId deduplication
  if (recentPacketIds.has(packet.packetId)) {
    // console.warn('[preload] DROPPING (dup) packet due to packetId seen:', { type: packet.type, packetId: packet.packetId, scope, senderAddress });
    return false;
  }
  recentPacketIds.set(packet.packetId, now);
  return true;
}

function generateSessionId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
}

function sendJoinAck(lobbyId: string, hostId: string, sessionId: string | undefined, accepted: boolean, reason?: string, address: string = BROADCAST_ADDR) {
  const payload: MultiplayerJoinAck = { lobbyId, hostId, sessionId, accepted, reason };
  const packet: MultiplayerPacket = { ...nextPacketMeta(), type: accepted ? "join-ack" : "join-nack", payload };
  sendUdpMessage(JSON.stringify(packet), address);
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

function emitPlayerStatusChanged(playerId: string, connectionState: PlayerConnectionState) {
  onPlayerStatusChangedCbs.forEach((cb) => cb(playerId, connectionState));
}

function countConnectedPlayers(players: LobbyMember[]) {
  return players.filter((player) => player.connectionState !== "disconnected").length;
}

function broadcastSnapshot(snapshot: MultiplayerLobbySnapshot) {
  const meta = nextPacketMeta();
  const sequencedSnapshot = { ...snapshot, sequence: meta.sequence };
  activeSnapshot = sequencedSnapshot;
  const packet: MultiplayerPacket = { ...meta, type: "lobby-broadcast", snapshot: sequencedSnapshot, isGameActive };
  sendUdpMessage(JSON.stringify(packet));
  
  // Also emit locally so the host renderer stays synced with the (potentially merged) snapshot
  emitHostFound(sequencedSnapshot, sequencedSnapshot.hostAddress ?? getLocalIp(), isGameActive);
}

function pruneStalePlayers(staleMs = 10000) {
  if (!activeSnapshot) return;

  const now = Date.now();
  let hasChanges = false;
  const nextPlayers: LobbyMember[] = activeSnapshot.players.map((player) => {
    if (player.id === activeSnapshot?.hostId) {
      if (player.connectionState !== "connected") {
        hasChanges = true;
        emitPlayerStatusChanged(player.id, "connected");
      }

      return {
        ...player,
        connectionState: "connected",
        lastSeenAt: player.lastSeenAt ?? now,
      };
    }

    const lastSeen = playerHeartbeats.get(player.id);
    const nextState =
      lastSeen === undefined
        ? (player.connectionState ?? "connected")
        : now - lastSeen > staleMs
          ? "disconnected"
          : "connected";

    if (player.connectionState !== nextState) {
      hasChanges = true;
      emitPlayerStatusChanged(player.id, nextState);
    }

    return {
      ...player,
      connectionState: nextState,
      lastSeenAt: lastSeen ?? player.lastSeenAt ?? now,
      disconnectedAt: nextState === "disconnected" ? (player.disconnectedAt ?? now) : undefined,
    };
  });

  if (!hasChanges) return;

  const nextSnapshot: MultiplayerLobbySnapshot = {
    ...activeSnapshot,
    players: nextPlayers,
    playerCount: countConnectedPlayers(nextPlayers),
  };
  activeSnapshot = nextSnapshot;
  broadcastSnapshot(nextSnapshot);
}

function sendHostExitMessage(lobbyId: string) {
  console.log('[preload] sending host-exit for lobby', lobbyId);
  const packet: MultiplayerPacket = { ...nextPacketMeta(), type: "host-exit", payload: { lobbyId, sessionId: activeSnapshot?.sessionId } };
  sendUdpMessage(JSON.stringify(packet));
}

function discoveryRequest(address: string = BROADCAST_ADDR) {
  const packet: MultiplayerPacket = { ...nextPacketMeta(), type: "discovery-request" };
  sendUdpMessage(JSON.stringify(packet), address);
}

function directJoin(hostAddress: string) {
  console.log('[preload] directJoin to', hostAddress);
  discoveryRequest(hostAddress);
}

function sendDiscoveryResponse(snapshot: MultiplayerLobbySnapshot, address: string, isGameActiveFlag?: boolean) {
  const meta = nextPacketMeta();
  const packet: MultiplayerPacket = {
    ...meta,
    type: "lobby-broadcast",
    snapshot: { ...snapshot, sequence: meta.sequence },
    isGameActive: isGameActiveFlag,
  };
  sendUdpMessage(JSON.stringify(packet), address);
}

function upsertLobbyMember(snapshot: MultiplayerLobbySnapshot, member: LobbyMember) {
  const existingIndex = snapshot.players.findIndex((p) => p.id === member.id);
  const nextMember: LobbyMember = {
    ...member,
    connectionState: member.connectionState ?? "connected",
    lastSeenAt: member.lastSeenAt ?? Date.now(),
    disconnectedAt: member.connectionState === "disconnected" ? member.disconnectedAt : undefined,
  };
  if (existingIndex >= 0) {
    const players = [...snapshot.players];
    players[existingIndex] = { ...players[existingIndex], ...nextMember };
    return { ...snapshot, players, playerCount: countConnectedPlayers(players.filter(p => p.role !== "spectator")) };
  }
  const nextPlayers = [...snapshot.players, nextMember];
  return {
    ...snapshot,
    players: nextPlayers,
    playerCount: countConnectedPlayers(nextPlayers.filter(p => p.role !== "spectator")), // ✅
  };
}

function updateHostSnapshot(mutator: (current: MultiplayerLobbySnapshot) => MultiplayerLobbySnapshot) {
  if (!activeSnapshot) return;
  activeSnapshot = mutator(activeSnapshot);
  console.log('[preload] updated activeSnapshot, players=', activeSnapshot.players.map(p => p.id).join(','));
  broadcastSnapshot(activeSnapshot);
  emitHostFound(activeSnapshot, activeSnapshot.hostAddress ?? BROADCAST_ADDR);
}

function sendKickPlayer(payload: { lobbyId: string; playerId: string; sessionId?: string }) {
  const packet: MultiplayerPacket = { ...nextPacketMeta(), type: "kick-player", payload: { ...payload, sessionId: payload.sessionId ?? activeSnapshot?.sessionId } };
  sendUdpMessage(JSON.stringify(packet));
}


function broadcastGameState(gameState: MultiplayerGameState) {
  isGameActive = true;
  const packet: MultiplayerPacket = {
    ...nextPacketMeta(),
    type: "game-state",
    payload: { ...gameState, sessionId: activeSnapshot?.sessionId } as MultiplayerGameState & { sessionId?: string },
  };
  sendUdpMessage(JSON.stringify(packet));
}

function sendAnswerSubmission(payload: { lobbyId: string; hostAddress: string; playerId: string; questionIndex: number; answer: string; remainingTime?: number }) {
  const packet: MultiplayerPacket = { ...nextPacketMeta(), type: "answer-submission", payload };
  sendCriticalUdpMessage(packet, BROADCAST_ADDR);
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
  if (!shouldAcceptPacket(packet, senderAddress)) {
    // Even if we don't accept the packet (e.g. duplicate), we should still ACK it
    // if it's a critical type that requires an ACK, so the sender stops retrying.
    const criticalIncoming = ["join-request", "ready-update", "leave-request", "answer-submission"];
    if ("payload" in packet && criticalIncoming.includes(packet.type)) {
      const payload = packet.payload as { lobbyId: string; playerId?: string };
      sendAck(packet.packetId, payload.lobbyId, senderAddress, payload.playerId);
    }
    return;
  }
  
  if (packet.type === "ack") {
    const pending = pendingAcks.get(packet.payload.packetId);
    if (pending) {
      clearTimeout(pending.timeout);
      pendingAcks.delete(packet.payload.packetId);
      console.log(`[preload] Received ACK for packet ${packet.payload.packetId}`);
    }
    return;
  }

  // Send ACK for incoming critical packets that passed shouldAcceptPacket
  const criticalIncoming = ["join-request", "ready-update", "leave-request", "answer-submission"];
  if ("payload" in packet && criticalIncoming.includes(packet.type)) {
    const payload = packet.payload as { lobbyId: string; playerId?: string };
    sendAck(packet.packetId, payload.lobbyId, senderAddress, payload.playerId);
  }

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
      if (senderAddress) {
        sendDiscoveryResponse(activeSnapshot, senderAddress, isGameActive);
      }
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
      // send explicit join-nack so client knows it was rejected
      sendJoinAck(packet.payload.lobbyId, activeSnapshot.hostId ?? '', activeSnapshot.sessionId, false, 'in-game', senderAddress);
      return;
    }
    console.log('[preload] join-request for lobby', packet.payload.lobbyId, 'from', senderAddress, 'player', packet.payload.player.id);

    playerHeartbeats.set(packet.payload.player.id, Date.now());

    updateHostSnapshot((current) =>
      upsertLobbyMember(current, {
        ...packet.payload.player,
        isHost: false,
        isReady: false,
        connectionState: "connected",
      }),
    );

    emitPlayerStatusChanged(packet.payload.player.id, "connected");

    onPlayerJoinedCbs.forEach((cb) =>
      cb({
        ...packet.payload.player,
        isHost: false,
        isReady: false,
        connectionState: "connected",
        lastSeenAt: Date.now(),
      }),
    );
    // acknowledge the join so the requesting client can proceed
    sendJoinAck(packet.payload.lobbyId, activeSnapshot.hostId ?? '', activeSnapshot.sessionId, true, undefined, senderAddress);
    return;
  }

  if (packet.type === "ready-update") {
    if (!activeSnapshot || packet.payload.lobbyId !== activeSnapshot.lobbyId) return;
    console.log('[preload] ready-update for', packet.payload.playerId, 'ready=', packet.payload.ready, 'member=', packet.payload.member);

    playerHeartbeats.set(packet.payload.playerId, Date.now());

    updateHostSnapshot((current) => ({
      ...current,
      players: current.players.map((player) =>
        player.id === packet.payload.playerId 
          ? { ...player, ...packet.payload.member, isReady: packet.payload.ready, connectionState: "connected", lastSeenAt: Date.now() } 
          : player,
      ),
      playerCount: countConnectedPlayers(current.players),
    }));

    emitPlayerStatusChanged(packet.payload.playerId, "connected");

    onPlayerReadyChangedCbs.forEach((cb) => cb(packet.payload.playerId, packet.payload.ready, packet.payload.member));
    return;
  }

  if (packet.type === "leave-request") {
    if (packet.payload.lobbyId !== activeSnapshot.lobbyId) return;
    console.log('[preload] leave-request for player', packet.payload.playerId);

    playerHeartbeats.delete(packet.payload.playerId);

    activeSnapshot = {
      ...activeSnapshot,
      players: activeSnapshot.players.filter((p) => p.id !== packet.payload.playerId),
      playerCount: countConnectedPlayers(activeSnapshot.players.filter((p) => p.id !== packet.payload.playerId)),
    };
    broadcastSnapshot(activeSnapshot);
    onPlayerLeftCbs.forEach((cb) => cb(packet.payload.playerId));
  }

  if (packet.type === "answer-submission") {
    if (packet.payload.lobbyId !== activeSnapshot.lobbyId) {
      // Mismatch but still ACK to stop retries (duplicate/late packet from old lobby)
      console.warn('[preload] answer-submission lobbyId mismatch: expected', activeSnapshot.lobbyId, 'got', packet.payload.lobbyId);
      sendAck(packet.packetId, packet.payload.lobbyId, senderAddress, packet.payload.playerId);
      return;
    }
    console.log('[preload] answer-submission from player', packet.payload.playerId, 'questionIndex', packet.payload.questionIndex, 'answer', packet.payload.answer);
    onAnswerSubmissionCbs.forEach((cb) => cb(packet.payload));
    return;
  }
}

function startDiscovery() {
  console.log('[preload] startDiscovery');
  activeMode = "client";
  ipcRenderer.send('multiplayer:mdns-query');
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

  ipcRenderer.send('multiplayer:mdns-start-adv', snapshot.lobbyId);

  if (pendingHostExitTimeout) {
    clearTimeout(pendingHostExitTimeout);
    pendingHostExitTimeout = null;
  }

  activeMode = "host";
  // merge with any existing activeSnapshot to avoid accidentally dropping recently-joined players
  const existing = activeSnapshot && activeSnapshot.lobbyId === snapshot.lobbyId ? activeSnapshot : null;
  const mergedPlayers = [
    ...(snapshot.players || []),
    ...(existing?.players || []).filter((p) => !(snapshot.players || []).some((sp) => sp.id === p.id)),
  ];
  activeSnapshot = {
    ...snapshot,
    hostAddress: localIp,   // ← correctly sets hostAddress inside the object
    players: mergedPlayers,
    playerCount: countConnectedPlayers(mergedPlayers),
  };
  broadcastSnapshot(activeSnapshot);

  if (broadcastInterval) clearInterval(broadcastInterval);
  let broadcastCount = 0;
  broadcastInterval = setInterval(() => {
    if (!activeSnapshot) {
      console.warn('[preload] Broadcast interval fired but activeSnapshot is null');
      return;
    }
    broadcastCount++;
    if (broadcastCount % 3 === 1) {
      // Log every 3rd broadcast to avoid spam (every 6 seconds)
      console.log('[preload] Broadcast interval firing, count=', broadcastCount, 'lobbyId=', activeSnapshot.lobbyId);
    }
    pruneStalePlayers(9000);
    broadcastSnapshot(activeSnapshot);
  }, 2000);
}

function stopBroadcast(options?: { suppressHostExit?: boolean }) {
  isGameActive = false;
  
  if (options?.suppressHostExit) {
    // Transitioning to in-game — stop broadcasting but keep host state alive
    // so the host can still receive & process answer-submission, game-state, etc.
    console.log('[preload] stopBroadcast (suppressHostExit=true) — preserving host state for game');
  } else {
    console.log('[preload] stopBroadcast');
  }

  ipcRenderer.send('multiplayer:mdns-stop-adv');

  if (activeMode === 'host' && activeSnapshot && !options?.suppressHostExit) {
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

  if (options?.suppressHostExit) {
    // Keep activeMode='host' and activeSnapshot so the host can still
    // receive & route multiplayer packets (answer-submission etc.)
    // The snapshot + broadcast interval are stopped, but the routing stays live.
    return;
  }

  if (activeMode === "host") {
    activeMode = null;
  }
  activeSnapshot = null;
}

function updateLobbySnapshot(snapshot: MultiplayerLobbySnapshot) {
  console.log('[preload] updateLobbySnapshot lobby', snapshot.lobbyId);
  // CRITICAL: preserve hostAddress from existing snapshot if not provided
  const existingHostAddress = activeSnapshot?.hostAddress;
  activeSnapshot = {
    ...snapshot,
    hostAddress: snapshot.hostAddress || existingHostAddress,
  };
  broadcastSnapshot(activeSnapshot);
}

function requestJoin(payload: MultiplayerJoinRequest) {
  console.log('[preload] sending join-request to', payload.hostAddress, 'lobby', payload.lobbyId, 'player', payload.player?.id, 'via host target');
  trackClientLobby(payload.lobbyId);

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
    role: payload.player.role,
  }
};

  const packet: MultiplayerPacket = { ...nextPacketMeta(), type: "join-request", payload: slimPayload };
  sendCriticalUdpMessage(packet, payload.hostAddress || BROADCAST_ADDR);
}

function setReady(payload: MultiplayerReadyUpdate) {
  console.log('[preload] sending ready-update to', payload.hostAddress, 'player', payload.playerId, 'ready', payload.ready, 'via host target');
  const packet: MultiplayerPacket = { ...nextPacketMeta(), type: "ready-update", payload };
  sendCriticalUdpMessage(packet, payload.hostAddress || BROADCAST_ADDR);
}

function sendHeartbeat(payload: { lobbyId: string; hostAddress: string; playerId: string }) {
  const packet: MultiplayerPacket = { ...nextPacketMeta(), type: "heartbeat", payload: { lobbyId: payload.lobbyId, hostAddress: payload.hostAddress, playerId: payload.playerId } };
  sendUdpMessage(JSON.stringify(packet));
}

function leaveLobby(payload: MultiplayerLeaveRequest) {
  console.log('[preload] sending leave-request to', payload.hostAddress, 'player', payload.playerId, 'via host target');
  if (activeClientLobbyId && payload.lobbyId === activeClientLobbyId) {
    stopClientHostWatchdog({ resetLobby: true });
    activeMode = null;
  }
  const packet: MultiplayerPacket = { ...nextPacketMeta(), type: "leave-request", payload };
  sendCriticalUdpMessage(packet, payload.hostAddress || BROADCAST_ADDR);
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
  
  onPlayerReadyChanged: (id: string, cb: (playerId: string, ready: boolean, member?: Partial<LobbyMember>) => void) => { onPlayerReadyChangedCbs.set(id, cb); },
  offPlayerReadyChanged: (id: string) => { onPlayerReadyChangedCbs.delete(id); },
  
  onPlayerLeft: (id: string, cb: (playerId: string) => void) => { onPlayerLeftCbs.set(id, cb); },
  offPlayerLeft: (id: string) => { onPlayerLeftCbs.delete(id); },

  onPlayerStatusChanged: (id: string, cb: (playerId: string, connectionState: PlayerConnectionState) => void) => { onPlayerStatusChangedCbs.set(id, cb); },
  offPlayerStatusChanged: (id: string) => { onPlayerStatusChangedCbs.delete(id); },
  
  onHostExit: (id: string, cb: (payload: MultiplayerHostExitPayload) => void) => { onHostExitCbs.set(id, cb); },
  offHostExit: (id: string) => { onHostExitCbs.delete(id); },
  
  onGameStateSync: (id: string, cb: (payload: MultiplayerGameState) => void) => { onGameStateSyncCbs.set(id, cb); },
  offGameStateSync: (id: string) => { onGameStateSyncCbs.delete(id); },
  
  onAnswerSubmission: (id: string, cb: (payload: { lobbyId: string; hostAddress: string; playerId: string; questionIndex: number; answer: string; remainingTime?: number }) => void) => { onAnswerSubmissionCbs.set(id, cb); },
  offAnswerSubmission: (id: string) => { onAnswerSubmissionCbs.delete(id); },
  startHttpServer: (data: string) => ipcRenderer.send('multiplayer:start-http-server', data),
  stopHttpServer: () => ipcRenderer.send('multiplayer:stop-http-server'),
  onHttpServerStarted: (id: string, cb: (port: number) => void) => { onHttpServerStartedCbs.set(id, cb); },
  offHttpServerStarted: (id: string) => { onHttpServerStartedCbs.delete(id); },
  sendAnswerSubmission,
  requestJoin,
  directJoin,
  setReady,
  discoveryRequest,
  sendHeartbeat,
  leaveLobby,
  updateLobbySnapshot,
  broadcastGameState,
  getLocalIp: () => getLocalIp(),
});
