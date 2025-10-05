import Phaser from 'phaser';
import { MainScene } from './scenes/main/MainScene';
import { BubbleShooterTestScene } from './scenes/BubbleShooterTestScene';
import type { PhaserGameHandle } from './types';

const BASE_WIDTH = 640;
const BASE_HEIGHT = 640;

// Check for test mode via URL parameter (?test=bubble) or localStorage
function getTestMode(): string | null {
  const urlParams = new URLSearchParams(window.location.search);
  const urlTest = urlParams.get('test');
  if (urlTest) {
    return urlTest;
  }
  return localStorage.getItem('mathcash_test_mode');
}

export function createGame(parent: HTMLElement): PhaserGameHandle {
  const testMode = getTestMode();
  
  // Determine which scene to use
  let initialScene: typeof MainScene | typeof BubbleShooterTestScene = MainScene;
  let sceneName = 'MainScene';
  
  if (testMode === 'bubble') {
    initialScene = BubbleShooterTestScene;
    sceneName = 'BubbleShooterTestScene';
    console.log('🎯 Running in BUBBLE SHOOTER TEST MODE');
  }
  
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
    scene: [initialScene],
    render: {
      pixelArt: false,
      antialias: true,
      roundPixels: true,
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
    const scene = game.scene.getScene(sceneName) as MainScene | BubbleShooterTestScene | undefined;
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
