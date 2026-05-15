/**
 * XP Multiplier Tester - Dev cheat for testing ranks and levels
 * 
 * Usage in console:
 *   xpMultiplier.set(10)     // 10x XP multiplier
 *   xpMultiplier.set(1)      // Reset to normal (1x)
 *   xpMultiplier.get()       // Check current multiplier
 *   xpMultiplier.reset()     // Reset to 1x
 */

let _currentMultiplier = 1;

export function getXpMultiplier(): number {
  return _currentMultiplier;
}

export function setXpMultiplier(multiplier: number): void {
  if (typeof multiplier !== "number" || multiplier < 0 || !Number.isFinite(multiplier)) {
    console.error(`Invalid XP multiplier: ${multiplier}. Must be a finite number >= 0.`);
    return;
  }
  _currentMultiplier = multiplier;
  const label = multiplier === 0 ? "0 (XP disabled)" : multiplier === 1 ? "1 (normal)" : `${multiplier}x`;
  console.log(`⚡ XP multiplier set to ${label}`);
}

export function resetXpMultiplier(): void {
  _currentMultiplier = 1;
  console.log("⚡ XP multiplier reset to 1 (normal)");
}


// Expose to window for console access
if (typeof window !== "undefined") {
  (window as any).xpMultiplier = {
    set: setXpMultiplier,
    get: getXpMultiplier,
    reset: resetXpMultiplier,
  };
}