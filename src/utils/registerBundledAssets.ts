import { AssetPreloader } from './AssetPreloader';

// Import module-bundled assets (these resolve to final served URLs
// by the bundler). We register them with AssetPreloader so they
// are RAM-cached like the public/ assets.
import idle from '../assets/bunny/idle.png';
import sleeping from '../assets/bunny/sleeping.png';
import running from '../assets/bunny/running.png';
import thinking from '../assets/bunny/thinking.png';
import panicked from '../assets/bunny/panicked.png';
import happy from '../assets/bunny/happy.png';
import sad from '../assets/bunny/sad.png';
import hyper from '../assets/bunny/hyper.png';
import confident from '../assets/bunny/confident.png';
import winner from '../assets/bunny/winner.png';

import carrotIcon from '../assets/carrot_icon.png';
import bunnyImg from '../assets/bunny.png';
import handImg from '../assets/img/hand.png';
import pointerImg from '../assets/img/pointer.png';

const BUNDLED_IMAGES: string[] = [
  idle,
  sleeping,
  running,
  thinking,
  panicked,
  happy,
  sad,
  hyper,
  confident,
  winner,
  carrotIcon,
  bunnyImg,
  handImg,
  pointerImg,
];

/**
 * Register module-imported images with the AssetPreloader.
 * Runs in background and is safe to call multiple times.
 */
export function registerBundledAssets(): Promise<void> {
  const p = AssetPreloader.getInstance();
  return p.preloadImages(BUNDLED_IMAGES).catch((err) => {
    console.warn('[Assets] registerBundledAssets failed:', err);
  });
}

export default registerBundledAssets;
