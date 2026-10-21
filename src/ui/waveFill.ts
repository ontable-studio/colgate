import Phaser from 'phaser';

/** Share of the remaining distance the shown level covers per second (higher = snappier). */
const CATCH_UP_PER_SEC = 5;
const SAMPLE_STEP = 6;

export interface WaveFill {
  /** Where the level should settle, 0..1 of the image's height. The shown level glides there. */
  setRatio: (ratio: number) => void;
  /** The level shown right now (it lags behind the target while gliding). */
  readonly shown: number;
}

interface WaveOptions {
  /** Called every frame with the level currently shown. */
  onChange?: (shown: number) => void;
}

/**
 * Shows `image` from the bottom up to a level whose top edge is a gentle moving wave, like water
 * in the toothbrush. The level glides smoothly to every new value. The image is clipped with a
 * mask redrawn each frame, so it keeps working while the image is moving (sliding in, in a
 * container, ...).
 */
export function addWaveFill(
  scene: Phaser.Scene,
  image: Phaser.GameObjects.Image,
  { onChange }: WaveOptions = {},
): WaveFill {
  const shape = scene.make.graphics({}, false);
  image.setMask(shape.createGeometryMask());
  let target = 0;
  let shown = 0;
  let clock = 0;

  const draw = (): void => {
    shape.clear();
    if (shown <= 0.002) return;
    const b = image.getBounds();
    shape.fillStyle(0xffffff, 1);
    shape.beginPath();
    const level = b.bottom - shown * b.height;
    // The wave calms down at both ends so an empty or full brush has a clean edge.
    const calm = Math.min(1, shown * 10) * (1 - Phaser.Math.SmoothStep(shown, 0.93, 1));
    for (let x = b.left; x <= b.right + SAMPLE_STEP; x += SAMPLE_STEP) {
      const t = (x - b.left) / b.width;
      const wave =
        Math.sin(t * Math.PI * 2.4 + clock * 3.2) * 7 +
        Math.sin(t * Math.PI * 4.6 - clock * 2.1) * 3.5;
      const y = Phaser.Math.Clamp(level + wave * calm, b.top, b.bottom);
      if (x === b.left) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
    shape.lineTo(b.right + SAMPLE_STEP, b.bottom + 4);
    shape.lineTo(b.left, b.bottom + 4);
    shape.closePath();
    shape.fillPath();
  };

  const onUpdate = (_time: number, delta: number): void => {
    clock += delta / 1000;
    const next = shown + (target - shown) * Math.min(1, (delta / 1000) * CATCH_UP_PER_SEC);
    const settled = Math.abs(target - next) < 0.0015;
    const changed = settled ? shown !== target : next !== shown;
    shown = settled ? target : next;
    if (changed) onChange?.(shown);
    draw();
  };
  scene.events.on(Phaser.Scenes.Events.UPDATE, onUpdate);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    scene.events.off(Phaser.Scenes.Events.UPDATE, onUpdate);
    shape.destroy();
  });

  return {
    setRatio: (ratio) => {
      target = Phaser.Math.Clamp(ratio, 0, 1);
    },
    get shown() {
      return shown;
    },
  };
}
