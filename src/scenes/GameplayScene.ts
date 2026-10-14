import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, RULES, type FallingKind } from '@/config/game';
import { pickKind } from '@/domain/spawn';
import { GameSession } from '@/domain/session';
import { SceneKey } from './keys';

const OBJECT_SIZE = 150; // on-screen size of every falling object (textures differ in resolution)
const BASKET_Y = GAME_HEIGHT - 260;
const BASKET_HALF_WIDTH = 140;

export class GameplayScene extends Phaser.Scene {
  private session!: GameSession;
  private basket!: Phaser.Physics.Arcade.Image;
  private falling!: Phaser.Physics.Arcade.Group;
  private hud!: Phaser.GameObjects.Text;
  private meterFill!: Phaser.GameObjects.Rectangle;
  private spawnAcc = 0;

  constructor() {
    super(SceneKey.Gameplay);
  }

  create(): void {
    this.session = new GameSession(RULES);
    this.spawnAcc = 0;

    this.basket = this.physics.add.image(GAME_WIDTH / 2, BASKET_Y, 'basket').setImmovable(true);
    this.falling = this.physics.add.group();
    this.physics.add.overlap(this.basket, this.falling, (_basket, obj) => {
      this.onCaught(obj as Phaser.Physics.Arcade.Image);
    });

    this.hud = this.add.text(48, 48, '', {
      fontFamily: 'sans-serif',
      fontSize: '56px',
      color: '#ffffff',
    });

    // Brightness meter (placeholder bar)
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT - 80, 800, 36, 0x000000, 0.35);
    this.meterFill = this.add
      .rectangle(GAME_WIDTH / 2 - 400, GAME_HEIGHT - 80, 0, 36, 0xffc13a)
      .setOrigin(0, 0.5);

    const follow = (pointer: Phaser.Input.Pointer): void => {
      this.basket.x = Phaser.Math.Clamp(
        pointer.x,
        BASKET_HALF_WIDTH,
        GAME_WIDTH - BASKET_HALF_WIDTH,
      );
    };
    this.input.on('pointermove', follow);
    this.input.on('pointerdown', follow);
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
      if (obj.y > GAME_HEIGHT + 100) obj.destroy();
    }

    const secs = Math.ceil(this.session.remainingMs / 1000);
    this.hud.setText(`00:${String(secs).padStart(2, '0')}    SCORE ${this.session.score}`);
    this.meterFill.width = 800 * (this.session.meterPct / 100);

    if (this.session.isOver) {
      this.scene.start(SceneKey.Unlock, { result: this.session.result() });
    }
  }

  private spawn(): void {
    const kind = pickKind(RULES.spawn.weights);
    const x = Phaser.Math.Between(80, GAME_WIDTH - 80);
    const obj = this.falling.create(x, -60, kind) as Phaser.Physics.Arcade.Image;
    obj.setDisplaySize(OBJECT_SIZE, OBJECT_SIZE);
    obj.setData('kind', kind);
    obj.setVelocityY(RULES.spawn.fallSpeed);
  }

  private onCaught(obj: Phaser.Physics.Arcade.Image): void {
    this.session.catch(obj.getData('kind') as FallingKind);
    obj.destroy();
  }
}
