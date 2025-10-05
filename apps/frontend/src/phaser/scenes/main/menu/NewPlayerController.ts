import Phaser from 'phaser';
import { MENU_BG_COLOR, MENU_BORDER_COLOR } from '../constants';
import { createMenuButton, createNameInput, NameInputControl } from './components';

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
  }

  render() {
    this.destroy();

    const width = this.scene.scale.width || Number(this.scene.game.config.width) || 640;
    const height = this.scene.scale.height || Number(this.scene.game.config.height) || 640;

    const container = this.scene.add.container(width / 2, height / 2);
    const panelWidth = Math.min(width * 0.85, 540);
    const panelHeight = Math.min(height * 0.9, 600); // Increased height for keyboard
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
      parentContainer: container,
      onInput: (value) => {
        this.pendingName = value;
        this.setError();
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

    // Position back button below the keyboard space
    const keyboardSpace = 300; // Space reserved for keyboard
    const backButtonY = nameInputY + keyboardSpace;
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
      backButton.container,
    ]);

    container.bringToTop(backButton.container);

    this.container = container;
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
      return;
    }

    this.setError();
    this.options.onCreatePlayer(name);
  }
}
