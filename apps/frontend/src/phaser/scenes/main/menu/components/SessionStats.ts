import Phaser from 'phaser';
import type { GameSession } from '@math-cash/shared';
import { MENU_BORDER_COLOR } from '../../constants';

interface SessionStatsOptions {
  session: GameSession;
  y: number;
  width: number;
}

export function createSessionStats(scene: Phaser.Scene, options: SessionStatsOptions): Phaser.GameObjects.Container {
  const { session, y, width } = options;
  const container = scene.add.container(0, y);

  const statsBoxHeight = 120;

  const background = scene.add.rectangle(0, 0, width, statsBoxHeight, 0x0f2239, 0.65);
  background.setOrigin(0.5, 0.5);
  background.setStrokeStyle(2, MENU_BORDER_COLOR, 0.6);
  background.setDepth(-1);

  const { player, currentMap } = session;
  const statsLines = [
    `Explorer: ${player.name}`,
    `Coins: ${player.currency}`,
    `Best Streak: ${player.bestStreak}`,
    `Current Level: ${currentMap.difficulty}`,
  ];

  const text = scene.add
    .text(0, 0, statsLines.join('\n'), {
      fontFamily: 'Poppins, sans-serif',
      fontSize: '18px',
      color: '#cbd5f5',
      align: 'center',
      lineSpacing: 6,
    })
    .setOrigin(0.5, 0.5);

  container.add([background, text]);
  container.setSize(width, statsBoxHeight);

  return container;
}
