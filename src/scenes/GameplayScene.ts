import Phaser from 'phaser';
import { audio } from '@/audio';
import { GAME_WIDTH, RULES, type BubbleSize } from '@/config/game';
import {
  findMissed,
  findTapped,
  pickSize,
  spawnIntervalFor,
  speedFactorFor,
  weightShift,
  type BubbleBody,
} from '@/domain/bubbles';
import { GameSession } from '@/domain/session';
import { addArt } from '@/ui/art/canvas';
import { makeButtonSkin } from '@/ui/art/skins';
import { addBackground, addGlow } from '@/ui/effects';
import { createBrushMeter, type BrushMeter } from '@/ui/brushMeter';
import { bump, fadeIn, floatText, riseIn, slideIn, sparkBurst } from '@/ui/motion';
import { COLORS, textStyle } from '@/ui/theme';
import type { GameResultData } from './data';
import { SceneKey } from './keys';

const TIMER_WARNING_SECS = 5;
/** Get-ready countdown before the clock starts; nothing can be tapped yet. */
const COUNTDOWN_MS = 3000;
/** Pause after the target is reached, so the full toothbrush and the burst are seen. */
const WIN_PAUSE_MS = 1100;
const BRUSH_X = 130;
const BRUSH_Y = 1250;
/** Molecules keep out of the toothbrush and its percentage (bottom left). */
const BRUSH_ZONE = { right: 340, top: 900 };
const FADE_OUT_MS = 500;

interface Bubble extends BubbleBody {
  x: number;
  y: number;
  readonly image: Phaser.GameObjects.Image;
  readonly glow: Phaser.GameObjects.Image;
  readonly radius: number;
  vx: number;
  vy: number;
  age: number;
}

/** Tap the floating Vitamin C molecules; each one fills the toothbrush a little more. */
export class GameplayScene extends Phaser.Scene {
  private session!: GameSession;
  private bubbles: Bubble[] = [];
  private brush!: BrushMeter;
  private timerText!: Phaser.GameObjects.Text;
  private countdownText!: Phaser.GameObjects.Text;
  private countdownLeftMs = COUNTDOWN_MS;
  private countdownShown = 0;
  private lastSecs = 0;
  private sinceSpawnMs = 0;
  private finishing = false;

  constructor() {
    super(SceneKey.Gameplay);
  }

