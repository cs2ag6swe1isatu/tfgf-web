/**
 * AssetPreloader — a singleton service that preloads images, audio,
 * JSON data, and fonts into RAM for zero-latency access.
 *
 * ── Usage ──────────────────────────────────────────────────────
 *   const preloader = AssetPreloader.getInstance();
 *
 *   // Batch-preload critical assets
 *   await preloader.preloadImages(['/img/avatars/Boy.png', ...]);
 *   await preloader.preloadAudioBuffers(ctx, ['/sounds/hover.mp3', ...]);
 *   await preloader.preloadJSON('/data/Questions.json');
 *   await preloader.preloadFonts([{ family: 'Press Start 2P', url: '...' }]);
 *
 *   // Retrieve cached data
 *   const img = preloader.getImage('/img/avatars/Boy.png');
 *   const buf = preloader.getAudioBuffer('/sounds/hover.mp3');
 *   const json = preloader.getJSON('/data/Questions.json');
 *   preloader.getImageUrls();        // all cached image URLs
 */

type PreloadCallback = (progress: number, label: string) => void;

export class AssetPreloader {
  private static instance: AssetPreloader;

  /** RAM-cached decoded AudioBuffers, keyed by URL */
  private audioBuffers = new Map<string, AudioBuffer>();
  /** RAM-cached decoded `<img>` elements, keyed by URL */
  private images = new Map<string, HTMLImageElement>();
  /** RAM-cached JSON blobs, keyed by URL */
  private jsonCache = new Map<string, unknown>();
  /** Track loading state to avoid re-fetching */
  private loading = new Set<string>();
  /** Errors encountered per URL */
  private errors = new Map<string, string>();

  private constructor() {
    // singleton — use AssetPreloader.getInstance()
  }

  static getInstance(): AssetPreloader {
    if (!AssetPreloader.instance) {
      AssetPreloader.instance = new AssetPreloader();
    }
    return AssetPreloader.instance;
  }

  // ── Getters ──────────────────────────────────────────────────

  getImage(url: string): HTMLImageElement | undefined {
    return this.images.get(url);
  }

  getAudioBuffer(url: string): AudioBuffer | undefined {
    return this.audioBuffers.get(url);
  }

  getJSON<T = unknown>(url: string): T | undefined {
    return this.jsonCache.get(url) as T | undefined;
  }

  hasImage(url: string): boolean {
    return this.images.has(url);
  }

  hasAudioBuffer(url: string): boolean {
    return this.audioBuffers.has(url);
  }

  hasJSON(url: string): boolean {
    return this.jsonCache.has(url);
  }

  /** Returns all cached image URLs (useful for debugging) */
  getImageUrls(): string[] {
    return Array.from(this.images.keys());
  }

  /** Returns all cached audio URLs */
  getAudioUrls(): string[] {
    return Array.from(this.audioBuffers.keys());
  }

  /** Clear all caches (e.g. on logout/profile-switch) */
  clearAll(): void {
    this.audioBuffers.clear();
    this.images.clear();
    this.jsonCache.clear();
    this.loading.clear();
    this.errors.clear();
  }

  // ── Image Preloading ─────────────────────────────────────────

  /**
   * Preload an array of image URLs into RAM by creating
   * `HTMLImageElement` objects and waiting for `onload`.
   *
   * Images are fully-decoded pixel data in memory — zero fetch time
   * when later assigned to an `<img>` or `<canvas>`.
   */
  async preloadImages(
    urls: string[],
    onProgress?: PreloadCallback,
  ): Promise<void> {
    const unique = urls.filter((u) => !this.images.has(u) && !this.loading.has(u));
    if (unique.length === 0) return;

    unique.forEach((u) => this.loading.add(u));

    let completed = 0;
    const total = unique.length;

    await Promise.allSettled(
      unique.map((url) => this.preloadSingleImage(url)),
    );

    // Mark complete
    for (const url of unique) {
      this.loading.delete(url);
      completed++;
      onProgress?.(Math.round((completed / total) * 100), `Images: ${completed}/${total}`);
    }
  }

