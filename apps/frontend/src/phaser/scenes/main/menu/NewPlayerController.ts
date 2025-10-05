import Phaser from 'phaser';
import { MENU_BG_COLOR, MENU_BORDER_COLOR, MENU_BUTTON_COLOR, MENU_BUTTON_DISABLED } from '../constants';
import { createMenuButton, createNameInput, MenuButtonControl, NameInputControl } from './components';

interface NewPlayerOptions {
  onCreatePlayer(name: string): void;
  onBack(): void;
}

/**
 * Controller for creating a new player
 * Shows name input and handles validation
 */
export class NewPlayerController {
  private container?: Phaser.GameObjects.Container;
  private nameInput?: NameInputControl;
  private errorText?: Phaser.GameObjects.Text;
  private createButton?: MenuButtonControl;
  private pendingName = '';

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly options: NewPlayerOptions
  ) {}

  destroy() {
    this.detachNameInput();
    this.container?.destroy(true);
    this.container = undefined;
    this.errorText = undefined;
    this.createButton = undefined;
  }

  render() {
    this.destroy();

    const width = this.scene.scale.width || Number(this.scene.game.config.width) || 640;
    const height = this.scene.scale.height || Number(this.scene.game.config.height) || 640;

    const container = this.scene.add.container(width / 2, height / 2);
    const panelWidth = Math.min(width * 0.85, 540);
    const panelHeight = Math.min(height * 0.75, 500);
    const contentWidth = Math.min(width * 0.7, 420);

    const panel = this.scene.add.rectangle(0, 0, panelWidth, panelHeight, MENU_BG_COLOR, 0.92);
    panel.setOrigin(0.5, 0.5);
    panel.setStrokeStyle(4, MENU_BORDER_COLOR, 0.85);

    const title = this.scene.add
      .text(0, -panelHeight / 2 + 70, '⚔️ Create Your Hero', {
        fontFamily: 'Poppins, sans-serif',
        fontSize: '48px',
        color: '#ffffff',
      })
      .setOrigin(0.5, 0.5);

    const subtitle = this.scene.add
      .text(0, title.y + 60, 'What shall we call you, brave adventurer?', {
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
        this.updateCreateButtonState();
      },
      onSubmit: () => this.handleCreateButton(),
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

    const createButtonY = errorY + 70;
    const createButton = createMenuButton(this.scene, {
      label: 'Begin Adventure',
      y: createButtonY,
      onClick: () => this.handleCreateButton(),
      disabled: !this.hasValidName(),
      fillColor: MENU_BUTTON_COLOR,
      disabledFillColor: MENU_BUTTON_DISABLED,
      textColor: '#ffffff',
      glowColor: 0x9bc9ff,
      width: contentWidth,
    });
    this.createButton = createButton;

    const backButtonY = createButtonY + 86;
    const backButton = createMenuButton(this.scene, {
      label: '← Back to Menu',
      y: backButtonY,
      onClick: () => this.options.onBack(),
      disabled: false,
      fillColor: 0x4361ee,
      disabledFillColor: 0x1e2b44,
      textColor: '#ffffff',
      glowColor: 0x88b2ff,
      width: contentWidth * 0.8,
    });

    container.add([
      panel,
      title,
      subtitle,
      nameInput.container,
      errorText,
      createButton.container,
      backButton.container,
    ]);

    container.bringToTop(createButton.container);
    container.bringToTop(backButton.container);

    this.container = container;
    this.updateCreateButtonState();
  }

  private detachNameInput() {
    if (!this.nameInput) {
      return;
    }

    this.nameInput.destroy();
    this.nameInput = undefined;
  }

  private setError(message?: string) {
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

  private handleCreateButton() {
    const name = this.pendingName.trim();
    if (!name) {
      this.setError('Please enter your name to begin.');
      this.updateCreateButtonState();
      return;
    }

    this.setError();
    this.options.onCreatePlayer(name);
  }

  private hasValidName(): boolean {
    return this.pendingName.trim().length > 0;
  }

  private updateCreateButtonState() {
    this.createButton?.setDisabled(!this.hasValidName());
  }
}
