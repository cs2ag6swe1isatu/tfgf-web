# Multiplayer Robustness Analysis — Root Causes & Fixes

## Summary of Issues

1. **Critical packet failures with "answer submission failed after 5 attempts"**
2. **Host-silence timeouts occur**
3. **Players show 0 correct/0 accuracy but have non-zero score and XP**

---

## Root Cause 1: Missing ACK for Answer-Submission with Mismatched Lobby ID

**Location**: [src/preload.ts](src/preload.ts#L650-L656)

**Problem**:
```typescript
if (packet.type === "answer-submission") {
  if (packet.payload.lobbyId !== activeSnapshot.lobbyId) return;  // ← NO ACK SENT!
  console.log('[preload] answer-submission from player', ...);
  onAnswerSubmissionCbs.forEach((cb) => cb(packet.payload));
  return;
}
```

When a client sends an answer-submission packet and the host's `activeSnapshot.lobbyId` doesn't match:
- The host returns early WITHOUT sending an ACK
- The client never receives the ACK and retries 5 times (3 seconds of retries)
- After 5 attempts fail, the error is logged but answer is lost

This can happen when:
- Host restarted/reset the lobby state but client still thinks it's in the old lobby
- Clock skew causes timestamp mismatches
- State synchronization lag

**Fix Required**: Send ACK for answer-submission packets even if lobbyId doesn't match (similar to how duplicates are handled).

---

## Root Cause 2: Race Condition Between Answer Storage & Scoring

**Location**: [src/store/triviaStore.ts](src/store/triviaStore.ts#L536-L556)

**Problem**:
The host flow is:
1. Phase changes to `scoring`
2. `scoreCurrentQuestion()` is called → calculates scores from `playerAnswers` at CURRENT snapshot
3. `finalizeRankings()` is called → calculates accuracy from SAME `playerAnswers` snapshot
4. `broadcastMultiplayerState()` sends results to clients

However, answer-submission packets can arrive AFTER step 2 but the callback hasn't been processed yet. If the callback is asynchronous or delayed (e.g., by event queue), the answer won't be in `playerAnswers` when `scoreCurrentQuestion()` runs.

**Scenario**:
- Client A sends answer → packet in flight
- Host timer ticks → phase becomes `scoring` → `scoreCurrentQuestion()` runs WITHOUT answer
- 50ms later → answer-submission packet finally arrives → callback tries to store answer
- But `finalizeRankings()` already ran, accuracy calculated with 0 answers
- Score might still be non-zero from OTHER questions answered

**Why this causes "0 correct but non-zero XP"**:
- Host computes score for questions with received answers → non-zero `playerScores[playerId]`
- Host computes accuracy with partial answers (missing some) → low accuracy or 0%
- XP calculated from `score` + `streak` + `rank` → still has non-zero value

---

## Root Cause 3: Client Answer Selection Not Persisted

**Location**: [src/pages/QuestionPage.tsx](src/pages/QuestionPage.tsx#L350-L380) + [src/store/triviaStore.ts](src/store/triviaStore.ts#L340-L360)

**Problem**:
Clients may not actually store their selected answer locally due to:
1. UI event not firing before phase change
2. Answer selection callback debounced/throttled but phase changes immediately
3. Network lag causing client to believe phase changed before submitting

When displaying results:
- Client shows accuracy = `correctCount / totalQuestions`
- But `correctCount` from `userAnswers` which might be empty if client never selected answers locally
- Host has `playerAnswers` from received packets (if they arrived) but client has empty `userAnswers`

---

## Root Cause 4: Host Authority Doesn't Wait for All Answers

**Location**: [src/pages/QuestionPage.tsx](src/pages/QuestionPage.tsx#L390-L402)

**Problem**:
```typescript
useEffect(() => {
  if (mode !== "multiplayer" || lobbyRole !== "host" || phase !== "answering") return;
  const activePlayers = players.filter((player) => player.connectionState !== "disconnected");
  if (activePlayers.length === 0) return;
  const state = useTriviaStore.getState();
  const everyoneAnswered = activePlayers.every((player) => {
    if (player.isHost) return Boolean(state.selectedAnswer);
    const answers = state.playerAnswers[player.id];
    return Boolean(answers && answers[state.currentIndex]);
  });
  if (!everyoneAnswered) return;
  useTriviaStore.setState({ phase: "scoring", timer: 3 });
  broadcastMultiplayerState();
}, [...]); 
```

This waits for ALL players to submit answers before scoring. BUT:
- If a packet is delayed, the check `answers && answers[state.currentIndex]` might fail
- Even though the answer is in flight, the host thinks the player hasn't answered
- Host waits indefinitely (until timer expires in answering phase)
- Timer expiry causes phase change to scoring WITHOUT some answers

When timer expires:
- Host moves to scoring phase regardless of whether all answers arrived
- Some players' answers still in flight
- Those answers eventually arrive but scoring already happened with incomplete data

---

## Root Cause 5: No Answer Reconciliation After Score Computation

**Location**: [src/store/triviaStore.ts](src/store/triviaStore.ts#L536-L575)

**Problem**:
The scoring flow is:
1. `scoreCurrentQuestion()` → score based on current `playerAnswers`
2. `finalizeRankings()` → accuracy/stats based on SAME `playerAnswers`
3. If answer arrives after step 1 but before step 2, only accuracy is affected
4. If answer arrives after step 2, score is locked in and accuracy can't be recalculated

**No re-scoring happens** even if new answers arrive during the scoring phase. This can cause:
- Score locked in based on incomplete answer set
- Accuracy calculated from same incomplete set
- If accuracy=0 (no answers at time of calculation) but score>0 (previous questions), results show 0 accuracy but non-zero score

---

## Recommended Fixes (In Order of Priority)

### Priority 1: Fix ACK for Mismatched Lobby ID
Send ACK unconditionally for critical packets, even if validation fails.

### Priority 2: Add Synchronization Barrier
When phase changes to "scoring", ensure ALL answer-submission ACKs have been processed before calling `scoreCurrentQuestion()`.

### Priority 3: Answer Reconciliation
After `finalizeRankings()`, if new answers arrive during scoring phase, recompute accuracy (not score, which is locked in).

### Priority 4: Client-Side Answer Persistence
Ensure `userAnswers` is always populated when answer is submitted to host, not just when selected locally.

### Priority 5: Timeout Fallback
If all players don't answer within `answerTimer`, immediately transition to scoring instead of waiting indefinitely.

---

## Testing Strategy

1. **Unit tests**: Test `applyRoundScores` and `finalizeRankings` with incomplete answer sets
2. **Integration tests**: Simulate packet drops (specific answer submissions) and verify rankings
3. **Network simulation**: Use `tc` (traffic control) to introduce latency/jitter on test network
4. **Stress test**: 4-player game with deliberate answer submission delays via mock bridge
