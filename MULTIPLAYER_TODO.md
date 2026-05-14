# Multiplayer Infrastructure Migration

Goal: Transition from machine-local UDP broadcasts to a robust, cross-device LAN architecture.

## Phase 1: Stability & Detection (COMPLETED)
- [x] Implement robust Network Interface selection (ignore virtual/VPN adapters).
- [x] Move Socket management from `preload.ts` to `main.ts` (Main Process).
- [x] Add IPC bridge for networking events.

## Phase 2: Reliable Communication (COMPLETED)
- [x] Implement ACK (Acknowledgment) system for critical packets (`join-request`, `ready-update`, `answer-submission`).
- [x] Add retransmission logic (Retries) for dropped critical packets.
- [x] Implement message sequencing/deduplication improvements.

## Phase 3: Discovery & Compatibility (COMPLETED)
- [x] Implement "Direct Join" via IP address fallback.
- [x] Add MTU safety: Compress snapshots/large payloads using `zlib` (Main process).
- [x] Integrate `multicast-dns` (mDNS) for robust ZeroConf discovery.

## Phase 4: Large Data Handling (COMPLETED)
- [x] Spin up a temporary HTTP server on the Host for `Questions.json` transfer.
- [x] Implement client-side fetching for questions via Host HTTP server.
- [ ] Move from UDP to TCP/WebSockets for mid-game state if jitter is high (Future/Optional).