  create(): void {
    this.session = new GameSession(RULES);
    this.bubbles = [];
    this.countdownLeftMs = COUNTDOWN_MS;
    this.countdownShown = 0;
    this.lastSecs = RULES.durationSec;
    this.sinceSpawnMs = RULES.spawn.intervalMs;
    this.finishing = false;

    fadeIn(this);
    audio.playMusic('bgm-game');
    addBackground(this);
    this.addTimer();
    this.brush = createBrushMeter(this, BRUSH_X, BRUSH_Y);
    for (const part of this.brush.parts) slideIn(this, part, -260, 250);

    this.countdownText = this.add
      .text(
        GAME_WIDTH / 2,
        800,
        '',
        textStyle({ size: 360, color: COLORS.goldLight, glow: 'rgba(255,170,60,0.9)' }),
      )
      .setOrigin(0.5)
      .setDepth(50);

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.onTap(pointer.x, pointer.y);
    });
  }

  override update(_time: number, delta: number): void {
    if (this.countdownLeftMs > 0) {
      this.runCountdown(delta);
      return;
    }
    // Capped step so one long frame after a hiccup cannot make molecules jump.
    const step = Math.min(delta, 50);
    if (!this.finishing) {
      this.session.tick(delta);
      this.updateTimer();
      this.spawnIfDue(step);
    }
    this.moveBubbles(step);

    if (!this.finishing && this.session.isOver) this.finish();
  }

  /** 3, 2, 1 before the round: nothing floats and the clock stands still. */
  private runCountdown(delta: number): void {
    this.countdownLeftMs -= delta;
    const shown = Math.max(1, Math.ceil(this.countdownLeftMs / 1000));
    if (this.countdownLeftMs <= 0) {
      this.countdownText.destroy();
      audio.playSfx('sfx-ui-start', { volume: 0.8 });
      return;
    }
    if (shown !== this.countdownShown) {
      this.countdownShown = shown;
      this.countdownText.setText(String(shown)).setAlpha(1);
      bump(this, this.countdownText, 1.35, 220);
      audio.playSfx('sfx-tick', { detune: (3 - shown) * 150 });
    }
  }

  /** Red button-style frame: alarm clock on the left, the time and "TIME LEFT" beside it. */
  private addTimer(): void {
    const cx = GAME_WIDTH / 2;
    const y = 120;
    // The same glowing red pill as the buttons.
    const pill = addArt(this, cx, y, makeButtonSkin(this, 500, 140, 'red'));
    // Clock and time form one group, centred in the pill with an even gap between them.
    const clockHeight = 88;
    const clock = this.add
      .image(0, y, 'ico-clock')
      .setDisplaySize(clockHeight * (297 / 320), clockHeight);
    this.timerText = this.add
      .text(0, y - 12, formatTime(RULES.durationSec), textStyle({ size: 80 }))
      .setOrigin(0.5);
    const gap = 28;
    const groupWidth = clock.displayWidth + gap + this.timerText.width;
    const left = cx - groupWidth / 2;
    clock.setX(left + clock.displayWidth / 2);
    const textX = left + clock.displayWidth + gap + this.timerText.width / 2;
    this.timerText.setX(textX);
    const caption = this.add
      .text(
        textX,
        y + 38,
        'TIME LEFT',
        textStyle({ size: 24, letterSpacing: 3, color: COLORS.cream }),
      )
      .setOrigin(0.5);
    for (const item of [pill, clock, this.timerText, caption]) {
      item.setDepth(10);
      riseIn(this, item, -180, 100, 600);
    }
  }

  private updateTimer(): void {
    const secs = Math.ceil(this.session.remainingMs / 1000);
    this.timerText.setText(formatTime(secs));
    if (secs === this.lastSecs) return;
    this.lastSecs = secs;
    if (secs <= TIMER_WARNING_SECS) {
      this.timerText.setColor('#FF9C8A');
      bump(this, this.timerText, 1.22, 160);
      // The last seconds tick higher in pitch as they run out.
      audio.playSfx('sfx-tick', { detune: (TIMER_WARNING_SECS - secs) * 70 });
    }
  }

  private spawnIfDue(step: number): void {
    this.sinceSpawnMs += step;
    if (this.sinceSpawnMs < spawnIntervalFor(RULES, this.session.remainingMs)) return;
    if (this.bubbles.length >= RULES.spawn.maxOnScreen) return;
    this.sinceSpawnMs = 0;
    this.spawn();
  }

  private spawn(): void {
    const size = pickSize(
      RULES.bubbles,
      Math.random(),
      weightShift(RULES, this.session.remainingMs),
    );
    const diameter = RULES.bubbles[size].diameter;
    const radius = diameter / 2;
    const { left, right, top, bottom } = RULES.area;

    // Try a few spots; take the first that is clear of the toothbrush and the other molecules.
    let x = 0;
    let y = 0;
    for (let attempt = 0; attempt < 12; attempt++) {
      x = Phaser.Math.Between(left + radius, right - radius);
      y = Phaser.Math.Between(top + radius, bottom - radius);
      const inBrushZone = x - radius < BRUSH_ZONE.right && y + radius > BRUSH_ZONE.top;
      const crowded = this.bubbles.some(
        (b) => Math.hypot(b.x - x, b.y - y) < (b.radius + radius) * 0.95,
      );
      if (!inBrushZone && !crowded) break;
    }

    const glow = addGlow(this, x, y, diameter * 2.2, 0);
    const image = this.add.image(x, y, 'capsule').setDisplaySize(diameter, diameter);
    const angle = Math.random() * Math.PI * 2;
    const speed = RULES.spawn.driftSpeed * Phaser.Math.FloatBetween(0.5, 1);
    this.bubbles.push({
      x,
      y,
      size,
      image,
      glow,
      radius,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      age: 0,
    });
    // Pop in: grows from nothing.
    const full = image.scale;
    image.setScale(0);
    this.tweens.add({ targets: image, scale: full, duration: 260, ease: 'Back.easeOut' });
  }

  /** Drift, bounce off the edges of the play area and fade out molecules nobody tapped. */
  private moveBubbles(step: number): void {
    const { left, right, top, bottom } = RULES.area;
    const seconds = step / 1000;
    const speed = speedFactorFor(RULES, this.session.remainingMs);
    for (const b of [...this.bubbles]) {
      b.age += step;
      b.x += b.vx * speed * seconds;
      b.y += b.vy * speed * seconds;
      if (b.x < left + b.radius || b.x > right - b.radius) b.vx = -b.vx;
      if (b.y < top + b.radius || b.y > bottom - b.radius) b.vy = -b.vy;
      b.image.setPosition(b.x, b.y);
      b.glow.setPosition(b.x, b.y);
      b.image.setAngle(b.image.angle + 12 * seconds);

      b.glow.setAlpha(0.55 * Math.min(1, b.age / 260));
      if (this.finishing) {
        this.remove(b);
        b.image.destroy();
        b.glow.destroy();
      } else if (b.age >= RULES.spawn.lifetimeMs) {
        // Nobody shot it in time: it gets away.
        this.vanish(b);
      }
    }
  }

  private remove(bubble: Bubble): void {
    const index = this.bubbles.indexOf(bubble);
    if (index >= 0) this.bubbles.splice(index, 1);
  }

  private onTap(x: number, y: number): void {
    if (this.countdownLeftMs > 0 || this.finishing || this.session.isOver) return;
    this.showAim(x, y);
    const target = this.bubbles[findTapped(this.bubbles, RULES, x, y)];
    if (!target) {
      this.session.miss();
      audio.playSfx('sfx-decoy', { volume: 0.7 });
      this.showMissed(x, y);
      // The shot landed in a molecule's (invisible) miss range: that molecule gets away.
      const away = this.bubbles[findMissed(this.bubbles, RULES, x, y)];
      if (away) this.vanish(away);
      return;
    }

    const size: BubbleSize = target.size;
    const points = this.session.pop(size);
    this.brush.setValue(this.session.meterPct);
    this.brush.pulse();
    // Smaller (harder, higher paying) molecules ring higher.
    audio.playSfx('sfx-catch', { detune: points * 60 });
    this.remove(target);
    this.burst(target, points);
  }

  /** A molecule that got away: it turns black and white at once, then fades out. */
  private vanish(bubble: Bubble): void {
    this.remove(bubble);
    bubble.image.setTexture('capsule-gray');
    this.tweens.killTweensOf(bubble.image);
    this.tweens.add({ targets: bubble.glow, alpha: 0, duration: 150 });
    this.tweens.add({
      targets: bubble.image,
      alpha: 0,
      scale: bubble.image.scale * 0.85,
      delay: 150,
      duration: FADE_OUT_MS,
      ease: 'Sine.easeIn',
      onComplete: () => {
        bubble.image.destroy();
        bubble.glow.destroy();
      },
    });
  }

  /** The molecule bursts: a flash, sparks and "+5 points" rising from it. */
  private burst(bubble: Bubble, points: number): void {
    const { x, y } = bubble;
    this.tweens.add({
      targets: [bubble.image, bubble.glow],
      scale: '*=1.5',
      alpha: 0,
      duration: 220,
      onComplete: () => {
        bubble.image.destroy();
        bubble.glow.destroy();
      },
    });
    const flash = addGlow(this, x, y, bubble.radius, 1);
    this.tweens.add({
      targets: flash,
      displayWidth: bubble.radius * 4,
      displayHeight: bubble.radius * 4,
      alpha: 0,
      duration: 380,
      onComplete: () => flash.destroy(),
    });
    sparkBurst(this, x, y, 6, 150);
    floatText(this, x, y - bubble.radius - 20, `+${points} points`, COLORS.goldLight);
  }

  /** Aim marker that settles onto the spot that was tapped. */
  private showAim(x: number, y: number): void {
    const aim = addArt(this, x, y, 'crosshair').setDepth(15);
    const rest = aim.scale;
    aim.setScale(rest * 1.8).setAlpha(0.2);
    this.tweens.add({
      targets: aim,
      scale: rest,
      alpha: 1,
      duration: 120,
      onComplete: () => {
        this.tweens.add({
          targets: aim,
          alpha: 0,
          duration: 260,
          onComplete: () => aim.destroy(),
        });
      },
    });
  }

  private showMissed(x: number, y: number): void {
    const label = this.add
      .text(
        x,
        y - 90,
        'MISSED!',
        textStyle({ size: 56, color: '#FFD0C4', glow: 'rgba(120,0,10,0.9)' }),
      )
      .setOrigin(0.5)
      .setDepth(20);
    this.tweens.add({
      targets: label,
      y: label.y - 70,
      alpha: 0,
      duration: 700,
      ease: 'Cubic.easeOut',
      onComplete: () => label.destroy(),
    });
  }

  /** Time is up or the toothbrush is full: celebrate if it is full, then show the result. */
  private finish(): void {
    this.finishing = true;
    audio.stopMusic(500);
    const won = this.session.reachedTarget;
    if (won) {
      audio.playSfx('sfx-unlock');
      sparkBurst(this, BRUSH_X, BRUSH_Y, 18, 360);
    } else {
      audio.playSfx('sfx-timeup', { volume: 0.8 });
    }
    this.time.delayedCall(won ? WIN_PAUSE_MS : 400, () => {
      this.scene.start(SceneKey.Result, { result: this.session.result() } satisfies GameResultData);
    });
  }
}

function formatTime(secs: number): string {
  return `00:${String(Math.max(0, secs)).padStart(2, '0')}`;
}
