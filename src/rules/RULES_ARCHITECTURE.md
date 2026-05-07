# Rules Architecture

This directory contains runtime game rules used during a match.

## Goal

Keep rule logic organized by domain so gameplay behavior, progression behavior, and config values are easy to find and change.

## Directory Responsibilities

- `src/config/`
  - Tunable values and defaults only.
  - Example: points-per-correct (`baseScore`) in `gameConfig.ts`.
- `src/rules/`
  - Runtime gameplay rules.
  - Pure functions preferred.
  - Example: scoring per answer and per round (`scoringRules.ts`).
- `src/progression/`
  - Post-session progression rules and profile advancement.
  - Example: XP/level (`progressionRules.ts`) and achievements (`achievementRules.ts`).

## Naming Convention

- `<domain>Rules.ts` for each rules module.
- Keep modules focused and composable.
- Export all public rule APIs from `src/rules/index.ts`.

## Should `progression/` move into `rules/`?

Short answer: not yet.

Reasoning:
- `progression/` currently models profile/meta progression, which is a separate concept from in-match gameplay rules.
- Keeping it separate preserves locality and avoids mixing session runtime logic with account progression logic.
- Current separation is:
  - `rules/` = during match
  - `progression/` = after match

## When a move might make sense

Consider moving only if you intentionally adopt a top-level taxonomy like:

- `src/rules/gameplay/*`
- `src/rules/progression/*`

If you do this later, migrate in one pass and keep compatibility via re-export shims to avoid noisy import churn.
