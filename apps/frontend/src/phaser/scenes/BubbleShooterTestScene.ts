import Phaser from 'phaser';
import { BubbleShooterMinigame } from './main/challenge/minigames/BubbleShooterMinigame';
import type { MathChallenge } from '../../lib';

/**
 * Test scene for developing the BubbleShooter minigame in isolation
 * To use: Set TEST_BUBBLE_SHOOTER=true in main.ts
 */
export class BubbleShooterTestScene extends Phaser.Scene {
  private minigame?: BubbleShooterMinigame;
  private attemptsText?: Phaser.GameObjects.Text;
  private statusText?: Phaser.GameObjects.Text;
  private attempts = 0;
  private successes = 0;
  private failures = 0;

  constructor() {
    super({ key: 'BubbleShooterTestScene' });
  }

  preload() {
    // Load crossbow sprite
    this.load.image('crossbow', '/assets/sprites/crossbow.png');
  }

  create() {
    const { width, height } = this.scale;

    // Background
    this.add.rectangle(0, 0, width, height, 0x020d1d).setOrigin(0, 0);

    // Title
    this.add
      .text(width / 2, 30, 'Bubble Shooter Test Scene', {
        fontFamily: 'Poppins, sans-serif',
        fontSize: '28px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5, 0);

    // Instructions
    this.add
      .text(width / 2, 70, 'Pull and release to shoot arrows at bubbles', {
        fontFamily: 'Poppins, sans-serif',
        fontSize: '16px',
        color: '#9fb3d9',
      })
      .setOrigin(0.5, 0);

    // Stats display
    this.attemptsText = this.add
      .text(20, height - 80, '', {
        fontFamily: 'Poppins, sans-serif',
        fontSize: '14px',
        color: '#ffffff',
      })
      .setOrigin(0, 0);

    this.statusText = this.add
      .text(width / 2, height - 50, 'Press SPACE to restart', {
        fontFamily: 'Poppins, sans-serif',
        fontSize: '16px',
        color: '#4cc9f0',
      })
      .setOrigin(0.5, 0);

    // Start first minigame
    this.startMinigame();

    // Keyboard shortcuts
    this.input.keyboard?.on('keydown-SPACE', () => {
      this.restartMinigame();
    });

    this.input.keyboard?.on('keydown-ESC', () => {
      this.restartMinigame();
    });

    this.updateStatsDisplay();
  }

  private startMinigame() {
    // Create a test challenge
    const challenge: MathChallenge = {
      id: `test-${Date.now()}`,
      operation: 'addition',
      operands: [5, 3],
      correctAnswer: 8,
      difficulty: 'easy',
      reward: 10,
    };

    const { width, height } = this.scale;
    const panelWidth = Math.min(width * 0.9, 520);
    const panelHeight = Math.min(height * 0.7, 440);

    // Display the challenge
    const challengeText = this.add
      .text(width / 2, 120, `${challenge.operands[0]} + ${challenge.operands[1]} = ?`, {
        fontFamily: 'Poppins, sans-serif',
        fontSize: '32px',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5, 0);

    const answerText = this.add
      .text(width / 2, 160, `Correct answer: ${challenge.correctAnswer}`, {
        fontFamily: 'Poppins, sans-serif',
        fontSize: '18px',
        color: '#ffd166',
      })
      .setOrigin(0.5, 0);

    // Create minigame
    this.minigame = new BubbleShooterMinigame({
      scene: this,
      challenge,
      bounds: {
        x: (width - panelWidth) / 2,
        y: 200,
        width: panelWidth,
        height: panelHeight,
      },
      onCorrect: () => {
        this.successes++;
        this.statusText?.setText('✅ CORRECT! Press SPACE to try again');
        this.statusText?.setColor('#00ff00');
        this.updateStatsDisplay();
        challengeText.destroy();
        answerText.destroy();
      },
      onIncorrect: () => {
        this.failures++;
        this.statusText?.setText('❌ FAILED! Press SPACE to try again');
        this.statusText?.setColor('#ff0000');
        this.updateStatsDisplay();
        challengeText.destroy();
        answerText.destroy();
      },
    });

    this.attempts++;
  }

  private restartMinigame() {
    if (this.minigame) {
      this.minigame.destroy();
      this.minigame = undefined;
    }

    this.statusText?.setText('Press SPACE to restart');
    this.statusText?.setColor('#4cc9f0');

    this.startMinigame();
  }

  private updateStatsDisplay() {
    this.attemptsText?.setText(
      `Attempts: ${this.attempts} | Successes: ${this.successes} | Failures: ${this.failures}`
    );
  }
}
