import Phaser from 'phaser';
import { addArt } from './art/canvas';
import { COLORS, textStyle } from './theme';

type Animated =
  | Phaser.GameObjects.Image
  | Phaser.GameObjects.Text
  | Phaser.GameObjects.Container
  | Phaser.GameObjects.Rectangle;

/** Every scene starts with a short fade from dark red so cuts feel softer. */
export function fadeIn(scene: Phaser.Scene, ms = 320): void {
  scene.cameras.main.fadeIn(ms, 90, 4, 10);
}

/** Scale up from `from` with a little overshoot (call after the object has its final size). */
export function popIn(scene: Phaser.Scene, target: Animated, delay = 0, from = 0.7): void {
  const { scaleX, scaleY } = target;
  target.setScale(scaleX * from, scaleY * from).setAlpha(0);
  scene.tweens.add({
    targets: target,
    scaleX,
    scaleY,
    alpha: 1,
    duration: 520,
    delay,
    ease: 'Back.easeOut',
  });
}

/** Slide in from the side while fading in. */
export function slideIn(scene: Phaser.Scene, target: Animated, fromDx: number, delay = 0): void {
  const { x } = target;
  target.setX(x + fromDx).setAlpha(0);
  scene.tweens.add({
    targets: target,
    x,
    alpha: 1,
    duration: 460,
    delay,
    ease: 'Back.easeOut',
  });
}

/** Slide in vertically (negative `fromDy` drops in from above) while fading in. */
export function riseIn(
  scene: Phaser.Scene,
  target: Animated,
  fromDy: number,
  delay = 0,
  duration = 600,
): void {
  const { y } = target;
  target.setY(y + fromDy).setAlpha(0);
  scene.tweens.add({ targets: target, y, alpha: 1, duration, delay, ease: 'Back.easeOut' });
}

/** Gentle endless bob (up and down). */
export function float(
  scene: Phaser.Scene,
  targets: Animated | Animated[],
  dy = 14,
  duration = 2200,
  delay = 0,
): void {
  const list = Array.isArray(targets) ? targets : [targets];
  scene.tweens.add({
    targets: list,
    y: `-=${dy}`,
    yoyo: true,
    repeat: -1,
    duration,
    delay,
    ease: 'Sine.easeInOut',
  });
}

/** Count a text up from 0 to `to` (optionally followed by a suffix such as '%'). */
export function countUp(
  scene: Phaser.Scene,
  text: Phaser.GameObjects.Text,
  to: number,
  duration = 900,
  delay = 0,
  suffix = '',
): void {
  const state = { value: 0 };
  text.setText(`0${suffix}`);
  scene.tweens.add({
    targets: state,
    value: to,
    duration,
    delay,
    ease: 'Cubic.easeOut',
    onUpdate: () => text.setText(`${Math.round(state.value)}${suffix}`),
    onComplete: () => text.setText(`${to}${suffix}`),
  });
}

/** Quick scale bump (score changing, key pressed, ...). Safe to call again while one is running. */
export function bump(scene: Phaser.Scene, target: Animated, to = 1.25, duration = 110): void {
  const rest = (target.getData('restScale') as number | undefined) ?? target.scaleX;
  target.setData('restScale', rest);
  scene.tweens.killTweensOf(target);
  target.setScale(rest);
  scene.tweens.add({
    targets: target,
    scaleX: rest * to,
    scaleY: rest * to,
    yoyo: true,
    duration,
    ease: 'Sine.easeOut',
  });
}

/** "+10" style text that rises and fades. */
export function floatText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  color: string = COLORS.goldLight,
): void {
  const text = scene.add
    .text(x, y, label, textStyle({ size: 64, color, glow: 'rgba(255,150,40,0.9)' }))
    .setOrigin(0.5)
    .setDepth(20);
  scene.tweens.add({
    targets: text,
    y: y - 130,
    alpha: 0,
    scale: 1.25,
    duration: 760,
    ease: 'Cubic.easeOut',
    onComplete: () => text.destroy(),
  });
}

/** Twinkles that fly outward from a point. */
export function sparkBurst(
  scene: Phaser.Scene,
  x: number,
  y: number,
  count = 10,
  reach = 240,
): void {
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const distance = reach * Phaser.Math.FloatBetween(0.5, 1);
    const size = Phaser.Math.Between(34, 70);
    const star = addArt(scene, x, y, 'spark')
      .setDisplaySize(size, size)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(20);
    scene.tweens.add({
      targets: star,
      x: x + Math.cos(angle) * distance,
      y: y + Math.sin(angle) * distance,
      alpha: 0,
      scale: star.scale * 0.4,
      duration: Phaser.Math.Between(420, 760),
      ease: 'Cubic.easeOut',
      onComplete: () => star.destroy(),
    });
  }
}

/** Black fragments flying apart when a stain is caught. */
export function shards(scene: Phaser.Scene, x: number, y: number, count = 9): void {
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.6;
    const distance = Phaser.Math.Between(90, 220);
    const piece = scene.add
      .image(x, y, 'confetti')
      .setTint(0x151515)
      .setScale(Phaser.Math.FloatBetween(0.5, 1))
      .setAngle(Phaser.Math.Between(0, 360))
      .setDepth(20);
    scene.tweens.add({
      targets: piece,
      x: x + Math.cos(angle) * distance,
      y: y + Math.sin(angle) * distance + 90,
      angle: piece.angle + Phaser.Math.Between(-360, 360),
      alpha: 0,
      duration: Phaser.Math.Between(420, 700),
      ease: 'Cubic.easeOut',
      onComplete: () => piece.destroy(),
    });
  }
}
