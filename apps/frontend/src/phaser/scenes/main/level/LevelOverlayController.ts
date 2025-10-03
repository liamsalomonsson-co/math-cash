import Phaser from 'phaser';
import type { GameSession } from '../../../../lib';

interface LevelOverlayCallbacks {
  onAdvance(): void;
  onMenu(): void;
}

export class LevelOverlayController {
  private overlay?: Phaser.GameObjects.DOMElement;
  private active = false;

  constructor(private readonly scene: Phaser.Scene) {}

  isActive(): boolean {
    return this.active;
  }

  show(session: GameSession, callbacks: LevelOverlayCallbacks) {
    this.hide();
    this.active = true;

    const container = document.createElement('div');
    container.setAttribute(
      'style',
      'width: min(520px, 92vw); background: rgba(3, 15, 32, 0.96); color: #ffffff; padding: 32px;' +
        'border-radius: 20px; box-shadow: 0 18px 40px rgba(0,0,0,0.45); font-family: Poppins, sans-serif; text-align: center;',
    );

    const heading = document.createElement('div');
    heading.textContent = `🎉 ${session.currentMap.difficulty.toUpperCase()} Complete!`;
    heading.style.fontSize = '30px';
    heading.style.marginBottom = '18px';
    container.appendChild(heading);

    const message = document.createElement('div');
    message.innerHTML = `Earned so far: <strong>💰 ${session.player.currency}</strong><br/>Ready for the next challenge?`;
    message.style.fontSize = '18px';
    message.style.marginBottom = '24px';
    container.appendChild(message);

    const buttonRow = document.createElement('div');
    buttonRow.style.display = 'flex';
    buttonRow.style.gap = '12px';
    buttonRow.style.justifyContent = 'center';

    const continueBtn = document.createElement('button');
    continueBtn.textContent = 'Next Adventure 🚀';
    continueBtn.setAttribute(
      'style',
      'padding: 14px 20px; font-size: 18px; border-radius: 14px; border: none; cursor: pointer; background: #72efdd; color: #031120;',
    );

    const menuBtn = document.createElement('button');
    menuBtn.textContent = 'Return to Menu';
    menuBtn.setAttribute(
      'style',
      'padding: 14px 20px; font-size: 18px; border-radius: 14px; border: none; cursor: pointer; background: #e9ecef; color: #1d3557;',
    );

    buttonRow.appendChild(continueBtn);
    buttonRow.appendChild(menuBtn);
    container.appendChild(buttonRow);

    const dom = this.scene.add.dom(this.scene.scale.width / 2, this.scene.scale.height / 2, container);
    dom.setOrigin(0.5, 0.5);
    dom.setDepth(25);

    continueBtn.addEventListener('click', () => {
      this.hide();
      callbacks.onAdvance();
      this.active = false;
    });

    menuBtn.addEventListener('click', () => {
      this.hide();
      callbacks.onMenu();
      this.active = false;
    });

    this.overlay = dom;
  }

  hide() {
    if (this.overlay) {
      this.overlay.destroy();
      this.overlay = undefined;
    }
    this.active = false;
  }

  handleResize(width: number, height: number) {
    if (!this.overlay) {
      return;
    }

    this.overlay.setPosition(width / 2, height / 2);
  }
}
