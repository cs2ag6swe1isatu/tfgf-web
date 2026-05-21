import type { MultiplayerGameState } from "../types/multiplayer";
import type { TriviaState } from "../store";

export function shapeGameStateForBroadcast(state: TriviaState, extras?: Partial<MultiplayerGameState>): MultiplayerGameState {
  return {
    phase: state.phase,
    timer: state.timer,
    currentIndex: state.currentIndex,
    seed: (state as any).seed,
    category: state.category ?? undefined,
    difficulty: state.difficulty ?? undefined,
    questionLimit: state.questionLimit,
    questionTimer: state.questionTimer,
    answerTimer: state.answerTimer,
    playerScores: state.playerScores,
    playerAnswers: state.playerAnswers,
    rankings: state.rankings,
    // include freezeUntil when present on store
    ...( (state as any).freezeUntil !== undefined ? { freezeUntil: (state as any).freezeUntil } : {} ),
    ...extras,
  } as MultiplayerGameState;
}

export function mapGameStatePayloadToTriviaState(payload: MultiplayerGameState) {
  const mapped: Partial<TriviaState> = {
    phase: payload.phase,
    timer: payload.timer,
    currentIndex: payload.currentIndex,
    ...(payload.seed !== undefined ? { seed: payload.seed } : {}),
    ...(payload.category !== undefined ? { category: payload.category ?? undefined } : {}),
    ...(payload.difficulty !== undefined ? { difficulty: payload.difficulty ?? undefined } : {}),
    ...(payload.questionLimit !== undefined ? { questionLimit: payload.questionLimit } : {}),
    ...(payload.questionTimer !== undefined ? { questionTimer: payload.questionTimer } : {}),
    ...(payload.answerTimer !== undefined ? { answerTimer: payload.answerTimer } : {}),
    ...(payload.playerScores !== undefined ? { playerScores: payload.playerScores } : {}),
    ...(payload.playerAnswers !== undefined ? { playerAnswers: payload.playerAnswers } : {}),
    ...(payload.rankings !== undefined ? { rankings: payload.rankings.map((r) => ({ ...r, xp: r.xp ?? 0 })) } : {}),
    ...(payload.freezeUntil !== undefined ? { freezeUntil: payload.freezeUntil as unknown as number } : {}),
  };
  return mapped;
}

export default {
  shapeGameStateForBroadcast,
  mapGameStatePayloadToTriviaState,
};
