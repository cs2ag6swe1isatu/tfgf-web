export const CATEGORIES = [
    "General Knowledge",
    "Science and Technology",
    "History",
    "Geography",
    "Mathematics",
    "Language and Literature",
    "Pop Culture",
] as const;

export type Category = typeof CATEGORIES[number];

export const DIFFICULTIES = ["easy", "medium", "hard"] as const;
export type Difficulty = typeof DIFFICULTIES[number];

export const MODES = ["solo", "multiplayer"] as const;
export type Mode = typeof MODES[number];

export const PAGES = [
    "home",
    "mode-select",
    "category",
    "difficulty",
    "question",
    "result",
    "profile",
    "settings",
    "standing",
    "multiplayer-menu",
    "multiplayer-lobby",
    "multiplayer-discovery"
]
export type Page = typeof PAGES[number];