# tfgf-web

A LAN-capable desktop trivia game built with React, TypeScript, Vite and Electron. This repository contains the full application (renderer + main process), a Vite development workflow for fast UI iteration, and an Electron build for real LAN multiplayer testing using mDNS and UDP.

## Key Features

- Local multiplayer over LAN using mDNS (ZeroConf) and UDP for game packets
- Fast Vite-only development mode (simulates networking via BroadcastChannel)
- Lobby discovery, join/leave, ready-state sync, and robust multiplayer flow
- Electron packaging with `electron-forge` for cross-platform desktop builds

## Tech Stack

- Frontend: React + TypeScript
- Build: Vite
- Desktop wrapper: Electron (electron-forge)
- Networking: multicast-dns (mDNS) + UDP (native) / BroadcastChannel (dev mock)
- State: Zustand

## Quick Start

Prerequisites:

- Node.js 18+ and npm (or yarn/pnpm)
- For LAN testing (Electron): no extra deps; on Linux ensure `avahi-daemon` is running for mDNS

Install dependencies:

```bash
npm install
```

Run the Vite development server (fast UI iteration, BroadcastChannel network mock):

```bash
npm run dev
```

Open multiple browser tabs at the URL shown (default: `http://localhost:5173`) to simulate multiplayer on the same machine.

Run the full Electron app (real mDNS + UDP networking):

```bash
npm start
```

Build for production (Electron packaging):

```bash
npm run package
```

Useful scripts (from `package.json`):

- `npm run dev` — Vite renderer development server
- `npm start` — Start Electron (renderer + main process)
- `npm run package` — Package the app with `electron-forge`
- `npm run build` — Build the Vite renderer bundle
- `npm run lint` — Run ESLint

## Development Notes

- Vite-only mode uses a mock bridge that leverages the BroadcastChannel API to simulate UDP broadcasts between tabs on the same origin. This is ideal for UI and flow testing but not for cross-device networking.
- For cross-device LAN testing you must run the Electron build which uses mDNS (UDP 5353) for discovery and a game UDP port (default used in repo). On Linux, enable `avahi-daemon`:

```bash
sudo systemctl enable --now avahi-daemon
```

If you run a firewall (e.g. `ufw`), allow the mDNS and game ports:

```bash
sudo ufw allow 5353/udp
sudo ufw allow 41234/udp
```

Troubleshooting tips:

- Ensure devices are on the same network (no AP/Client isolation on the router).
- Disable VPNs or virtual adapters (Docker, VMware) if discovery fails.
- Use the direct IP join option in the Discovery page if mDNS discovery fails.

## Project Structure (high level)

- `src/` — application source
  - `main_window/` — Electron main window static entry
  - `preload.ts` — preload script that exposes safe IPC/networking hooks
  - `renderer.tsx`, `main.ts`, `App.tsx` — renderer entrypoints and root app
  - `components/` — UI components (multiplayer, powerups, progression, etc.)
  - `pages/` — route pages (MultiplayerLobbyPage, MultiplayerDiscoveryPage, QuestionPage, etc.)
  - `store/` — Zustand stores for game, multiplayer and player state
  - `utils/` — utility modules and helpers

See the `src/pages` and `src/components/multiplayer` folders for the multiplayer flow implementation.

## Tests

There are some development test scripts under `tests/` (e.g. `achievementTester.ts`). There is no automated test runner configured by default; add CI/tests as needed.

## Contributing

Contributions are welcome. Please open issues for bugs or feature requests and submit PRs against `main`.

Suggested process:

1. Fork the repo and create a feature branch
2. Run `npm install` and verify `npm run dev` works
3. Add tests where appropriate and keep changes focused
4. Open a PR with a clear description and testing steps

## Notes & Further Reading

- Multiplayer design docs and testing notes: see `MULTIPLAYER.md`, `MULTIPLAYER_DEBUG_ANALYSIS.md`, and `VITE_MULTIPLAYER_TESTING.md` in the repo root.

## License

No license is specified in this repository. Add a `LICENSE` file to set project licensing (e.g., MIT, Apache-2.0).

---

If you want, I can also:

- add a short badge header (build, license, coverage)
- generate a `CONTRIBUTING.md` and `SECURITY.md`
- add a basic `LICENSE` file (MIT)

Let me know which of these you'd like me to do next.
