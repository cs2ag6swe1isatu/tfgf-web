/**
 * Multiplayer Bridge Manager
 * 
 * Switches between LAN (UDP) and Internet (WebSocket) play modes.
 * The default bridge (UDP) is exposed via preload.ts.
 * This manager replaces it with the WebSocket bridge when internet mode is selected.
 */

import { WebSocketMultiplayerBridge } from '../multiplayer-websocket';
import type { MultiplayerBridge } from '../types/multiplayer';

let currentMode: 'lan' | 'internet' | null = null;
let currentBridge: MultiplayerBridge | null = null;
let wsCache: WebSocketMultiplayerBridge | null = null;

export async function setMultiplayerMode(
  mode: 'lan' | 'internet' | null,
  relayUrl?: string | null
): Promise<boolean> {
  if (mode === currentMode && mode !== 'internet' && wsCache) {
    return true; // Already in the desired mode (and not internet, which requires URL validation)
  }

  console.log(`[BridgeManager] Switching to ${mode} mode${relayUrl ? ` (relay: ${relayUrl})` : ''}`);

  // Cleanup previous bridge if switching modes
  if (currentMode === 'internet' && wsCache) {
    wsCache.cleanup();
    wsCache = null;
  }

  if (mode === 'lan' || mode === null) {
    currentMode = 'lan';
    currentBridge = window.multiplayer; // Use default UDP bridge from preload
    wsCache = null;
    console.log('[BridgeManager] Using LAN (UDP) bridge');
    return true;
  }

  if (mode === 'internet' && relayUrl) {
    try {
      // Create or reuse WebSocket bridge
      if (!wsCache || (wsCache && wsCache.relayUrl !== relayUrl)) {
        // Cleanup old instance if URL changed
        if (wsCache) {
          wsCache.cleanup();
        }
        wsCache = new WebSocketMultiplayerBridge(relayUrl);
      }
      currentMode = 'internet';
      currentBridge = wsCache;
      console.log('[BridgeManager] Using Internet (WebSocket) bridge');
      return true;
    } catch (err) {
      console.error('[BridgeManager] Failed to initialize WebSocket bridge:', err);
      return false;
    }
  }

  console.warn('[BridgeManager] Invalid mode or missing relay URL');
  return false;
}

export function getCurrentBridge(): MultiplayerBridge | null {
  return currentBridge || window.multiplayer;
}

export function getCurrentMode(): 'lan' | 'internet' | null {
  return currentMode;
}

/**
 * Initialize the bridge manager with the default UDP bridge.
 * Call once on app startup.
 */
export function initBridgeManager() {
  currentMode = 'lan';
  currentBridge = window.multiplayer;
  wsCache = null;
  console.log('[BridgeManager] Initialized with LAN (UDP) bridge');
}

