import Phaser from 'phaser';
import { GAME_WIDTH, RULES, type FallingKind } from '@/config/game';
import { pickKind } from '@/domain/spawn';
import { GameSession } from '@/domain/session';
import { addArt } from '@/ui/art/canvas';
import { DECOY_TEXTURES } from '@/ui/art/objects';
import { addBackground, addGlow } from '@/ui/effects';
import { createMeter, type Meter } from '@/ui/meter';
import { COLORS, textStyle } from '@/ui/theme';
import { SceneKey } from './keys';

/** On-screen size (px) of each falling object; textures differ in resolution. */
const OBJECT_SIZE: Readonly<Record<FallingKind, number>> = { capsule: 150, decoy: 150, stain: 175 };
const BASKET_WIDTH = 300;
const BASKET_HEIGHT = 194;
const BASKET_Y = 1470;
const HINT_VISIBLE_MS = 4500;

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

  constructor() {
    super(SceneKey.Gameplay);
  }

  create(): void {
    this.session = new GameSession(RULES);
    this.spawnAcc = 0;
    this.hintHidden = false;

    addBackground(this, 'bg-play');
    this.addHud();
    this.addHint();

    this.basket = this.physics.add.image(GAME_WIDTH / 2, BASKET_Y, 'basket').setImmovable(true);
    this.basket.setDisplaySize(BASKET_WIDTH, BASKET_HEIGHT);
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

    const secs = Math.ceil(this.session.remainingMs / 1000);
    this.timerText.setText(`00:${String(secs).padStart(2, '0')}`);
    this.scoreText.setText(String(this.session.score));
    this.meter.setValue(this.session.meterPct);

    if (this.session.isOver) {
      this.scene.start(SceneKey.Unlock, { result: this.session.result() });
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

    // Keep the HUD above falling objects.
    for (const item of [stopwatch, this.timerText, scoreLabel, this.scoreText]) item.setDepth(10);
  }

  /** "Drag left/right" hint under the basket, shown only at the start of a round. */
  private addHint(): void {
    const arrows = addArt(this, GAME_WIDTH / 2, 1640, 'ico-arrows').setDisplaySize(560, 156);
    const hand = this.add.image(GAME_WIDTH / 2, 1650, 'ico-hand').setDisplaySize(120, 120);
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
  }

  private onCaught(obj: Phaser.Physics.Arcade.Image): void {
    const kind = obj.getData('kind') as FallingKind;
    this.session.catch(kind);
    this.feedback(kind, obj.x, obj.y);
    obj.destroy();
  }

  /** Small reward / penalty cue at the moment of the catch. */
  private feedback(kind: FallingKind, x: number, y: number): void {
    this.tweens.add({
      targets: this.basket,
      scaleX: this.basket.scaleX * 1.06,
      scaleY: this.basket.scaleY * 1.06,
      yoyo: true,
      duration: 90,
    });
    if (kind === 'capsule') {
      const burst = addGlow(this, x, y, 120, 1);
      this.tweens.add({
        targets: burst,
        displayWidth: 380,
        displayHeight: 380,
        alpha: 0,
        duration: 380,
        onComplete: () => burst.destroy(),
      });
    } else if (kind === 'stain') {
      this.cameras.main.shake(140, 0.006);
    }
  }
}
