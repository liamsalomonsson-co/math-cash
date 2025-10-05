import Phaser from 'phaser';
import type { MathChallenge, Tile, MobType } from '../../../../lib';
import { ENCOURAGEMENTS } from '../constants';
import { createNumberPad, type NumberPadControl } from './NumberPad';
import { BubbleShooterMinigame } from './minigames/BubbleShooterMinigame';

// Extended tile type that includes challenge data (for mobs)
interface TileWithChallenge extends Tile {
  challenge?: MathChallenge;
  isCompleted?: boolean;
  mobType?: MobType;
}

interface ChallengeCallbacks {
  onSuccess(tile: TileWithChallenge): void;
  onCancel(tile: TileWithChallenge): void;
  onFailure(tile: TileWithChallenge, penalty: number): void;
  getHint(challenge: MathChallenge): string;
}

interface ChallengeContext {
  container: Phaser.GameObjects.Container;
  scrim: Phaser.GameObjects.Rectangle;
  panel: Phaser.GameObjects.Rectangle;
  answerText: Phaser.GameObjects.Text;
  feedbackText: Phaser.GameObjects.Text;
  hintText: Phaser.GameObjects.Text;
  tile: TileWithChallenge;
  challenge: MathChallenge;
  attempts: number;
  inputValue: string;
  keydownHandler: (event: KeyboardEvent) => void;
  numberPad?: NumberPadControl;
  minigame?: BubbleShooterMinigame;
}

export class ChallengeController {
  private context?: ChallengeContext;
  private active = false;

  constructor(private readonly scene: Phaser.Scene) {}

  isActive(): boolean {
    return this.active;
  }

  present(tile: TileWithChallenge, callbacks: ChallengeCallbacks) {
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
      .text(0, display.y + 70, 'Your answer:', {
        fontFamily: 'Poppins, sans-serif',
        fontSize: '18px',
        color: '#9fb3d9',
      })
      .setOrigin(0.5, 0.5);

    const answerText = this.scene.add
      .text(0, answerLabel.y + 40, '—', {
        fontFamily: 'Poppins, sans-serif',
        fontSize: '42px', // Increased from 32px for better mobile visibility
        color: '#ffd166',
        backgroundColor: 'rgba(255,255,255,0.08)',
        padding: { x: 24, y: 12 }, // Increased padding for larger touch area
      })
      .setOrigin(0.5, 0.5);

    const feedbackText = this.scene.add
      .text(0, answerText.y + 90, '', {
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

    let context!: ChallengeContext;

    // Check if this is a slime mob - use minigame, otherwise use number pad
    const isSlimeMob = tile.mobType === 'slime';

    if (isSlimeMob) {
      // Hide answer UI for minigames
      answerLabel.setVisible(false);
      answerText.setVisible(false);

      // Calculate minigame bounds in absolute screen coordinates
      // (minigame has its own container, not added to challenge container)
      const minigameTop = centerY + display.y + 40;
      const minigameHeight = panelHeight / 2 + 20;
      const minigameLeft = centerX - panelWidth / 2;
      
      // Create bubble shooter minigame
      const minigame = new BubbleShooterMinigame({
        scene: this.scene,
        challenge,
        bounds: {
          x: minigameLeft,
          y: minigameTop,
          width: panelWidth,
          height: minigameHeight,
        },
        onCorrect: () => {
          feedbackText.setText('Brilliant! 🎉');
          callbacks.onSuccess(tile);
          this.hide();
        },
        onIncorrect: () => {
          const penalty = challenge.reward;
          this.hide();
          callbacks.onFailure(tile, penalty);
        },
      });

      container.add([
        scrim,
        background,
        title,
        reward,
        display,
        feedbackText,
        hintText,
      ]);

      // Don't add minigame objects to container - it manages its own container
      // minigame.getGameObjects() are in the minigame's own container

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
        keydownHandler: () => {}, // No keyboard handler for minigame
        numberPad: undefined,
        minigame,
      };

      this.context = context;
    } else {
      // Standard number pad challenge
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
          // After 2 wrong attempts, trigger failure immediately
          const penalty = challenge.reward;
          this.hide();
          callbacks.onFailure(tile, penalty);
          return;
        }
        context.hintText.setText(callbacks.getHint(challenge));
        context.hintText.setVisible(true);
        resetInput();
      };

      const handleNumberPress = (num: string) => {
        if (!context) return;
        if (context.inputValue.length >= 6) return;
        if (num === '-' && context.inputValue.length > 0) return; // Minus only at start
        context.inputValue += num;
        updateAnswerDisplay();
      };

      const handleBackspace = () => {
        if (!context) return;
        context.inputValue = context.inputValue.slice(0, -1);
        updateAnswerDisplay();
      };

      // Create number pad
      const numberPad = createNumberPad({
        scene: this.scene,
        y: answerText.y + 60,
        onNumberPress: handleNumberPress,
        onBackspace: handleBackspace,
        onSubmit: attemptSubmit,
      });

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

      container.add([
        scrim,
        background,
        title,
        reward,
        display,
        answerLabel,
        answerText,
        numberPad.container,
        feedbackText,
        hintText,
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
        numberPad,
      };

      this.context = context;
      updateAnswerDisplay();
      this.scene.input.keyboard?.on('keydown', handleKeyDown);
    }
  }

  hide() {
    if (this.context) {
      this.scene.input.keyboard?.off('keydown', this.context.keydownHandler);
      if (this.context.minigame) {
        this.context.minigame.destroy();
        this.context.minigame = undefined;
      }
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
