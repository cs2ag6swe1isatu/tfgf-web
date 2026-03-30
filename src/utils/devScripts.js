// utitlity dev scripts for themed pixel animations
// use in dev tool console

/**
 * Generates a pixelated circle clip-path for CSS animations.
 * @param {number} gridSteps - The number of steps in the grid (default 16)
 * @returns {string} - The CSS clip-path value
 */
function generatePixelCircleClipPath(gridSteps = 16) {
  // gridSteps = 16 means 100% / 16 = 6.25% step size
  // gridSteps = 8 means 12.5% step size (chunkier)
  const step = 100 / gridSteps;
  const points = [];

  for (let i = 0; i <= 360; i += 0.5) {
    const rad = (i * Math.PI) / 180;
    let x = 50 + 50 * Math.cos(rad);
    let y = 50 + 50 * Math.sin(rad);
    x = Math.round(x / step) * step;
    y = Math.round(y / step) * step;
    const lastPoint = points[points.length - 1];
    if (!lastPoint || lastPoint.x !== x || lastPoint.y !== y) {
      points.push({ x, y });
    }
  }
  const polygonString = points.map(p => `${p.x.toFixed(2)}% ${p.y.toFixed(2)}%`).join(', ');
  return `polygon(${polygonString})`;
}

// Example: Generate a high-res retro circle (16 steps)
console.log(generatePixelCircleClipPath(16));

/**
 * Calculates the nearest duration (ms) and step count 
 * to match a target FPS (defaults to 24).
 * 
 * @param {number} baseMs - The approximate duration you want (e.g., 400)
 * @param {number} targetFps - The frame rate target (default 24)
 * @returns {object} - { duration: number, steps: number, actualFps: number }
 */
function getRetroAnimationTiming(baseMs, targetFps = 24) {
  const msPerFrame = 1000 / targetFps;
  const rawSteps = baseMs / msPerFrame;
  
  // 2. Round to the nearest integer for CSS compatibility
  const steps = Math.round(rawSteps);
  const duration = Math.round(steps * msPerFrame);

  return {
    duration: duration,
    steps: steps,
    actualFps: (1000 / (duration / steps)).toFixed(2) 
  };
}

// Examples
console.log(getRetroAnimationTiming(400)); 
// Output: { duration: 375, steps: 9, actualFps: '24.00' }
// Use: animation: pixel-ripple 375ms steps(9) forwards;

console.log(getRetroAnimationTiming(333.33)); 
// Output: { duration: 333, steps: 8, actualFps: '24.02' } (Close enough!)