  private preloadSingleImage(url: string): Promise<void> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        this.images.set(url, img);
        resolve();
      };
      img.onerror = () => {
        this.errors.set(url, `Failed to load image: ${url}`);
        resolve(); // don't reject — fail gracefully
      };
      // Setting src triggers the browser to decode the image into GPU/RAM
      img.src = url;
    });
  }

  // ── Audio Preloading (Web Audio API) ─────────────────────────

  /**
   * Preload audio files and decode them into `AudioBuffer`s via the
   * Web Audio API. AudioBuffers live in RAM and can be replayed
   * zero-latency by creating `BufferSource` nodes.
   *
   * @param ctx  An AudioContext (must be resumed by user gesture first)
   * @param urls Remote URLs of audio files to preload
   */
  async preloadAudioBuffers(
    ctx: AudioContext,
    urls: string[],
    onProgress?: PreloadCallback,
  ): Promise<void> {
    const unique = urls.filter(
      (u) => !this.audioBuffers.has(u) && !this.loading.has(u),
    );
    if (unique.length === 0) return;

    unique.forEach((u) => this.loading.add(u));

    let completed = 0;
    const total = unique.length;

    await Promise.allSettled(
      unique.map(async (url) => {
        try {
          const response = await fetch(url);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const arrayBuffer = await response.arrayBuffer();
          const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
          this.audioBuffers.set(url, audioBuffer);
        } catch (err) {
          this.errors.set(url, `Failed to preload audio: ${url} — ${err}`);
        } finally {
          this.loading.delete(url);
          completed++;
          onProgress?.(Math.round((completed / total) * 100), `Audio: ${completed}/${total}`);
        }
      }),
    );
  }

  // ── JSON Preloading ──────────────────────────────────────────

  /**
   * Fetch a JSON file and cache it in RAM.
   * Subsequent calls return immediately.
   */
  async preloadJSON<T = unknown>(
    url: string,
    onProgress?: PreloadCallback,
  ): Promise<T | undefined> {
    if (this.jsonCache.has(url)) return this.jsonCache.get(url) as T;
    if (this.loading.has(url)) {
      // Poll until the existing load finishes
      return new Promise<T | undefined>((resolve) => {
        const check = setInterval(() => {
          if (this.jsonCache.has(url)) {
            clearInterval(check);
            resolve(this.jsonCache.get(url) as T);
          }
          if (this.errors.has(url)) {
            clearInterval(check);
            resolve(undefined);
          }
        }, 50);
      });
    }

    this.loading.add(url);
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data: T = await response.json();
      this.jsonCache.set(url, data);
      onProgress?.(100, `JSON: ${url}`);
      return data;
    } catch (err) {
      this.errors.set(url, `Failed to preload JSON: ${url} — ${err}`);
      return undefined;
    } finally {
      this.loading.delete(url);
    }
  }

  // ── Font Preloading ──────────────────────────────────────────

  /**
   * Preload @font-face fonts using the CSS Font Loading API.
   * This prevents Flash-of-Invisible-Text (FOIT) when the game
   * first renders.
   *
   * @param fonts Array of `{ family, url, descriptors? }` objects
   */
  async preloadFonts(
    fonts: Array<{
      family: string;
      url: string;
      descriptors?: FontFaceDescriptors;
    }>,
    onProgress?: PreloadCallback,
  ): Promise<void> {
    let completed = 0;
    const total = fonts.length;

    await Promise.allSettled(
      fonts.map(async ({ family, url, descriptors }) => {
        try {
          const font = new FontFace(family, `url(${url})`, descriptors);
          // `load()` fetches and rasterizes the font into RAM
          await font.load();
          // Register so the CSS cascade finds it
          document.fonts.add(font);
        } catch (err) {
          this.errors.set(url, `Failed to preload font: ${family} — ${err}`);
        } finally {
          completed++;
          onProgress?.(Math.round((completed / total) * 100), `Fonts: ${completed}/${total}`);
        }
      }),
    );

    // Wait for fonts to be ready (avoids FOIT for subsequent renders)
    await document.fonts.ready;
  }

  // ── Utilities ────────────────────────────────────────────────

  /** Check if a specific URL encountered an error during preloading */
  getError(url: string): string | undefined {
    return this.errors.get(url);
  }

  /** Total number of assets across all cache types */
  get totalCached(): number {
    return this.images.size + this.audioBuffers.size + this.jsonCache.size;
  }

  /** Available asset URLs grouped by type */
  getStats(): {
    images: number;
    audioBuffers: number;
    json: number;
    errors: number;
  } {
    return {
      images: this.images.size,
      audioBuffers: this.audioBuffers.size,
      json: this.jsonCache.size,
      errors: this.errors.size,
    };
  }
}