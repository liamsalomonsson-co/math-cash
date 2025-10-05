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

    // Check actual parent container size, not Phaser scale (which is always 640)
    const canvas = this.scene.game.canvas;
    const parent = canvas?.parentElement;
    const actualWidth = parent?.clientWidth ?? this.scene.scale.width;
    const isMobile = actualWidth < 500; // True mobile size
    
    const topY = isMobile ? 10 : 20;
    const playerFontSize = isMobile ? '16px' : '20px';
    const statFontSize = isMobile ? '14px' : '18px';
    const instructionFontSize = isMobile ? '12px' : '16px';
    const hintFontSize = isMobile ? '11px' : '14px';

    const player = this.scene.add.text(24, topY, '', {
      fontFamily: 'Poppins, sans-serif',
      fontSize: playerFontSize,
      color: '#ffffff',
    });

    const currency = this.scene.add.text(this.scene.scale.width / 3, topY, '', {
      fontFamily: 'Poppins, sans-serif',
      fontSize: statFontSize,
      color: '#f4d35e',
    });

    const streak = this.scene.add.text(currency.x + 100, topY, '', {
      fontFamily: 'Poppins, sans-serif',
      fontSize: statFontSize,
      color: '#f4f1de',
    });

    const difficulty = this.scene.add.text(streak.x + 180, topY, '', {
      fontFamily: 'Poppins, sans-serif',
      fontSize: statFontSize,
      color: '#bde0fe',
    });

    const instructions = this.scene.add.text(0, 0, isMobile ? 'Swipe to move' : 'Use arrow keys or WASD to move. Step on challenge tiles to play!', {
      fontFamily: 'Poppins, sans-serif',
      fontSize: instructionFontSize,
      color: '#cbd5f5',
      align: 'center',
      wordWrap: { width: Math.min(this.scene.scale.width - 0, 520) },
    });

    const menuHint = this.scene.add.text(0, 0, 'Press M to open the menu at any time.', {
      fontFamily: 'Poppins, sans-serif',
      fontSize: hintFontSize,
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
    
    // Show coin multiplier status if active
    const coinText = player.coinMultiplierCharges > 0 
      ? `💰 Coins: ${player.currency} (2x ×${player.coinMultiplierCharges})`
      : `💰 Coins: ${player.currency}`;
    this.texts.currency.setText(coinText);
    
    this.texts.streak.setText(`🔥 Current Streak: ${player.currentStreak}`);
    this.texts.difficulty.setText(`🎯 Level: ${currentMap.difficulty}`);
  }

  position() {
    if (!this.texts) {
      return;
    }

    // Check actual parent container size
    const canvas = this.scene.game.canvas;
    const parent = canvas?.parentElement;
    const actualWidth = parent?.clientWidth ?? this.scene.scale.width;
    const isMobile = actualWidth < 500;
    
    const centerX = this.scene.scale.width / 2;
    const bottomY = (this.scene.scale.height || Number(this.scene.game.config.height) || 640) - (isMobile ? 10 : 24);

    this.texts.instructions.setPosition(centerX, bottomY - (isMobile ? 5 : 15));
    this.texts.instructions.setOrigin(0.5, 1);

    this.texts.menuHint.setPosition(centerX, bottomY + (isMobile ? 5 : 15));
    this.texts.menuHint.setOrigin(0.5, 1);
  }
}
