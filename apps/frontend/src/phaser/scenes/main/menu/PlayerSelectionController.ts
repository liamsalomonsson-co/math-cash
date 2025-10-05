import Phaser from 'phaser';
import type { GameSession } from '../../../../lib';
import { MENU_BG_COLOR, MENU_BORDER_COLOR, MENU_BUTTON_COLOR } from '../constants';
import { createMenuButton, createSessionStats } from './components';

interface PlayerSelectionOptions {
  onPlayerSelected(session: GameSession): void;
  onBack(): void;
  getSession(): GameSession | null;
}

/**
 * Controller for selecting a saved player to continue with
 * Currently supports single player, but structured for future multi-player support
 */
export class PlayerSelectionController {
  private container?: Phaser.GameObjects.Container;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly options: PlayerSelectionOptions
  ) {}

  destroy() {
    this.container?.destroy(true);
    this.container = undefined;
  }

  render() {
    this.destroy();

    const width = this.scene.scale.width || Number(this.scene.game.config.width) || 640;
    const height = this.scene.scale.height || Number(this.scene.game.config.height) || 640;

    const container = this.scene.add.container(width / 2, height / 2);
    const panelWidth = Math.min(width * 0.85, 540);
    const panelHeight = Math.min(height * 0.9, 620);
    const contentWidth = Math.min(width * 0.7, 420);

    const panel = this.scene.add.rectangle(0, 0, panelWidth, panelHeight, MENU_BG_COLOR, 0.92);
    panel.setOrigin(0.5, 0.5);
    panel.setStrokeStyle(4, MENU_BORDER_COLOR, 0.85);

    const title = this.scene.add
      .text(0, -panelHeight / 2 + 80, '👥 Choose Your Hero', {
        fontFamily: 'Poppins, sans-serif',
        fontSize: '48px',
        color: '#ffffff',
      })
      .setOrigin(0.5, 0.5);

    const subtitle = this.scene.add
      .text(0, title.y + 60, 'Select a saved adventure to continue', {
        fontFamily: 'Poppins, sans-serif',
        fontSize: '20px',
        color: '#dce8ff',
      })
      .setOrigin(0.5, 0.5);

    container.add([panel, title, subtitle]);

    const session = this.options.getSession();
    if (session) {
      // Player card with stats
      const cardY = subtitle.y + 100;
      const statsBoxWidth = panelWidth * 0.82;
      const statsContainer = createSessionStats(this.scene, {
        session,
        width: statsBoxWidth,
        y: cardY,
      });
      container.add(statsContainer);

      // Select button for this player
      const selectButtonY = cardY + 180;
      const selectButton = createMenuButton(this.scene, {
        label: 'Continue as ' + session.player.name,
        y: selectButtonY,
        onClick: () => this.options.onPlayerSelected(session),
        disabled: false,
        fillColor: MENU_BUTTON_COLOR,
        disabledFillColor: 0x1e2b44,
        textColor: '#ffffff',
        glowColor: 0x9bc9ff,
        width: contentWidth,
      });
      container.add(selectButton.container);
    } else {
      // No saved player found
      const noPlayerText = this.scene.add
        .text(0, subtitle.y + 120, 'No saved adventures found.\nStart a new adventure instead!', {
          fontFamily: 'Poppins, sans-serif',
          fontSize: '20px',
          color: '#ffccd5',
          align: 'center',
        })
        .setOrigin(0.5, 0.5);
      container.add(noPlayerText);
    }

    // Back button at the bottom
    const backButtonY = panelHeight / 2 - 80;
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
    container.add(backButton.container);

    this.container = container;
  }
}
