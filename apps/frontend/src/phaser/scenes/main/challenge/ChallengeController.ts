import Phaser from 'phaser';
import type { MathChallenge, Tile } from '../../../../lib';
import { ENCOURAGEMENTS } from '../constants';

interface ChallengeCallbacks {
  onSuccess(tile: Tile): void;
  onCancel(tile: Tile): void;
  onFailure(tile: Tile, penalty: number): void;
  getHint(challenge: MathChallenge): string;
}

interface ChallengeContext {
  container: Phaser.GameObjects.Container;
  scrim: Phaser.GameObjects.Rectangle;
  panel: Phaser.GameObjects.Rectangle;
  answerText: Phaser.GameObjects.Text;
  feedbackText: Phaser.GameObjects.Text;
  hintText: Phaser.GameObjects.Text;
  tile: Tile;
  challenge: MathChallenge;
  attempts: number;
  inputValue: string;
  keydownHandler: (event: KeyboardEvent) => void;
}

export class ChallengeController {
  private context?: ChallengeContext;
  private active = false;

  constructor(private readonly scene: Phaser.Scene) {}

  isActive(): boolean {
    return this.active;
  }

  present(tile: Tile, callbacks: ChallengeCallbacks) {
    if (!tile.challenge || tile.isCompleted) {
      return;
    }

    this.hide();
    this.active = true;

    const challenge = tile.challenge;
    const centerX = this.scene.scale.width / 2;
    const centerY = this.scene.scale.height / 2;
    const panelWidth = Math.min(this.scene.scale.width * 0.8, 520);
    const panelHeight = Math.min(this.scene.scale.height * 0.8, 440);

    const container = this.scene.add.container(centerX, centerY);
    container.setDepth(30);

    const scrim = this.scene.add.rectangle(0, 0, this.scene.scale.width, this.scene.scale.height, 0x020d1d, 0.55);
    scrim.setOrigin(0.5, 0.5);

    const background = this.scene.add.rectangle(0, 0, panelWidth, panelHeight, 0x061023, 0.95);
    background.setOrigin(0.5, 0.5);
    background.setStrokeStyle(3, 0x4cc9f0, 0.6);

    const title = this.scene.add
      .text(0, -panelHeight / 2 + 70, `${this.getDifficultyEmoji(challenge.difficulty)} Math Challenge`, {
        fontFamily: 'Poppins, sans-serif',
        fontSize: '30px',
        color: '#ffffff',
      })
      .setOrigin(0.5, 0.5);

    const reward = this.scene.add
      .text(0, title.y + 40, `Reward: 💰 ${challenge.reward} coins`, {
        fontFamily: 'Poppins, sans-serif',
        fontSize: '18px',
        color: '#cfe1ff',
      })
      .setOrigin(0.5, 0.5);

    const display = this.scene.add
      .text(0, reward.y + 60, this.formatChallenge(challenge.operation, challenge.operands), {
        fontFamily: 'Poppins, sans-serif',
        fontSize: '36px',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5, 0.5);

    const answerLabel = this.scene.add
      .text(0, display.y + 70, 'Type your answer using the keyboard:', {
        fontFamily: 'Poppins, sans-serif',
        fontSize: '18px',
        color: '#9fb3d9',
      })
      .setOrigin(0.5, 0.5);

    const answerText = this.scene.add
      .text(0, answerLabel.y + 40, '—', {
        fontFamily: 'Poppins, sans-serif',
        fontSize: '32px',
        color: '#ffd166',
        backgroundColor: 'rgba(255,255,255,0.08)',
        padding: { x: 16, y: 8 },
      })
      .setOrigin(0.5, 0.5);

    const feedbackText = this.scene.add
      .text(0, answerText.y + 60, '', {
        fontFamily: 'Poppins, sans-serif',
        fontSize: '16px',
        color: '#ffe066',
        align: 'center',
        wordWrap: { width: panelWidth * 0.8 },
      })
      .setOrigin(0.5, 0.5);

    const hintText = this.scene.add
      .text(0, feedbackText.y + 40, '', {
        fontFamily: 'Poppins, sans-serif',
        fontSize: '15px',
        color: '#ffccd5',
        align: 'center',
        wordWrap: { width: panelWidth * 0.85 },
      })
      .setOrigin(0.5, 0.5)
      .setVisible(false);

    const buttonsY = hintText.y + 70;
    const buttonOffset = Math.min(panelWidth * 0.25, 120);

    let context!: ChallengeContext;

    const updateAnswerDisplay = () => {
      context.answerText.setText(context.inputValue.length > 0 ? context.inputValue : '—');
    };

    const resetInput = () => {
      context.inputValue = '';
      updateAnswerDisplay();
    };

    const attemptSubmit = () => {
      const trimmed = context.inputValue.trim();
      if (!trimmed) {
        context.feedbackText.setText('Please enter a number to submit!');
        return;
      }

      const numericAnswer = Number(trimmed);
      if (!Number.isFinite(numericAnswer)) {
        context.feedbackText.setText('That did not look like a number. Try again!');
        return;
      }

      context.attempts += 1;

      if (numericAnswer === challenge.correctAnswer) {
        context.feedbackText.setText('Brilliant! 🎉');
        callbacks.onSuccess(tile);
        this.hide();
        return;
      }

      context.feedbackText.setText(ENCOURAGEMENTS[Math.min(context.attempts - 1, ENCOURAGEMENTS.length - 1)]);
      if (context.attempts >= 2) {
        // After 2 wrong attempts, show hint briefly then trigger failure
        context.hintText.setText('❌ Failed! Penalty: -' + challenge.reward + ' coins');
        context.hintText.setVisible(true);
        
        // Wait 2 seconds to show the failure message, then trigger failure callback
        this.scene.time.delayedCall(2000, () => {
          const penalty = challenge.reward;
          this.hide();
          callbacks.onFailure(tile, penalty);
        });
        return;
      }
      context.hintText.setText(callbacks.getHint(challenge));
      context.hintText.setVisible(true);
      resetInput();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!this.context) {
        return;
      }

      const { key } = event;

      if (key === 'Enter') {
        event.preventDefault();
        attemptSubmit();
        return;
      }

      if (key === 'Escape') {
        event.preventDefault();
        this.hide();
        callbacks.onCancel(tile);
        return;
      }

      if (key === 'Backspace') {
        event.preventDefault();
        context.inputValue = context.inputValue.slice(0, -1);
        updateAnswerDisplay();
        return;
      }

      if (/^[0-9]$/.test(key) || (key === '-' && context.inputValue.length === 0)) {
        event.preventDefault();
        if (context.inputValue.length >= 6) {
          return;
        }
        context.inputValue += key;
        updateAnswerDisplay();
      }
    };

    const submitButton = this.createOverlayButton('Submit Answer ✨', -buttonOffset, buttonsY, attemptSubmit);
    const cancelButton = this.createOverlayButton('Cancel', buttonOffset, buttonsY, () => {
      this.hide();
      callbacks.onCancel(tile);
    }, {
      backgroundColor: 0xe9ecef,
      textColor: '#1d3557',
    });

    container.add([
      scrim,
      background,
      title,
      reward,
      display,
      answerLabel,
      answerText,
      feedbackText,
      hintText,
      submitButton,
      cancelButton,
    ]);

    context = {
      container,
      scrim,
      panel: background,
      answerText,
      feedbackText,
      hintText,
      tile,
      challenge,
      attempts: 0,
      inputValue: '',
      keydownHandler: handleKeyDown,
    };

    this.context = context;
    updateAnswerDisplay();
    this.scene.input.keyboard?.on('keydown', handleKeyDown);
  }

