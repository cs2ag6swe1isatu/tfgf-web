/**
 * Dev Skip to Final Question - Dev cheat for testing multiplayer final question
 *
 * Usage in console (host instance):
 *   devSkipToFinal.run()                              // Skip to final question (default 15 questions)
 *   devSkipToFinal.run({ questionLimit: 5 })         // Skip to final question of 5-question game
 *   devSkipToFinal.attach()                           // Attach to window.multiplayer.devSkipToFinalQuestion
 *   window.multiplayer.devSkipToFinalQuestion()       // If attached, skip from multiplayer bridge
 *   devSkipToFinal.isAttached()                       // Check if attached
 */

import { useTriviaStore } from '../store';

let _attached = false;

function isAttached(): boolean {
  return _attached;
}

function runDevSkipToFinal(opts?: any): boolean {
  if (typeof window === 'undefined') return false;
  const bridge = (window as any).multiplayer;
  if (!bridge) {
    console.warn('[devSkip] multiplayer bridge not available');
    return false;
  }
  if (typeof bridge.broadcastGameState !== 'function') {
    console.warn('[devSkip] broadcastGameState not available on multiplayer bridge');
    return false;
  }

  const qLimit = opts?.questionLimit ?? 15;
  const finalIndex = Math.max(0, qLimit - 1);
  const payload = {
    phase: opts?.phase ?? 'asking',
    timer: opts?.timer ?? (opts?.questionTimer ?? 25),
    currentIndex: finalIndex,
    seed: opts?.seed,
    category: opts?.category,
    difficulty: opts?.difficulty,
    questionLimit: qLimit,
    questionTimer: opts?.questionTimer ?? 25,
    answerTimer: opts?.answerTimer ?? 15,
    playerScores: opts?.playerScores ?? {},
    rankings: opts?.rankings ?? [],
  };

  // Update host's local trivia store so state persists and broadcasts continue with the new index
  useTriviaStore.setState({
    currentIndex: finalIndex,
    phase: payload.phase,
    timer: payload.timer,
    questionLimit: qLimit,
  });

  bridge.broadcastGameState(payload);
  console.log('[devSkip] updated trivia store and broadcasted final-question game-state', payload);
  return true;
}

function attachDevSkipToFinal(): void {
  if (typeof window === 'undefined') return;
  const bridge = (window as any).multiplayer;
  if (!bridge) return;

  if (typeof bridge.devSkipToFinalQuestion === 'function') {
    _attached = true;
    console.log('[devSkip] already attached on window.multiplayer');
    return;
  }

  bridge.devSkipToFinalQuestion = (opts?: any) => runDevSkipToFinal(opts);
  _attached = true;
  console.log('[devSkip] attached devSkipToFinalQuestion to window.multiplayer');
}

// Expose to window for console access, matching xpMultiplierTester style
if (typeof window !== 'undefined') {
  (window as any).devSkipToFinal = {
    run: runDevSkipToFinal,
    attach: attachDevSkipToFinal,
    isAttached,
  };

  // Auto-attach if multiplayer bridge already present
  try {
    attachDevSkipToFinal();
  } catch (err) {
    // ignore
  }
}

export { attachDevSkipToFinal, runDevSkipToFinal, isAttached };
export default runDevSkipToFinal;
