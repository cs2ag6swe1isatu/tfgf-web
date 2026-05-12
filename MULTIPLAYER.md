# Multiplayer Trace (Discovery → Lobby → Game)

## Non-Negotiable Rule

This file must be read before any multiplayer change.

This file must be updated in same PR whenever multiplayer behavior is changed or planned to be changed.

If code and this file disagree, code wins temporarily, then this file must be corrected immediately.

---

## Scope

Trace covers:
- packet flow
- packet handling
- state sync
- UI/render behavior

Trace split by role:
- host
- client

Path covered:
- discovery
- lobby
- in-game question flow

---

## Transport Model

Production (Electron): UDP broadcast (`dgram`) on port `41234`, address `255.255.255.255`.

Dev (Vite browser): `BroadcastChannel` mock with same packet schema.

Transport bridge exposed to renderer as `window.multiplayer`.

### Packet Types

- `lobby-broadcast` (host snapshot)
- `discovery-request`
- `join-request`
- `ready-update`
- `leave-request`
- `heartbeat`
- `host-exit`
- `game-state`
- `answer-submission`

---

## Shared State Surfaces

### Multiplayer Store (Zustand)

Main fields used by flow:
- `lobbyRole`, `lobbyId`, `hostId`, `hostAddress`
- `players`
- `discoveredHosts`
- `joinStatus`

Main mutators used by flow:
- `addOrUpdateDiscoveredHost`, `pruneStaleDiscoveredHosts`
- `addOrUpdatePlayer`, `setPlayerReady`, `removePlayer`
- `syncLobbySnapshot`
- `resetMultiplayer`

### Trivia Store (Zustand)

Host authority fields:
- `phase`, `timer`, `currentIndex`
- `playerAnswers`, `playerScores`, `rankings`

Main multiplayer mutators:
- `submitAnswer` (client sends answer packet)
- `receiveRemoteAnswer` (host stores remote answer)
- `scoreCurrentQuestion` + `finalizeRankings` (host computes authority state)

---

## Client Trace

## 1) Discovery Page

1. Client enters multiplayer discovery.
2. Calls `startDiscovery()`.
3. Subscribes `onHostFound` and optional `onHostExit`.
4. Sends immediate `discovery-request`, then every 3s.
5. On each `lobby-broadcast`, updates discovered host list.
6. Stale hosts pruned on interval (TTL-driven).
7. UI (`LobbyList`) renders discovered hosts from store.

## 2) Join Lobby

1. User picks lobby.
2. Client seeds local store:
	- role = `client`
	- lobby id
	- host address
	- current player id
	- adds self as non-host non-ready player
3. Sends `join-request` packet.
4. Navigates to lobby screen immediately.

## 3) Lobby Sync + Heartbeat

1. Client lobby registers:
	- `onHostFound` (snapshot stream)
	- `onHostExit`
	- `onGameStateSync`
2. Starts heartbeat timer: sends `heartbeat` every 3s.
3. Snapshot handling rules:
	- ignore different lobby ids
	- drop out-of-order snapshots by `lastActive` timestamp
	- mark host seen time
	- if local player present in snapshot: accept and `syncLobbySnapshot`
4. Host timeout watchdog:
	- if no host seen > timeout window, treat as disconnect
	- reset multiplayer state
	- route user back to multiplayer menu

## 4) Client Game Start Path

1. Host sends authoritative `game-state` packets (phase can be `readying`, `asking`, `answering`, `scoring`, or `ranking`) with config/seed.
2. Client lobby handler sets game config from payload.
3. Client starts trivia session with received seed/config and immediately hydrates trivia phase/timer/index from first sync packet.
4. Client stops discovery.
5. Client routes to question screen.

## 5) Client In-Game Sync + Input

1. Question page subscribes `onGameStateSync`.
2. Each host `game-state` updates local trivia phase/timer/currentIndex (and optional config fields).
3. When local user answers:
	- `submitAnswer` stores local selected answer
	- if role is client multiplayer, sends `answer-submission` packet with `questionIndex`, `answer`, player id, lobby id
4. Client never computes authoritative shared scoring. Host drives progression.

---

## Host Trace

## 1) Create Lobby

1. Host enters multiplayer lobby.
2. If no players in store, host self-seeds as:
	- host player
	- ready = true
3. Builds lobby snapshot payload.
4. Calls `startBroadcast(snapshot)`.
5. Bridge starts periodic `lobby-broadcast` (~2s) and stale-player pruning.

## 2) Handle Lobby Packets

Host-side packet handling lives in bridge handler:

### `join-request`
- validate lobby id match
- upsert joining player as non-host non-ready
- refresh heartbeat map for joining player
- update active snapshot
- rebroadcast snapshot
- emit `onPlayerJoined` callback to renderer