  hide() {
    if (this.context) {
      this.scene.input.keyboard?.off('keydown', this.context.keydownHandler);
      this.context.container.destroy(true);
      this.context = undefined;
    }
    this.active = false;
  }

  handleResize(width: number, height: number) {
    if (!this.context) {
      return;
    }

    const { container, scrim } = this.context;
    scrim.setSize(width, height);
    scrim.setDisplaySize(width, height);
    container.setPosition(width / 2, height / 2);
  }

  private createOverlayButton(
    label: string,
    x: number,
    y: number,
    handler: () => void,
    options?: { backgroundColor?: number; textColor?: string; alpha?: number },
  ) {
    const width = Math.min((this.scene.scale.width || 640) * 0.4, 220);
    const height = 56;
    const container = this.scene.add.container(x, y);
    const backgroundColor = options?.backgroundColor ?? 0x4895ef;
    const alpha = options?.alpha ?? 0.95;
    const textColor = options?.textColor ?? '#ffffff';

    const background = this.scene.add.rectangle(0, 0, width, height, backgroundColor, alpha);
    background.setOrigin(0.5, 0.5);
    background.setStrokeStyle(2, 0xffffff, 0.25);
    background.setInteractive({ useHandCursor: true });

    const text = this.scene.add
      .text(0, 0, label, {
        fontFamily: 'Poppins, sans-serif',
        fontSize: '20px',
        color: textColor,
      })
      .setOrigin(0.5, 0.5);

    container.add([background, text]);
    container.setSize(width, height);

    background.on('pointerover', () => {
      background.setAlpha(Math.min(1, alpha + 0.1));
    });
    background.on('pointerout', () => {
      background.setAlpha(alpha);
      background.setScale(1);
    });
    background.on('pointerdown', () => {
      background.setScale(0.97);
    });
    background.on('pointerup', () => {
      background.setScale(1);
      handler();
    });
    background.on('pointerupoutside', () => background.setScale(1));

    return container;
  }

  private formatChallenge(operation: MathChallenge['operation'], operands: number[]): string {
    const [a, b] = operands;
    const symbols: Record<MathChallenge['operation'], string> = {
      addition: '+',
      subtraction: '-',
      multiplication: '×',
      division: '÷',
    };
    return `${a} ${symbols[operation]} ${b} = ?`;
  }

  private getDifficultyEmoji(difficulty: MathChallenge['difficulty']): string {
    switch (difficulty) {
      case 'infant':
        return '🍼';
      case 'toddler':
        return '🧸';
      case 'beginner':
        return '🌱';
      case 'easy':
        return '⭐';
      case 'medium':
        return '🔥';
      case 'hard':
        return '💎';
      case 'expert':
        return '🏆';
      default:
        return '📚';
    }
  }
}
