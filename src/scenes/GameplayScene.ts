import Phaser from 'phaser';
import { audio } from '@/audio';
import { GAME_WIDTH, RULES, type FallingKind } from '@/config/game';
import { pickKind } from '@/domain/spawn';
import { comboDetune } from '@/domain/audioSettings';
import { GameSession } from '@/domain/session';
import { addArt } from '@/ui/art/canvas';
import { DECOY_TEXTURES } from '@/ui/art/objects';
import { addBackground, addGlow } from '@/ui/effects';
import { createMeter, type Meter } from '@/ui/meter';
import { bump, fadeIn, floatText, popIn, shards, sparkBurst } from '@/ui/motion';
import { COLORS, textStyle } from '@/ui/theme';
import { SceneKey } from './keys';

/** On-screen size (px) of each falling object; textures differ in resolution. */
const OBJECT_SIZE: Readonly<Record<FallingKind, number>> = { capsule: 150, decoy: 150, stain: 175 };
const BASKET_WIDTH = 300;
const BASKET_HEIGHT = 194;
const BASKET_Y = 1470;
const HINT_VISIBLE_MS = 4500;
const TIMER_WARNING_SECS = 5;

export class GameplayScene extends Phaser.Scene {
  private session!: GameSession;
  private basket!: Phaser.Physics.Arcade.Image;
  private falling!: Phaser.Physics.Arcade.Group;
  private timerText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private meter!: Meter;
  private hint: Phaser.GameObjects.GameObject[] = [];
  private hintHidden = false;
  private spawnAcc = 0;
  private lastScore = 0;
  private lastSecs = 0;
  private lastBasketX = GAME_WIDTH / 2;
  private combo = 0;

  constructor() {
    super(SceneKey.Gameplay);
  }

  create(): void {
    this.session = new GameSession(RULES);
    this.spawnAcc = 0;
    this.hintHidden = false;
    this.lastScore = 0;
    this.lastSecs = RULES.durationSec;
    this.lastBasketX = GAME_WIDTH / 2;
    this.combo = 0;

    fadeIn(this);
    audio.playMusic('bgm-game');
    addBackground(this, 'bg-play');
    this.addHud();
    this.addHint();

    this.basket = this.physics.add.image(GAME_WIDTH / 2, BASKET_Y, 'basket').setImmovable(true);
    this.basket.setDisplaySize(BASKET_WIDTH, BASKET_HEIGHT);
    popIn(this, this.basket, 100, 0.6);
    this.falling = this.physics.add.group();
    this.physics.add.overlap(this.basket, this.falling, (_basket, obj) => {
      this.onCaught(obj as Phaser.Physics.Arcade.Image);
    });

    this.meter = createMeter(this, GAME_WIDTH / 2, 1745);
    this.add
      .text(
        GAME_WIDTH / 2,
        1822,
        'BRIGHTNESS METER',
        textStyle({ size: 34, letterSpacing: 5, color: COLORS.cream }),
      )
      .setOrigin(0.5);

    const follow = (pointer: Phaser.Input.Pointer): void => {
      this.basket.x = Phaser.Math.Clamp(pointer.x, BASKET_WIDTH / 2, GAME_WIDTH - BASKET_WIDTH / 2);
      this.hideHint();
    };
    this.input.on('pointermove', follow);
    this.input.on('pointerdown', follow);
    this.time.delayedCall(HINT_VISIBLE_MS, () => this.hideHint());
  }

  override update(_time: number, delta: number): void {
    this.session.tick(delta);

    this.spawnAcc += delta;
    while (this.spawnAcc >= RULES.spawn.intervalMs) {
      this.spawnAcc -= RULES.spawn.intervalMs;
      this.spawn();
    }

    for (const child of this.falling.getChildren()) {
      const obj = child as Phaser.Physics.Arcade.Image;
      // Missed objects vanish just below the basket instead of sliding over the meter.
      if (obj.y > BASKET_Y + 140) obj.destroy();
    }

    this.animateBasket();
    this.updateHud();

    if (this.session.isOver) {
      audio.stopMusic(500);
      if (this.session.meterPct < 100) audio.playSfx('sfx-timeup', { volume: 0.8 });
      this.scene.start(SceneKey.Unlock, { result: this.session.result() });
    }
  }

  /** The basket leans into the direction it is being dragged and settles back when it stops. */
  private animateBasket(): void {
    const dx = this.basket.x - this.lastBasketX;
    this.lastBasketX = this.basket.x;
    const lean = Phaser.Math.Clamp(dx * 0.5, -12, 12);
    this.basket.angle += (lean - this.basket.angle) * 0.25;
  }