### `ready-update`
- validate lobby id match
- update player readiness in snapshot
- refresh heartbeat map
- rebroadcast snapshot
- emit `onPlayerReadyChanged`

### `leave-request`
- validate lobby id match
- remove player from snapshot + heartbeat map
- rebroadcast snapshot
- emit `onPlayerLeft`

### `heartbeat`
- validate lobby id match
- update last seen for player

### `answer-submission`
- validate lobby id match
- emit `onAnswerSubmission` to renderer (host question page)

## 3) Host Renderer Lobby Reactions

Host lobby subscribes callbacks:
- `onPlayerJoined` → `addOrUpdatePlayer`
- `onPlayerReadyChanged` → `setPlayerReady`
- `onPlayerLeft` → `removePlayer`

Any player/config/privacy change triggers `updateLobbySnapshot()` so broadcasted snapshot matches renderer truth.

## 4) Start Game (Host Authority Handoff)

1. Host can start only when:
	- category selected
	- difficulty selected
	- at least 2 players
	- everyone ready
2. Host starts local trivia with generated seed.
3. Host broadcasts initial `game-state` to all clients.
4. Host routes to question screen.

## 5) Host In-Game Authority

1. Host question page ticks timer each second.
2. On each tick, host broadcasts authoritative `game-state` (phase/timer/index + config).
3. Host listens `onAnswerSubmission` and stores remote answers via `receiveRemoteAnswer`.
4. On scoring phase:
	- host computes scores (`scoreCurrentQuestion`)
	- host computes rankings (`finalizeRankings`)
	- host broadcasts scoring state snapshot
5. Host progression remains source of truth for multiplayer game flow.

---

## Discovery/Lobby/Game Rendering Map

## Discovery render
- Source: `multiplayerStore.discoveredHosts`
- View: `LobbyList`
- Re-render trigger: `addOrUpdateDiscoveredHost`, `removeDiscoveredHost`, prune cycle

## Lobby render
- Source: `multiplayerStore.players`, role, privacy, selected config
- View: `PlayerList` + action buttons (ready/start/selectors)
- Re-render trigger: snapshot sync or host-side join/ready/leave callbacks

## Question render
- Source: `triviaStore.phase/timer/currentIndex/questions/answers/scores/rankings`
- View: HUD + phase-dependent content, then end-of-game achievement unlock overlay before final summary
- Re-render trigger:
  - host timer ticks
  - incoming `game-state` on client
  - local answer actions
  - host scoring/ranking computation

---

## Failure/Recovery Behaviors

## Host disconnect path
- Signal path 1: explicit `host-exit` packet on host stop broadcast.
- Signal path 2: implicit timeout on client if host snapshots stop.
- Client reaction: reset multiplayer store, return to multiplayer menu.

## Stale player path (host)
- Host tracks heartbeat timestamps.
- Prunes stale non-host players after stale threshold.
- Rebroadcasts pruned snapshot.

## Out-of-order snapshot defense (client lobby)
- Client tracks newest snapshot timestamp.
- Older snapshot ignored.

---

## Known Behavior Notes (Important)

1. `hostAddress` currently mostly metadata.
	- several send functions still broadcast to LAN, not direct unicast.

2. Client applies host `game-state` during question flow by direct trivia state set.
	- host remains authority for phase/timer/index.

3. End-of-game achievement unlocks are evaluated at session completion and shown in a dedicated page.
	- the unlock queue is dismissed one achievement at a time by click/tap.
	- after the queue is empty, the app routes to the final summary screen.

3. Lobby and question phases both rely on periodic host broadcast.
	- network jitter/drop can cause visible timer jumps client-side.

---

## Mandatory Update Checklist (Use Every Multiplayer PR)

When any multiplayer code changes, update this file sections impacted below:

- [ ] packet schema (added/removed fields, new type)
- [ ] discovery cadence/TTL/timeouts
- [ ] lobby join/ready/leave/heartbeat semantics
- [ ] host authority boundaries
- [ ] game-state sync fields
- [ ] scoring/ranking authority or flow
- [ ] disconnect recovery behavior
- [ ] render/store coupling changes

PR rule: if any checkbox touched in code and this file not updated, PR not complete.

---

## Audit Issues (Current Setup)

These are issues to re-check whenever multiplayer changes. Some are confirmed code problems; some are design risks that can become bugs.

### Resolved issues in current branch

