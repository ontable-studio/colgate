/**
 * Looping video behind the (transparent) game canvas, in plain DOM elements: the browser decodes
 * and composites them without any per-frame cost for the game. Three clips (see VIDEOS).
 *
 * The clips are baked into seamless loops (tools/bake-video-loop: the end of each clip is
 * cross-faded into its beginning), so the plain `loop` flag shows no jump or blink.
 * The files are fetched once into memory (blob URLs): no stutter from the network, no seeking
 * issues with the service worker, and they keep working offline.
 */

export type VideoName = 'home' | 'gameplay' | 'winning';

const VIDEOS: Readonly<Record<VideoName, string>> = {
  home: 'assets/video/home.mp4',
  gameplay: 'assets/video/gameplay.mp4',
  winning: 'assets/video/winning.mp4',
};

/** Cross-fade when the screen changes to another clip. */
const SWITCH_FADE_MS = 450;
/** Shown while a clip is not ready yet or fails to load: the brand red. */
const FALLBACK_BACKGROUND =
  'radial-gradient(circle at 50% 62%, #e2271a 0%, #b00f1f 55%, #6e0612 100%)';

const blobs = new Map<VideoName, Promise<string | null>>();

function loadBlob(name: VideoName): Promise<string | null> {
  let blob = blobs.get(name);
  if (!blob) {
    blob = fetch(VIDEOS[name])
      .then((response) => (response.ok ? response.blob() : Promise.reject(new Error('video'))))
      .then((data) => URL.createObjectURL(data))
      .catch(() => null);
    blobs.set(name, blob);
  }
  return blob;
}

/** Start fetching every clip (call once at boot; screens do not wait for it). */
export function preloadVideos(): void {
  for (const name of Object.keys(VIDEOS) as VideoName[]) void loadBlob(name);
}

function createVideo(src: string): HTMLVideoElement {
  const video = document.createElement('video');
  video.src = src;
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.setAttribute('muted', '');
  video.setAttribute('playsinline', '');
  Object.assign(video.style, {
    position: 'absolute',
    inset: '0',
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    opacity: '0',
    pointerEvents: 'none',
  });
  return video;
}

/** One clip: a single video that repeats itself. */
class LoopingClip {
  readonly element = document.createElement('div');
  private video: HTMLVideoElement | null = null;
  private running = false;
  private watch = 0;

  constructor(readonly name: VideoName) {
    Object.assign(this.element.style, {
      position: 'absolute',
      inset: '0',
      opacity: '0',
      transition: `opacity ${SWITCH_FADE_MS}ms ease`,
    });
    void loadBlob(name).then((src) => {
      if (!src) return;
      const video = createVideo(src);
      video.loop = true;
      video.style.opacity = '1';
      this.video = video;
      this.element.append(video);
      if (this.running) this.begin();
    });
  }

  start(): void {
    this.running = true;
    if (this.video) this.begin();
  }

  stop(): void {
    this.running = false;
    window.clearInterval(this.watch);
    this.video?.pause();
  }

  private begin(): void {
    const video = this.video;
    if (!video) return;
    video.currentTime = 0;
    void video.play().catch(() => undefined);
    // A video the browser paused (tab switch, power saving) must not leave a frozen background.
    window.clearInterval(this.watch);
    this.watch = window.setInterval(() => {
      if (this.running && video.paused) void video.play().catch(() => undefined);
    }, 1000);
  }
}

/** The layer under the canvas. Always matches the on-screen rectangle of the canvas. */
class VideoBackdrop {
  private readonly stage = document.createElement('div');
  private readonly clips = new Map<VideoName, LoopingClip>();
  private current: VideoName | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private pending: VideoName | null = null;

  /** Place the layer behind `canvas` and keep it the same size and position. */
  attach(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    const parent = canvas.parentElement;
    if (!parent) return;
    Object.assign(this.stage.style, {
      position: 'fixed',
      overflow: 'hidden',
      background: FALLBACK_BACKGROUND,
      pointerEvents: 'none',
      visibility: 'hidden',
    });
    parent.style.position = 'relative';
    canvas.style.position = 'relative';
    canvas.style.zIndex = '1';
    parent.insertBefore(this.stage, canvas);
    const sync = (): void => {
      const rect = canvas.getBoundingClientRect();
      Object.assign(this.stage.style, {
        left: `${rect.left}px`,
        top: `${rect.top}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
      });
    };
    sync();
    new ResizeObserver(sync).observe(canvas);
    window.addEventListener('resize', sync);
    if (this.pending) this.show(this.pending);
  }

  /** Show a clip behind the game; the same clip as before keeps playing without a restart. */
  show(name: VideoName | null): void {
    if (!this.canvas) {
      this.pending = name;
      return;
    }
    if (name === this.current) return;
    const previous = this.current ? this.clips.get(this.current) : undefined;
    this.current = name;
    this.stage.style.visibility = name ? 'visible' : 'hidden';

    if (previous) {
      previous.element.style.opacity = '0';
      // Once it has faded out, stop decoding it (unless the player came straight back to it).
      window.setTimeout(() => {
        if (this.current !== previous.name) previous.stop();
      }, SWITCH_FADE_MS + 50);
    }
    if (!name) return;

    let clip = this.clips.get(name);
    if (!clip) {
      clip = new LoopingClip(name);
      this.clips.set(name, clip);
    }
    this.stage.append(clip.element); // the newest clip is always on top
    clip.start();
    clip.element.style.opacity = '1';
  }
}

export const videoBackdrop = new VideoBackdrop();
