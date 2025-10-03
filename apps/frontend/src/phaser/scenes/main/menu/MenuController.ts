import Phaser from 'phaser';
import type { GameSession } from '@math-cash/shared';
import { MENU_BG_COLOR, MENU_BORDER_COLOR, MENU_BUTTON_COLOR, MENU_BUTTON_DISABLED } from '../constants';
import { createMenuButton, createNameInput, createSessionStats, MenuButtonControl, NameInputControl } from './components';

interface MenuControllerOptions {
  onStart(name: string): void;
  onContinue(): void;
  getSession(): GameSession | null;
}

export class MenuController {
  private container?: Phaser.GameObjects.Container;
  private nameInput?: NameInputControl;
  private errorText?: Phaser.GameObjects.Text;
  private startButton?: MenuButtonControl;
  private pendingName = '';

  constructor(private readonly scene: Phaser.Scene, private readonly options: MenuControllerOptions) {}

  destroy() {
    this.detachNameInput();
    this.container?.destroy(true);
    this.container = undefined;
    this.errorText = undefined;
    this.startButton = undefined;
  }

  setPendingName(name: string) {
    this.pendingName = name;
    this.nameInput?.setValue(name);
    this.updateStartButtonState();
  }

  getPendingName(): string {
    return this.pendingName;
  }

  render() {
    this.destroy();

    const width = this.scene.scale.width || Number(this.scene.game.config.width) || 640;
    const height = this.scene.scale.height || Number(this.scene.game.config.height) || 640;

    const container = this.scene.add.container(width / 2, height / 2);
    const panelWidth = Math.min(width * 0.85, 540);
    const panelHeight = Math.min(height * 0.9, 620);
  const contentWidth = Math.min((this.scene.scale.width || 640) * 0.7, 420);

    const panel = this.scene.add.rectangle(0, 0, panelWidth, panelHeight, MENU_BG_COLOR, 0.92);
    panel.setOrigin(0.5, 0.5);
    panel.setStrokeStyle(4, MENU_BORDER_COLOR, 0.85);

    const title = this.scene.add
      .text(0, -panelHeight / 2 + 80, '🏰 Math Cash', {
        fontFamily: 'Poppins, sans-serif',
        fontSize: '52px',
        color: '#ffffff',
      })
      .setOrigin(0.5, 0.5);

    const subtitle = this.scene.add
      .text(0, title.y + 60, 'Choose your adventure to begin!', {
        fontFamily: 'Poppins, sans-serif',
        fontSize: '20px',
        color: '#dce8ff',
      })
      .setOrigin(0.5, 0.5);

  const nameInputY = subtitle.y + 90;
    const nameInput = createNameInput(this.scene, {
      y: nameInputY,
      width: contentWidth,
      initialValue: this.pendingName,
      onInput: (value) => {
        this.pendingName = value;
        this.setError();
        this.updateStartButtonState();
      },
      onSubmit: () => this.handleStartButton(),
    });
    this.nameInput = nameInput;

    const errorY = nameInputY + 60;
    const errorText = this.scene.add
      .text(0, errorY, '', {
        fontFamily: 'Poppins, sans-serif',
        fontSize: '16px',
        color: '#ffccd5',
      })
      .setOrigin(0.5, 0.5)
      .setVisible(false);
    this.errorText = errorText;

    const startButtonY = errorY + 80;
    const startButton = createMenuButton(this.scene, {
      label: 'Start Adventure',
      y: startButtonY,
      onClick: () => this.handleStartButton(),
      disabled: !this.hasValidName(),
      fillColor: MENU_BUTTON_COLOR,
      disabledFillColor: MENU_BUTTON_DISABLED,
      textColor: '#ffffff',
      glowColor: 0x9bc9ff,
      width: contentWidth,
    });
    this.startButton = startButton;

    const hasSession = Boolean(this.options.getSession());
    const continueButtonY = startButtonY + 86;
    const continueButton = createMenuButton(this.scene, {
      label: hasSession ? 'Continue Journey' : 'Continue (Locked)',
      y: continueButtonY,
      onClick: () => this.options.onContinue(),
      disabled: !hasSession,
      fillColor: 0x4361ee,
      disabledFillColor: 0x1e2b44,
      textColor: '#ffffff',
      glowColor: 0x88b2ff,
      width: contentWidth,
    });

    container.add([
      panel,
      title,
      subtitle,
      nameInput.container,
      errorText,
      startButton.container,
      continueButton.container,
    ]);

    const session = this.options.getSession();
    if (session) {
      const statsBoxWidth = panelWidth * 0.82;
      const statsY = continueButtonY + 120;
      const statsContainer = createSessionStats(this.scene, {
        session,
        width: statsBoxWidth,
        y: statsY,
      });
      container.add(statsContainer);
    }

    const hint = this.scene.add
      .text(0, panelHeight / 2 - 40, 'Tip: Use arrow keys or WASD once the game starts. Press M to return here.', {
        fontFamily: 'Poppins, sans-serif',
        fontSize: '16px',
        color: '#9fb3d9',
        align: 'center',
      })
      .setOrigin(0.5, 0.5);
    container.add(hint);

    container.bringToTop(startButton.container);
    container.bringToTop(continueButton.container);

    this.container = container;
    this.updateStartButtonState();
  }

  private detachNameInput() {
    if (!this.nameInput) {
      return;
    }

    this.nameInput.destroy();
    this.nameInput = undefined;
  }

  setError(message?: string) {
    if (!this.errorText) {
      return;
    }

    if (!message) {
      this.errorText.setVisible(false);
      this.errorText.setText('');
      return;
    }

    this.errorText.setVisible(true);
    this.errorText.setText(message);
  }

  private handleStartButton() {
    const name = this.pendingName.trim();
    if (!name) {
      this.setError('Please enter your name to begin.');
      this.updateStartButtonState();
      return;
    }

    this.setError();
    this.options.onStart(name);
  }

  private hasValidName(): boolean {
    return this.pendingName.trim().length > 0;
  }

  private updateStartButtonState() {
    this.startButton?.setDisabled(!this.hasValidName());
  }
}