1. Type safety dropped in question flow.
	- Fixed by replacing `any` in [src/pages/QuestionPage.tsx](src/pages/QuestionPage.tsx#L1-L200) with typed `MultiplayerBridge` + typed partial state.

2. Dead code in question page.
	- Fixed by removing unused `mockRankings` branch in [src/pages/QuestionPage.tsx](src/pages/QuestionPage.tsx#L360-L420).

3. Unused import in preload bridge.
	- Fixed by removing `off` import from [src/preload.ts](src/preload.ts#L1-L20).

4. Answer submission payload incomplete in store path.
	- Fixed by passing `hostAddress` in [src/store/triviaStore.ts](src/store/triviaStore.ts#L358-L377).

5. Game-state payload boundary was loose.
	- Fixed by adding `playerScores` and `rankings` to [src/types/multiplayer.ts](src/types/multiplayer.ts#L1-L40) and syncing them in [src/pages/QuestionPage.tsx](src/pages/QuestionPage.tsx#L1-L220).

6. Host disconnect handling was split across layers.
	- Fixed by moving host-silence timeout emission into preload bridge and removing lobby-page timeout watchdog.
	- Renderer now consumes one disconnect signal path (`onHostExit`) instead of mixed transport + UI timers.

7. Mid-game join sync path was narrow.
	- Fixed by widening lobby-side `handleGameStateSync` in [src/pages/MultiplayerLobbyPage.tsx](src/pages/MultiplayerLobbyPage.tsx#L75-L133) to accept in-progress phases (`readying`, `asking`, `answering`, `scoring`, `ranking`).
	- Late joiners now bootstrap trivia state from the first host game-state packet before routing to the question screen.

### Remaining issues / behavior gaps

7. Direct addressing still not active in Electron preload send path.
	- `hostAddress` exists in payloads but connected-phase packets still send to broadcast address in preload.
	- Result: extra LAN noise + weaker host-target guarantees.

### Audit rule

Before any multiplayer PR merges, re-check:
- packet schema match between `types`, bridge, store, and pages
- lobby join/ready/leave flow
- host broadcast cadence and heartbeat timeout
- client join-mid-game behavior
- direct vs broadcast routing intent
- lint/compile hygiene in multiplayer files

---

## Architecture Cleanup Task Board (Suggested Model)

Goal: keep broadcast for discovery, then switch to host-directed flow once client joins.

### Phase 1: Transport Hygiene

- [ ] Keep broadcast only for discovery + lobby announce packets.
- [ ] Use direct host send (unicast to `hostAddress`) for connected-phase packets:
	- `join-request`
	- `ready-update`
	- `leave-request`
	- `heartbeat`
	- `answer-submission`
- [ ] In host receive handlers, validate both `lobbyId` and `hostAddress` target before mutating state.
- [ ] Add one shared send helper in preload: `sendPacket(packet, targetAddress = BROADCAST_ADDR)` to remove duplicated send logic.

Acceptance:
- discovery still works by LAN broadcast.
- connected client packets do not spam all hosts on LAN.

### Phase 2: State Lifecycle Cleanup

- [ ] Explicitly model session stage in store (`discovering` | `lobby` | `in-game` | `reconnecting`).
- [ ] Stop lobby-only heartbeat/listeners immediately on game transition (already mostly done; keep as invariant).
- [ ] Remove dead/unused lobby store fields OR wire them to real transitions.
- [ ] Single disconnect transition function reused by lobby and question flows.

Acceptance:
- no duplicate disconnect logic paths.
- no lobby polling/listeners active during in-game state.

### Phase 3: Reconnect Model

- [ ] Keep lobby entry while game active with status (`in-game`, `slots`, `reconnectAllowed`).
- [ ] Add reconnect request packet (`sync-request`) with `lobbyId`, `playerId`, optional `lastKnownTick`.
- [ ] Host replies immediately with unicast full sync (`sync-state`) including:
	- phase/timer/index
	- seed/config
	- player presence
	- scores/rankings
- [ ] If host rejects, send structured reason (`not-in-lobby`, `game-closed`, `identity-mismatch`).

Acceptance:
- dropped client can rediscover lobby and resync in-game without full app reset.

### Phase 4: Dev/Prod Parity

- [ ] Keep mock behavior aligned with preload behavior for target filtering.
- [ ] Remove duplicate heartbeat branch in mock handler.
- [ ] Add parity checklist in PR template: "mock and preload packet semantics match".

Acceptance:
- no mock-only success cases that fail in Electron LAN path.

### Phase 5: Observability + Guardrails

- [ ] Add packet counters per type (sent/received/dropped) for debug builds.
- [ ] Log drop reasons (`wrong-lobby`, `wrong-host`, `phase-mismatch`, `stale`).
- [ ] Add watchdog in QuestionPage for host silence timeout in-game.

Acceptance:
- reconnect/timeout failures diagnosable from logs in one run.



