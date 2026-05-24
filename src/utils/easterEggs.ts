export type EasterEggId = "konami" | "dota2" | "counterstrike" | "sanandreas" | "plantsvzombies" | "jojo";

export interface EasterEggDefinition {
  id: EasterEggId;
  name: string;
  description: string;
  sequence: string[];
  accent: string;
  glow: string;
  durationMs: number;
  overlayLabel: string;
}

export const EASTER_EGG_DEFINITIONS: EasterEggDefinition[] = [
  {
    id: "konami",
    name: "Konami Code",
    description: "Up, up, down, down, left, right, left, right, B, A.",
    sequence: ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "B", "A"],
    accent: "#35E52B",
    glow: "rgba(53, 229, 43, 0.35)",
    durationMs: 22000,
    overlayLabel: "CHEAT CODE ACCEPTED",
  },
  {
    id: "dota2",
    name: "Dota 2",
    description: "A cybercafe-era battleground for the PC shop generation.",
    sequence: ["R", "O", "S", "H", "A", "N"],
    accent: "#FF7A18",
    glow: "rgba(255, 122, 24, 0.34)",
    durationMs: 18000,
    overlayLabel: "MID LANE ONLINE",
  },
  {
    id: "counterstrike",
    name: "Counter-Strike",
    description: "A LAN-cafe staple from the headshot and buy-phase years.",
    sequence: ["R", "U", "S", "H", "B"],
    accent: "#F4C542",
    glow: "rgba(244, 197, 66, 0.3)",
    durationMs: 16000,
    overlayLabel: "BUY PHASE STARTING",
  },
  {
    id: "sanandreas",
    name: "San Andreas",
    description: "The PS2 and computer-shop open-world era in one code.",
    sequence: ["G", "R", "O", "V", "E", "S", "T", "R", "E", "E", "T"],
    accent: "#35E52B",
    glow: "rgba(53, 229, 43, 0.28)",
    durationMs: 20000,
    overlayLabel: "ALL WE HAD TO DO",
  },
  {
    id: "plantsvzombies",
    name: "Plants vs. Zombies",
    description: "A lighter home-friendly classic for after-school downtime.",
    sequence: ["F", "L", "O", "W", "E", "R", "S"],
    accent: "#79E75F",
    glow: "rgba(121, 231, 95, 0.28)",
    durationMs: 14000,
    overlayLabel: "SUNFLOWER DEPLOYED",
  },
  {
    id: "jojo",
    name: "JoJo's Bizarre Adventure",
    description: "A dramatic meme reference for when the room gets strangely stylish.",
    sequence: ["O", "R", "A", "O", "R", "A"],
    accent: "#FF4FD8",
    glow: "rgba(255, 79, 216, 0.32)",
    durationMs: 17000,
    overlayLabel: "ORA ORA ORA",
  },
];

export const SPLASH_TEXTS = [
  "also try: minecraft",
  "press start",
  "the cake is a lie",
  "do a barrel roll",
  "gotta go fast",
  "it's dangerous to go alone",
  "up up down down",
  "one more run",
  "secret buttons taste best",
  "look behind the title",
  "something is blinking",
  "roshan never sleeps",
  "rush b",
  "the grove still remembers",
  "flowers and undead",
  "bizarre reference",
  "the world",
];

export const EASTER_HUNTER_ACHIEVEMENT_ID = "easter_hunter";

export function normalizeEggKey(key: string): string {
  if (key === " ") return "Space";
  if (key === "Spacebar") return "Space";
  if (key.length === 1) return key.toUpperCase();
  return key;
}

export function createEggMatcher(definitions: EasterEggDefinition[] = EASTER_EGG_DEFINITIONS) {
  const maxLength = Math.max(...definitions.map((definition) => definition.sequence.length));

  const matchesSequence = (buffer: string[], sequence: string[]) =>
    buffer.length >= sequence.length && sequence.every((entry, index) => buffer[buffer.length - sequence.length + index] === entry);

  return {
    push(buffer: string[], key: string): { buffer: string[]; match: EasterEggDefinition | null } {
      const nextBuffer = [...buffer, normalizeEggKey(key)].slice(-maxLength);
      const match = definitions.find((definition) => matchesSequence(nextBuffer, definition.sequence)) ?? null;
      return { buffer: nextBuffer, match };
    },
  };
}

export function buildBadgeIconDataUri(title: string, accent = "#35E52B", glow = "#00DFFF"): string {
  const safeTitle = title.slice(0, 2).toUpperCase();
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
      <defs>
        <radialGradient id="g" cx="50%" cy="36%" r="72%">
          <stop offset="0%" stop-color="${glow}" stop-opacity="1" />
          <stop offset="100%" stop-color="${accent}" stop-opacity="1" />
        </radialGradient>
      </defs>
      <rect width="128" height="128" rx="24" fill="#06131a" />
      <circle cx="64" cy="64" r="44" fill="url(#g)" opacity="0.95" />
      <circle cx="64" cy="64" r="50" fill="none" stroke="${glow}" stroke-width="4" opacity="0.75" />
      <path d="M64 22 L74 50 L104 50 L80 68 L89 98 L64 80 L39 98 L48 68 L24 50 L54 50 Z" fill="rgba(255,255,255,0.12)" />
      <text x="64" y="76" text-anchor="middle" font-family="monospace" font-size="36" font-weight="700" fill="#06131a">${safeTitle}</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg.trim())}`;
}
