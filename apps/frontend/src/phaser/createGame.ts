import Phaser from 'phaser';
import { MainScene } from './scenes/MainScene';
import type { PhaserGameHandle } from './types';

const BASE_WIDTH = 640;
const BASE_HEIGHT = 640;

export function createGame(parent: HTMLElement): PhaserGameHandle {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: BASE_WIDTH,
    height: BASE_HEIGHT,
    backgroundColor: '#0b1e3f',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: BASE_WIDTH,
      height: BASE_HEIGHT,
    },
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false,
      },
    },
    dom: {
      createContainer: true,
    },
    scene: [MainScene],
    render: {
      pixelArt: false,
      antialias: true,
    },
  });
  const canvas = game.canvas;
  const focusCanvas = () => {
    if (!canvas) {
      return;
    }
    if (canvas.getAttribute('tabindex') !== '0') {
      canvas.setAttribute('tabindex', '0');
    }
    if (document.activeElement !== canvas) {
      try {
        canvas.focus({ preventScroll: true });
      } catch (error) {
        // Safari does not support the options object.
        canvas.focus();
      }
    }
  };

  if (canvas) {
    canvas.setAttribute('tabindex', '0');
    canvas.addEventListener('pointerdown', focusCanvas);
  }

  const ensureSceneReady = () => {
    const scene = game.scene.getScene('MainScene') as MainScene | undefined;
    if (!scene) {
      return;
    }

    if (scene.scene.isActive()) {
      focusCanvas();
      return;
    }

    scene.events.once(Phaser.Scenes.Events.CREATE, focusCanvas);
  };

  if (game.isBooted) {
    ensureSceneReady();
  } else {
    game.events.once(Phaser.Core.Events.READY, ensureSceneReady);
  }

  return {
    game,
    destroy() {
      game.events.off(Phaser.Core.Events.READY, ensureSceneReady);
      if (canvas) {
        canvas.removeEventListener('pointerdown', focusCanvas);
      }
      game.destroy(true);
    },
  };
}
