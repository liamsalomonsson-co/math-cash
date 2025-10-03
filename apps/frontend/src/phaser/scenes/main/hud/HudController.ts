import Phaser from 'phaser';
import type { GameSession } from '../../../../lib';

interface HudTexts {
  player: Phaser.GameObjects.Text;
  currency: Phaser.GameObjects.Text;
  streak: Phaser.GameObjects.Text;
  difficulty: Phaser.GameObjects.Text;
  instructions: Phaser.GameObjects.Text;
  menuHint: Phaser.GameObjects.Text;
}

export class HudController {
  private container?: Phaser.GameObjects.Container;
  private texts?: HudTexts;

  constructor(private readonly scene: Phaser.Scene) {}

  destroy() {
    this.container?.destroy(true);
    this.container = undefined;
    this.texts = undefined;
  }

  setVisible(visible: boolean) {
    this.container?.setVisible(visible);
  }

  render() {
    if (this.container) {
      this.container.setVisible(true);
      this.position();
      return;
    }

    const container = this.scene.add.container(0, 0);
    container.setDepth(20);

    const player = this.scene.add.text(24, 20, '', {
      fontFamily: 'Poppins, sans-serif',
      fontSize: '20px',
      color: '#ffffff',
    });

    const currency = this.scene.add.text(this.scene.scale.width / 3, 20, '', {
      fontFamily: 'Poppins, sans-serif',
      fontSize: '18px',
      color: '#f4d35e',
    });

    const streak = this.scene.add.text(currency.x + 100, 20, '', {
      fontFamily: 'Poppins, sans-serif',
      fontSize: '18px',
      color: '#f4f1de',
    });

    const difficulty = this.scene.add.text(streak.x + 180, 20, '', {
      fontFamily: 'Poppins, sans-serif',
      fontSize: '18px',
      color: '#bde0fe',
    });

    const instructions = this.scene.add.text(0, 0, 'Use arrow keys or WASD to move. Step on challenge tiles to play!', {
      fontFamily: 'Poppins, sans-serif',
      fontSize: '16px',
      color: '#cbd5f5',
      align: 'center',
      wordWrap: { width: Math.min(this.scene.scale.width - 0, 520) },
    });

    const menuHint = this.scene.add.text(0, 0, 'Press M to open the menu at any time.', {
      fontFamily: 'Poppins, sans-serif',
      fontSize: '14px',
      color: '#8ecae6',
      align: 'center',
    });

    container.add([player, currency, streak, difficulty, instructions, menuHint]);

    this.container = container;
    this.texts = { player, currency, streak, difficulty, instructions, menuHint };
    this.position();
  }

  update(session: GameSession) {
    if (!this.texts) {
      return;
    }

    const { player, currentMap } = session;
    this.texts.player.setText(`${player.name}'s Adventure`);
    this.texts.currency.setText(`💰 Coins: ${player.currency}`);
    this.texts.streak.setText(`🔥 Current Streak: ${player.currentStreak}`);
    this.texts.difficulty.setText(`🎯 Level: ${currentMap.difficulty}`);
  }

  position() {
    if (!this.texts) {
      return;
    }

    const centerX = this.scene.scale.width / 2;
    const bottomY = (this.scene.scale.height || Number(this.scene.game.config.height) || 640) - 24;

    this.texts.instructions.setPosition(centerX, bottomY - 15);
    this.texts.instructions.setOrigin(0.5, 1);

    this.texts.menuHint.setPosition(centerX, bottomY + 15);
    this.texts.menuHint.setOrigin(0.5, 1);
  }
}
