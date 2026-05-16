## Fix 11 — TO NEXT LEVEL and XP bar corrected on Solo result screen
**File:** src/pages/SessionSummaryPage.tsx
**What was wrong:** "TO NEXT LEVEL" showed raw totalXp / player.xpToNextLevel (e.g. 20469 / 511) instead of XP progress within current level. Also used wrong fraction for the label.
**What was changed:** Added `getXpIntoLevel` import and `xpIntoCurrentLevel` local variable. `"TO NEXT LEVEL"` label now shows: `{xpIntoCurrentLevel} / 1000 TO NEXT LEVEL`. XP bar `rankProg` already uses `getLevelProgressPercent(playerTotalXp)` which correctly computes `(totalXP % 1000) / 1000 * 100` — no change needed there.
**Fields affected:** xpIntoCurrentLevel, "TO NEXT LEVEL" text

## Fix 10 — Solo result screen rank panel unified and tightened
**File:** src/pages/SessionSummaryPage.tsx
**What was wrong:** Rank progress panel had a vertical divider line that visually separated the LEVEL and rank sections, making them appear as disconnected floating elements rather than a single cohesive panel.
**What was changed:** Removed the vertical divider line. Reduced gap between left (LEVEL) and right (rank info) sections. Tightened overall padding, font sizes, and element gaps so all rank/progress content sits together in one unified container matching the mockup. Reduced RankIcon size, font sizes, and progress bar height proportionally.
**Fields affected:** UI only — no logic changes

## Fix 9 — Solo result screen redesigned to match mockup
**File:** src/pages/SessionSummaryPage.tsx
**What was changed:** Layout and styling updated to match provided mockup — "GAME OVER !" red heading centered, 2×2 stat grid with dashed cyan borders (YOUR SCORE, XP GAINED, ACCURACY with X/15 CORRECT, AVG TIME with PER QUESTION), rank progress panel (dark background, left-aligned with LEVEL + number on left, CURRENT RANK purple badge + rank name + cyan XP progress bar + "X / Y TO NEXT LEVEL" on right), two full-width side-by-side buttons (MAIN MENU and VIEW PROFILE, both cyan outline). Removed: animated scanline overlay, vignette, radial gradient background, glowing stat animations, star icon, percentage display on rank bar, non-cyan button backgrounds.
**Fields affected:** UI only — no logic changes

## Fix 8 — Profile stats rounded to whole numbers
**File:** src/pages/ProfilePage.tsx (buildProfileStatsView + displayedTopScore)
**What was wrong:** Total Score and per-difficulty scores accumulated `playData.scoreGained` (float values from `calculateScore()`) without rounding, causing decimals like 5661.333333333333 to display. Top Score also could inherit floats from `sessionInput.score`.
**What was changed:**
- Added `Math.round(view.score)` after all aggregation in `buildProfileStatsView`
- Added `Math.round(summary.score)` per difficulty after aggregation
- Wrapped `displayedTopScore` computation in `Math.round()`
**Fields affected:** totalScore, topScore, score per difficulty
**Coverage:** ALL, SOLO, and MULTI tabs (all use the same `buildProfileStatsView` function)

# Multiplayer Sync Fixes
_Incremental changelog — one entry per confirmed fix._

## Fix 7 — Live effects applied in Multiplayer mode
**File:** src/pages/QuestionPage.tsx (handleAnswerClick)
**What was done:** Removed early return that skipped all reward effects in multiplayer mode. Score popup, XP popup, streak banner, floating micro text, XP bar animation, and level-up modal now trigger on every correct answer in multiplayer, exactly as in solo mode.
**Effects added:** score popup / XP popup / streak banner / floating micro text / XP bar animate / level-up modal

## Fix 6 — Base score increased from 10 to 30
**File:** src/utils/progression.ts (line 26)
**What was wrong:** Base score of 10 allowed speed to outweigh accuracy (9 correct at 1.5s avg beat 12 correct at 3s avg)
**What was changed:** Base score updated from 10 to 30 so correct answers carry significantly more weight than speed bonus. Comment updated to reflect new max ranges (Easy=50, Medium=75, Hard=100).
**Fields affected:** score

