import { useState, useEffect, useCallback } from 'react';
import { useSoundContext } from '../context/SoundContext';
import { EmoteId, EmotePayload, EMOTE_DICTIONARY } from '../types/emotes';
import type { MultiplayerBridge } from '../types/multiplayer';
import { useMultiplayerStore } from '../store';

const EMOTE_DURATION_MS = 2500;
const COOLDOWN_MS = 2500;

export const useEmotes = (multiplayerBridge: MultiplayerBridge | undefined, localPlayerId: string) => {
  const { playSound } = useSoundContext();
  const [activeEmotes, setActiveEmotes] = useState<Record<string, EmotePayload[]>>({});
  const [isOnCooldown, setIsOnCooldown] = useState(false);
  
  // We need lobby data to route the multiplayer message
  const { lobbyId, hostAddress } = useMultiplayerStore();

  const handleEmote = useCallback((payload: EmotePayload) => {
    const emoteDef = EMOTE_DICTIONARY[payload.emoteId];
    if (emoteDef) {
      // FIX: Try the custom sound, but fallback to 'select' if it hasn't been added to SoundContext yet
      try {
        playSound(emoteDef.sound as any);
      } catch (e) {
        playSound('select' as any); 
      }
    }
    // ... rest of the function remains the same

    // Add emote to the player's visual queue
    setActiveEmotes((prev) => {
      const playerEmotes = prev[payload.playerId] || [];
      return {
        ...prev,
        [payload.playerId]: [...playerEmotes, payload],
      };
    });

    // Clean it up after the CSS animation finishes
    setTimeout(() => {
      setActiveEmotes((prev) => {
        const playerEmotes = prev[payload.playerId] || [];
        return {
          ...prev,
          [payload.playerId]: playerEmotes.filter((e) => e.uniqueId !== payload.uniqueId),
        };
      });
    }, EMOTE_DURATION_MS);
  }, [playSound]);

  // Listen for incoming remote emotes via event channel
  useEffect(() => {
    if (!multiplayerBridge) return;

    const handleRemoteEmote = (payload: EmotePayload) => {
      if (payload.playerId !== localPlayerId) handleEmote(payload);
    };

    // Prefer event channel if available
    if (multiplayerBridge.onEvent) {
      multiplayerBridge.onEvent('emote', 'EmoteSystem', handleRemoteEmote);
      return () => { multiplayerBridge.offEvent?.('emote', 'EmoteSystem'); };
    }

    // Fallback to legacy emote sync API
    multiplayerBridge.onEmoteSync?.("EmoteSystem", handleRemoteEmote);
    return () => { multiplayerBridge.offEmoteSync?.("EmoteSystem"); };
  }, [multiplayerBridge, localPlayerId, handleEmote]);

  // Send a local emote
  const sendEmote = useCallback((emoteId: EmoteId) => {
    if (isOnCooldown) return;

    const payload: EmotePayload = {
      playerId: localPlayerId,
      emoteId,
      timestamp: Date.now(),
      uniqueId: `${localPlayerId}-${Date.now()}-${Math.random()}`,
    };

    // 1. Process locally instantly
    handleEmote(payload);

    // 2. Trigger Cooldown
    setIsOnCooldown(true);
    setTimeout(() => setIsOnCooldown(false), COOLDOWN_MS);

    // 3. Broadcast to network using event channel when available
    if (multiplayerBridge && lobbyId && hostAddress) {
      const packet = { type: 'emote', payload: { lobbyId, hostAddress, ...payload } };
      if (multiplayerBridge.sendEvent) {
        multiplayerBridge.sendEvent(packet);
      } else {
        // Fallback to legacy API
        multiplayerBridge.sendEmote?.({ lobbyId, hostAddress, ...payload });
      }
    }
  }, [isOnCooldown, localPlayerId, handleEmote, multiplayerBridge, lobbyId, hostAddress]);

  return { activeEmotes, sendEmote, isOnCooldown };
};