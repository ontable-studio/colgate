import Phaser from 'phaser';
import { audio } from '@/audio';
import { GAME_WIDTH, OBJECT_SIZE, RULES, type FallingKind } from '@/config/game';
import { stepToward } from '@/domain/basketMotion';
import { comboDetune } from '@/domain/audioSettings';
import { crossedLine, isCaught } from '@/domain/catching';
import { GameSession } from '@/domain/session';
import { Spawner, type SpawnEvent } from '@/domain/spawner';
import { addArt } from '@/ui/art/canvas';
import { DECOY_TEXTURES } from '@/ui/art/objects';
import { addBackground, addGlow } from '@/ui/effects';
import { createMeter, type Meter } from '@/ui/meter';
import { bump, fadeIn, floatText, popIn, shards, sparkBurst } from '@/ui/motion';
import { COLORS, textStyle } from '@/ui/theme';
import { SceneKey } from './keys';

const BASKET_WIDTH = 300;
const BASKET_HEIGHT = 194;
const BASKET_Y = 1470;
const HINT_VISIBLE_MS = 4500;
const TIMER_WARNING_SECS = 5;
/** Get-ready countdown before the clock starts; the basket can already be moved. */
const COUNTDOWN_MS = 3000;

export class GameplayScene extends Phaser.Scene {
  private session!: GameSession;
  private basket!: Phaser.GameObjects.Image;
  private spawner!: Spawner;
  private falling!: Phaser.Physics.Arcade.Group;
  private timerText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private meter!: Meter;
  private hint: Phaser.GameObjects.GameObject[] = [];
  private hintHidden = false;
  private lastScore = 0;
  private lastSecs = 0;
  private lastBasketX = GAME_WIDTH / 2;
  private targetX = GAME_WIDTH / 2;
  private combo = 0;
  private comboText!: Phaser.GameObjects.Text;
  private lastMultiplier = 1;
  private countdownLeftMs = COUNTDOWN_MS;
  private countdownShown = 0;
  private countdownText!: Phaser.GameObjects.Text;

  constructor() {
    super(SceneKey.Gameplay);
  }

  create(): void {
    this.spawner = new Spawner(RULES);
    this.session = new GameSession(RULES, this.spawner.capsuleCount);
    this.hintHidden = false;
    this.lastScore = 0;
    this.lastSecs = RULES.durationSec;
    this.lastBasketX = GAME_WIDTH / 2;
    this.targetX = GAME_WIDTH / 2;
    this.combo = 0;
    this.lastMultiplier = 1;
    this.countdownLeftMs = COUNTDOWN_MS;
    this.countdownShown = 0;

    fadeIn(this);
    audio.playMusic('bgm-game');
    addBackground(this, 'bg-play');
    this.addHud();
    this.addHint();

    this.basket = this.add.image(GAME_WIDTH / 2, BASKET_Y, 'basket');
    this.basket.setDisplaySize(BASKET_WIDTH, BASKET_HEIGHT);
    popIn(this, this.basket, 100, 0.6);
    // Physics only moves the objects; whether one counts is decided by geometry (domain/catching.ts).
    this.falling = this.physics.add.group();

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
      this.targetX = Phaser.Math.Clamp(pointer.x, BASKET_WIDTH / 2, GAME_WIDTH - BASKET_WIDTH / 2);
      this.hideHint();
    };
    this.input.on('pointermove', follow);
    this.input.on('pointerdown', follow);
    this.time.delayedCall(HINT_VISIBLE_MS, () => this.hideHint());

