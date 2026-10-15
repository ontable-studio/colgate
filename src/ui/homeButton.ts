import type Phaser from 'phaser';
import { SceneKey } from '@/scenes/keys';
import { createButton } from './button';

/** Small "back to start" button in the top-left corner (clear of the centred logo tab). */
export function addHomeButton(scene: Phaser.Scene): Phaser.GameObjects.Container {
  return createButton(scene, 170, 90, 'HOME', () => scene.scene.start(SceneKey.Attract), {
    width: 270,
    height: 100,
    fontSize: 40,
    icon: 'ico-home',
  }).setDepth(20);
}
