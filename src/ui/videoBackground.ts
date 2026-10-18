/**
 * Looping video behind the (transparent) game canvas, in plain DOM elements: the browser decodes
 * and composites them without any per-frame cost for the game. Three clips (see VIDEOS).
 *
 * A clip's last frame never matches its first, so a plain `loop` shows a visible jump. Instead
 * every clip has two <video> elements: LOOP_FADE_MS before the active one ends, the second one
 * starts again from the beginning and fades in over it, so the end melts into the start.
 * The files are fetched once into memory (blob URLs): no stutter from the network, no seeking
 * issues with the service worker, and they keep working offline.
 */

export type VideoName = 'home' | 'gameplay' | 'winning';

const VIDEOS: Readonly<Record<VideoName, string>> = {
  home: 'assets/video/home.mp4',
  gameplay: 'assets/video/gameplay.mp4',
  winning: 'assets/video/winning.mp4',
};

/** How long the end of a clip and its restart overlap. */
const LOOP_FADE_MS = 1200;
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

/** One clip: two videos that take turns, with the overlap that hides the loop point. */
class LoopingClip {
  readonly element = document.createElement('div');
  private videos: [HTMLVideoElement, HTMLVideoElement] | null = null;
  private active = 0;
  private handoff = false;
  private running = false;
  private frame = 0;

  constructor(readonly name: VideoName) {
    Object.assign(this.element.style, {
      position: 'absolute',
      inset: '0',
      opacity: '0',
      transition: `opacity ${SWITCH_FADE_MS}ms ease`,
    });
    void loadBlob(name).then((src) => {
      if (!src) return;
      this.videos = [createVideo(src), createVideo(src)];
      this.element.append(...this.videos);
      if (this.running) this.begin();
    });
  }

  start(): void {
    this.running = true;
    if (this.videos) this.begin();
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.frame);
    this.videos?.forEach((video) => video.pause());
  }

  private begin(): void {
    const videos = this.videos;
    if (!videos) return;
    this.active = 0;
    this.handoff = false;
    const [first, second] = videos;
    second.pause();
    second.style.opacity = '0';
    first.style.transition = 'none';
    first.style.opacity = '1';
    first.currentTime = 0;
    void first.play().catch(() => undefined);
    cancelAnimationFrame(this.frame);
    this.frame = requestAnimationFrame(this.tick);
  }

  private readonly tick = (): void => {
    if (!this.running || !this.videos) return;
    const current = this.videos[this.active];
    const next = this.videos[1 - this.active];
    if (!current || !next) return;
    const left = current.duration - current.currentTime;
    if (!this.handoff && Number.isFinite(left) && left * 1000 <= LOOP_FADE_MS) {
      this.handoff = true;
      next.currentTime = 0;
      next.style.transition = `opacity ${LOOP_FADE_MS}ms linear`;
      next.style.zIndex = '1';
      current.style.zIndex = '0';
      next.style.opacity = '1';
      void next.play().catch(() => undefined);
      window.setTimeout(() => {
        current.pause();
        current.style.transition = 'none';
        current.style.opacity = '0';
        this.active = 1 - this.active;
        this.handoff = false;
      }, LOOP_FADE_MS + 60);
    }
    // A video that stalled or was paused by the browser must not leave a frozen background.
    if (!this.handoff && current.paused && !current.ended)
      void current.play().catch(() => undefined);
    this.frame = requestAnimationFrame(this.tick);
  };
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