  private updateHud(): void {
    const secs = Math.ceil(this.session.remainingMs / 1000);
    this.timerText.setText(`00:${String(secs).padStart(2, '0')}`);
    if (secs !== this.lastSecs) {
      this.lastSecs = secs;
      if (secs <= TIMER_WARNING_SECS) {
        this.timerText.setColor('#FF9C8A');
        bump(this, this.timerText, 1.22, 160);
        // The last seconds tick higher in pitch as they run out.
        audio.playSfx('sfx-tick', { detune: (TIMER_WARNING_SECS - secs) * 70 });
      }
    }

    this.scoreText.setText(String(this.session.score));
    if (this.session.score !== this.lastScore) {
      this.lastScore = this.session.score;
      bump(this, this.scoreText, 1.28, 120);
    }
    this.meter.setValue(this.session.meterPct);
  }

  /** Stopwatch + timer on the left, score on the right. */
  private addHud(): void {
    const stopwatch = addArt(this, 135, 112, 'ico-stopwatch').setDisplaySize(84, 84);
    this.timerText = this.add
      .text(196, 112, '00:00', textStyle({ size: 76, align: 'left' }))
      .setOrigin(0, 0.5);
    const scoreLabel = this.add
      .text(
        1000,
        76,
        'SCORE',
        textStyle({ size: 36, align: 'right', letterSpacing: 6, color: COLORS.cream }),
      )
      .setOrigin(1, 0.5);
    this.scoreText = this.add
      .text(1000, 146, '0', textStyle({ size: 90, align: 'right', glow: 'rgba(255,170,60,0.8)' }))
      .setOrigin(1, 0.5);

    // Keep the HUD above falling objects.
    for (const item of [stopwatch, this.timerText, scoreLabel, this.scoreText]) item.setDepth(10);
  }

  /** "Drag left/right" hint under the basket, shown only at the start of a round. */
  private addHint(): void {
    const arrows = addArt(this, GAME_WIDTH / 2, 1632, 'ico-arrows').setDisplaySize(520, 145);
    const hand = this.add.image(GAME_WIDTH / 2, 1636, 'ico-hand').setDisplaySize(110, 110);
    this.hint = [arrows, hand];
    this.tweens.add({
      targets: hand,
      x: { from: GAME_WIDTH / 2 - 130, to: GAME_WIDTH / 2 + 130 },
      yoyo: true,
      repeat: -1,
      duration: 900,
      ease: 'Sine.easeInOut',
    });
  }

  private hideHint(): void {
    if (this.hintHidden) return;
    this.hintHidden = true;
    this.tweens.add({ targets: this.hint, alpha: 0, duration: 500 });
  }

  private spawn(): void {
    const kind = pickKind(RULES.spawn.weights);
    const size = OBJECT_SIZE[kind];
    const x = Phaser.Math.Between(90, GAME_WIDTH - 90);
    // Decoys come in several looks (bubble, pills) but all count as the same kind.
    const texture: string =
      kind === 'decoy' ? Phaser.Utils.Array.GetRandom([...DECOY_TEXTURES]) : kind;
    const obj = this.falling.create(x, -size, texture) as Phaser.Physics.Arcade.Image;
    obj.setDisplaySize(size, size);
    obj.setData('kind', kind);
    obj.setVelocityY(RULES.spawn.fallSpeed);
    // Everything tumbles a little as it falls; capsules and stains (which have a face) turn slowly.
    const spin = kind === 'decoy' ? 170 : 70;
    obj.setAngularVelocity(Phaser.Math.Between(-spin, spin));
  }

  private onCaught(obj: Phaser.Physics.Arcade.Image): void {
    const kind = obj.getData('kind') as FallingKind;
    this.session.catch(kind);
    this.feedback(kind, obj.x, obj.y);
    obj.destroy();
  }

  /** Reward / penalty cue at the moment of the catch. */
  private feedback(kind: FallingKind, x: number, y: number): void {
    bump(this, this.basket, 1.06, 90);
    const points = RULES.points[kind];
    const label = `${points > 0 ? '+' : ''}${points}`;
    this.combo = kind === 'capsule' ? this.combo + 1 : 0;

    if (kind === 'capsule') {
      // Capsules caught in a row climb the scale one semitone at a time.
      audio.playSfx('sfx-catch', { detune: comboDetune(this.combo) });
      const burst = addGlow(this, x, y, 120, 1);
      this.tweens.add({
        targets: burst,
        displayWidth: 380,
        displayHeight: 380,
        alpha: 0,
        duration: 380,
        onComplete: () => burst.destroy(),
      });
      sparkBurst(this, x, y, 6, 150);
      floatText(this, x, y - 70, label, COLORS.goldLight);
      this.meter.pulse();
    } else if (kind === 'stain') {
      audio.playSfx('sfx-stain');
      shards(this, x, y);
      this.cameras.main.shake(140, 0.006);
      floatText(this, x, y - 70, label, '#FF8A7A');
    } else {
      audio.playSfx('sfx-decoy');
      floatText(this, x, y - 70, label, '#FFC4B8');
    }
  }
}