    this.countdownText = this.add
      .text(
        GAME_WIDTH / 2,
        800,
        '',
        textStyle({ size: 360, color: COLORS.goldLight, glow: 'rgba(255,170,60,0.9)' }),
      )
      .setOrigin(0.5)
      .setDepth(50);
  }

  override update(_time: number, delta: number): void {
    // Capped step so one long frame after a hiccup cannot make the basket jump.
    this.basket.x = stepToward(
      this.basket.x,
      this.targetX,
      RULES.catching.basketSpeed,
      Math.min(delta, 50),
    );

    if (this.countdownLeftMs > 0) {
      this.runCountdown(delta);
      return;
    }
    this.session.tick(delta);

    const elapsedMs = RULES.durationSec * 1000 - this.session.remainingMs;
    for (const event of this.spawner.due(elapsedMs)) this.spawn(event, elapsedMs);
    this.resolveLandings();

    this.animateBasket();
    this.updateHud();

    if (this.session.isOver) {
      audio.stopMusic(500);
      audio.playSfx('sfx-timeup', { volume: 0.8 });
      this.scene.start(SceneKey.Unlock, { result: this.session.result() });
    }
  }

  /** 3, 2, 1 before the round: nothing falls and the clock stands still. */
  private runCountdown(delta: number): void {
    this.countdownLeftMs -= delta;
    this.animateBasket();
    this.updateHud();
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

    const multiplier = this.session.multiplier;
    if (multiplier !== this.lastMultiplier) {
      this.lastMultiplier = multiplier;
      this.comboText.setText(`x${multiplier}`).setVisible(multiplier > 1);
      if (multiplier > 1) bump(this, this.comboText, 1.5, 180);
    }
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

    this.comboText = this.add
      .text(1000, 230, 'x2', textStyle({ size: 64, align: 'right', color: COLORS.goldLight }))
      .setOrigin(1, 0.5)
      .setVisible(false);

    // Keep the HUD above falling objects.
    for (const item of [stopwatch, this.timerText, scoreLabel, this.scoreText, this.comboText])
      item.setDepth(10);
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

  private spawn(event: SpawnEvent, elapsedMs: number): void {
    const { kind } = event;
    const size = OBJECT_SIZE[kind];
    // If a frame arrived late, start the object where it would already be so spacing stays even.
    const y = -size + (event.speed * (elapsedMs - event.atMs)) / 1000;
    // Decoys come in several looks (bubble, pills) but all count as the same kind.
    const texture: string =
      kind === 'decoy' ? Phaser.Utils.Array.GetRandom([...DECOY_TEXTURES]) : kind;
    const obj = this.falling.create(event.x, y, texture) as Phaser.Physics.Arcade.Image;
    obj.setDisplaySize(size, size);
    obj.setData('kind', kind);
    obj.setData('previousY', y);
    obj.setVelocityY(event.speed);
    // Everything tumbles a little as it falls; capsules and stains (which have a face) turn slowly.
    const spin = kind === 'decoy' ? 170 : 70;
    obj.setAngularVelocity(Phaser.Math.Between(-spin, spin));
  }

  /**
   * The moment an object's centre reaches the rim of the basket it either counts or it does not.
   * Capsules are forgiving (a rim touch scores), hazards strict (only a clear drop into the bowl
   * is a hit). A missed capsule dims so the player can see it did not count.
   */
  private resolveLandings(): void {
    for (const child of this.falling.getChildren()) {
      const obj = child as Phaser.Physics.Arcade.Image;
      const kind = obj.getData('kind') as FallingKind;
      const previousY = obj.getData('previousY') as number;
      obj.setData('previousY', obj.y);

      if (crossedLine(previousY, obj.y, RULES.catching.lineY)) {
        const radius = OBJECT_SIZE[kind] / 2;
        if (isCaught(kind, obj.x, this.basket.x, radius, RULES.catching)) {
          this.onCaught(obj);
          continue;
        }
        if (kind === 'capsule') {
          this.session.missCapsule();
          this.tweens.add({ targets: obj, alpha: 0.35, duration: 120 });
        }
      }
      // Anything that got past vanishes just below the basket instead of sliding over the meter.
      if (obj.y > BASKET_Y + 140) obj.destroy();
    }
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
    const points = this.session.lastPoints;
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
