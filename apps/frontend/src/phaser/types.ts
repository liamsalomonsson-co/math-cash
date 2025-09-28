import type Phaser from 'phaser';

export interface PhaserGameHandle {
  game: Phaser.Game;
  destroy: () => void;
}