## Fix 1 — Non-local players show wrong XP on host leaderboard
**File:** src/pages/MultiplayerResults.tsx (line 132)
**What was wrong:** `buildPlayerResults()` used `entry.score` (raw game score, e.g., ~156) as XP for non-local players, causing the host leaderboard to display client's game score instead of calculated XP (~366).
**What was changed:**
- Added `xp: number` to `PlayerRanking` interface (triviaStore.ts)
- Added `calculateMultiplayerXP` import to triviaStore.ts
- Modified `finalizeRankings()` to compute per-player XP using each player's score, maxStreak (computed from answer history), and rank, then include `xp` in the ranking entry
- Added `xp?: number` to `MultiplayerGameState` ranking type (multiplayer.ts)
- Updated `handleGameStateSync` in QuestionPage.tsx to map `xp` from network payload
- Added `xp?: number` to `RankingEntry` interface (MultiplayerResults.tsx)
- Changed line 132 from `entry.score` to `(entry.xp ?? entry.score)` for non-local players
**Fields affected:** XP

## Fix 2 — XP fallback to score for non-local players (fully resolved)
**File:** src/pages/MultiplayerResults.tsx (line 133)
**What was wrong:** The fallback `entry.xp ?? entry.score` still meant if `xp` was somehow undefined, `entry.score` (raw game points) would be used as XP — semantically wrong.
**What was changed:** Changed to `entry.xp ?? 0` for ALL players. `finalizeRankings` already computes per-player XP via `calculateMultiplayerXP` and broadcasts it through the rankings payload. `getLastXpGained()` was also removed from the local player path, ensuring consistent XP display for all players from the single source of truth (`entry.xp`).
**Fields affected:** XP

## Fix 3 — Accuracy uses answered count instead of total questions
**File:** src/store/triviaStore.ts (line 589) + src/pages/MultiplayerResults.tsx (lines 119-120, 131)
**What was wrong:** Accuracy was calculated as `correctCount / questionsAnswered * 100` (per-player answered subset) instead of `correctCount / totalQuestions * 100`. This inflated accuracy for players who didn't answer all questions, e.g. 8/13=62% vs correct 8/15=53%.
**What was changed:** Changed both `finalizeRankings` and `buildPlayerResults` to divide by `questions.length` (the full question count) for all players. Removed unused `qAnswered` variable from `buildPlayerResults`.
**Fields affected:** accuracy

## Fix 4 — Host score double-counted per correct answer
**File:** src/rules/scoringRules.ts (applyRoundScores)
**What was wrong:** `applyRoundScores` scored the host twice per correct answer: once via the explicit `hostAnswer === correctAnswer` branch, and again by iterating `playerAnswers` (which includes the host's own answer entry under their playerId). This inflated the host's cumulative score beyond the theoretical max (e.g. 344 for 8 correct answers when max is 8×40=320).
**What was changed:** Added `if (playerId === hostPlayerId) return;` guard in the `playerAnswers` forEach loop, so the host is only scored through the explicit host branch.
**Fields affected:** score

## Fix 5 — Race condition analysis (no change needed)
**File:** src/pages/QuestionPage.tsx
**What was examined:** The host broadcast sequence (phase → scoring → `scoreCurrentQuestion()` → `finalizeRankings()` → `broadcastMultiplayerState()`) and client sync handler.
**Finding:** The host's state updates (playerScores, then rankings) are enqueued synchronously within the same useEffect. A secondary broadcast effect fires after each render, sending intermediate states to clients. However, the client's `handleGameStateSync` fully overwrites its store on each packet, and the client only navigates to MultiplayerResults after `phase === "end"`, by which time the definitive rankings are in the store. No data race — final displayed state is deterministic.
**Fields affected:** N/A
