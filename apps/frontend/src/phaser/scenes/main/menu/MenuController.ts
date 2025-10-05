import Phaser from 'phaser';
import type { GameSession } from '../../../../lib';
import { MENU_BG_COLOR, MENU_BORDER_COLOR, MENU_BUTTON_COLOR } from '../constants';
import { createMenuButton, createSessionStats } from './components';

interface MenuControllerOptions {
  onStartAdventure(): void;
  onContinueJourney(): void;
  getSession(): GameSession | null;
}

export class MenuController {
  private container?: Phaser.GameObjects.Container;

  constructor(private readonly scene: Phaser.Scene, private readonly options: MenuControllerOptions) {}

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
      .text(0, -panelHeight / 2 + 80, '🏰 Math Cash', {
        fontFamily: 'Poppins, sans-serif',
        fontSize: '52px',
        color: '#ffffff',
      })
      .setOrigin(0.5, 0.5);

    const subtitle = this.scene.add
      .text(0, title.y + 60, 'Embark on your mathematical adventure!', {
        fontFamily: 'Poppins, sans-serif',
        fontSize: '20px',
        color: '#dce8ff',
      })
      .setOrigin(0.5, 0.5);

    const startButtonY = subtitle.y + 120;
    const startButton = createMenuButton(this.scene, {
      label: 'Start Adventure',
      y: startButtonY,
      onClick: () => this.options.onStartAdventure(),
      disabled: false,
      fillColor: MENU_BUTTON_COLOR,
      disabledFillColor: 0x1e2b44,
      textColor: '#ffffff',
      glowColor: 0x9bc9ff,
      width: contentWidth,
    });

    const hasSession = Boolean(this.options.getSession());
    const continueButtonY = startButtonY + 86;
    const continueButton = createMenuButton(this.scene, {
      label: hasSession ? 'Continue Journey' : 'Continue (Locked)',
      y: continueButtonY,
      onClick: () => this.options.onContinueJourney(),
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
      .text(0, panelHeight / 2 - 50, 'Tip: Swipe or use arrow keys to move. Press M to return here.', {
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
  }
}
