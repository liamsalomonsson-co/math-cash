import Phaser from 'phaser';
import { MENU_BUTTON_COLOR, MENU_BUTTON_DISABLED } from '../../constants';

export interface MenuButtonConfig {
  label: string;
  y: number;
  onClick: () => void;
  disabled?: boolean;
  fillColor?: number;
  disabledFillColor?: number;
  textColor?: string;
  glowColor?: number;
  glowAlpha?: number;
  width?: number;
}

export interface MenuButtonControl {
  container: Phaser.GameObjects.Container;
  setDisabled(disabled: boolean): void;
  setLabel(label: string): void;
}

export function createMenuButton(scene: Phaser.Scene, config: MenuButtonConfig): MenuButtonControl {
  const {
    label,
    y,
    onClick,
    disabled = false,
    fillColor = MENU_BUTTON_COLOR,
    disabledFillColor = MENU_BUTTON_DISABLED,
    textColor = '#ffffff',
    glowColor = 0x9bc9ff,
    glowAlpha = 0.3,
    width: explicitWidth,
  } = config;

  const width = explicitWidth ?? Math.min((scene.scale.width || 640) * 0.7, 420);
  const height = 72;

  const container = scene.add.container(0, y);

  const glow = scene.add.rectangle(0, 0, width + 24, height + 18, glowColor, 0.25);
  glow.setOrigin(0.5, 0.5);
  glow.setAlpha(0);

  const background = scene.add.rectangle(0, 0, width, height, fillColor, 1);
  background.setOrigin(0.5, 0.5);
  background.setStrokeStyle(3, 0xffffff, 0.32);
  background.setAlpha(0.95);

  const labelText = scene.add
    .text(0, 0, label, {
      fontFamily: 'Poppins, sans-serif',
      fontSize: '26px',
      fontStyle: 'bold',
      color: textColor,
    })
    .setOrigin(0.5, 0.5);

  container.add([glow, background, labelText]);
  container.setSize(width, height);

  let hoverTween: Phaser.Tweens.Tween | null = null;
  let glowTween: Phaser.Tweens.Tween | null = null;
  let pressTween: Phaser.Tweens.Tween | null = null;
  let isDisabled = disabled;

  const stopHoverTweens = () => {
    hoverTween?.stop();
    glowTween?.stop();
    hoverTween = null;
    glowTween = null;
  };

  const stopPressTween = () => {
    pressTween?.stop();
    pressTween = null;
  };

  const animateHover = (over: boolean) => {
    stopHoverTweens();
    const targetGlowAlpha = over ? glowAlpha : 0;
    hoverTween = scene.tweens.add({
      targets: background,
      scaleX: over ? 1.05 : 1,
      scaleY: over ? 1.08 : 1,
      duration: 150,
      ease: 'Quad.easeOut',
    });
    glowTween = scene.tweens.add({
      targets: glow,
      alpha: targetGlowAlpha,
      duration: 150,
      ease: 'Quad.easeOut',
    });
  };

  const animatePress = (down: boolean) => {
    stopPressTween();
    pressTween = scene.tweens.add({
      targets: background,
      scaleX: down ? 0.97 : 1,
      scaleY: down ? 0.97 : 1,
      duration: 110,
      ease: 'Quad.easeOut',
      onComplete: () => {
        pressTween = null;
        if (!down) {
          animateHover(true);
        }
      },
    });
  };

  const applyDisabledState = () => {
    if (isDisabled) {
      background.setFillStyle(disabledFillColor, 1);
      background.setAlpha(0.5);
      background.disableInteractive();
      if (background.input) {
        background.input.cursor = 'default';
      }
      labelText.setAlpha(0.6);
      glow.setAlpha(0);
      glow.setScale(1);
      background.setScale(1);
    } else {
      background.setFillStyle(fillColor, 1);
      background.setAlpha(0.95);
      background.setInteractive({ useHandCursor: true });
      if (background.input) {
        background.input.cursor = 'pointer';
      }
      labelText.setAlpha(1);
    }
  };

  background.setInteractive({ useHandCursor: true });

  background.on('pointerover', () => {
    if (isDisabled) {
      return;
    }
    animateHover(true);
  });

  background.on('pointerout', () => {
    stopPressTween();
    animateHover(false);
  });

  background.on('pointerdown', () => {
    if (isDisabled) {
      return;
    }
    animatePress(true);
  });

  background.on('pointerup', () => {
    if (isDisabled) {
      animateHover(false);
      return;
    }
    animatePress(false);
    onClick();
  });

  background.on('pointerupoutside', () => {
    stopPressTween();
    animateHover(false);
  });

  const setDisabled = (disabledState: boolean) => {
    isDisabled = disabledState;
    stopHoverTweens();
    stopPressTween();
    animateHover(false);
    applyDisabledState();
  };

  const setLabel = (nextLabel: string) => {
    labelText.setText(nextLabel);
  };

  applyDisabledState();

  return {
    container,
    setDisabled,
    setLabel,
  };
}
