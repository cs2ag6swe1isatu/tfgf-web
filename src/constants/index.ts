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

export const DIFFICULTIES = [
    "easy", 
    "medium", 
    "hard"
] as const;
export type Difficulty = typeof DIFFICULTIES[number];

export const MODES = [
    "solo", 
    "multiplayer"
] as const;
export type Mode = typeof MODES[number];

export const RANKS = [
    {
    name: "Novice",
    icon: `[todo]`,
    minLevel: 1,
    maxLevel: 10
    },
    {
    name: "Student",
    icon: `[todo]`,
    minLevel: 11,
    maxLevel: 20
    },
    {
    name: "Scholar",
    icon: `[todo]`,
    minLevel: 21,
    maxLevel: 30
    },
    {
    name: "Professor",
    icon: `[todo]`,
    minLevel: 31,
    maxLevel: 40
    },
    {
    name: "Expert",
    icon: `[todo]`,
    minLevel: 41,
    maxLevel: 50
    },
    {
    name: "Specialist",
    icon: `[todo]`,
    minLevel: 51,
    maxLevel: 60
    },
    {
    name: "Genius",
    icon: `[todo]`,
    minLevel: 61,
    maxLevel: 70
    },
    {
    name: "Brainiac",
    icon: `[todo]`,
    minLevel: 71,
    maxLevel: 80
    },
    {
    name: "Sage",
    icon: `[todo]`,
    minLevel: 81,
    maxLevel: 90
    },
    {
    name: "Oracle",
    icon: `[todo]`,
    minLevel: 91,
    maxLevel: 100
    }
] as const;
export interface Rank {
    name: string;
    icon: string;
    minLevel: number;
    maxLevel: number;
}
export const getRankForLevel = (level: number): Rank => {
    return RANKS.find(rank => level >= rank.minLevel && level <= rank.maxLevel) || RANKS[0];
}