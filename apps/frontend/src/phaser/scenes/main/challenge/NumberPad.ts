import Phaser from 'phaser';

interface NumberPadOptions {
  scene: Phaser.Scene;
  y: number;
  onNumberPress: (num: string) => void;
  onBackspace: () => void;
  onSubmit: () => void;
}

export interface NumberPadControl {
  container: Phaser.GameObjects.Container;
  destroy(): void;
  show(): void;
  hide(): void;
}

export function createNumberPad(options: NumberPadOptions): NumberPadControl {
  const { scene, y, onNumberPress, onBackspace, onSubmit } = options;

  // Create container that will be positioned by parent (ChallengeController centers at scene center)
  const container = scene.add.container(0, y);
  container.setVisible(true);

  // Single row layout with 0-9, backspace, and submit
  const keys = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '✓'];

  const keyWidth = 38;
  const keyHeight = 32;
  const keySpacing = 4;

  // Calculate total width and starting position (relative to container origin at 0,0)
  const totalWidth = keys.length * keyWidth + (keys.length - 1) * keySpacing;
  const startX = -totalWidth / 2 + keyWidth / 2; // Start from left, centered around 0

  // Create keys in a single row
  keys.forEach((char, index) => {
    const keyX = startX + index * (keyWidth + keySpacing);
    
    // Key container positioned relative to parent container
    const keyContainer = scene.add.container(keyX, 0);

    // Determine key styling
    let keyColor = 0x1b2d44;
    let strokeColor = 0x4cc9f0;
    let textColor = '#ffffff';
    let fontSize = '18px';
    
    if (char === '⌫') {
      strokeColor = 0xff6b6b;
      textColor = '#ff6b6b';
    } else if (char === '✓') {
      strokeColor = 0x51cf66;
      textColor = '#51cf66';
      fontSize = '22px';
    }

    // Key background
    const keyBg = scene.add.rectangle(0, 0, keyWidth, keyHeight, keyColor, 0.9);
    keyBg.setStrokeStyle(1, strokeColor, 0.6);
    keyBg.setInteractive({ useHandCursor: true });

    // Key label
    const keyLabel = scene.add.text(0, 0, char, {
      fontFamily: 'Poppins, sans-serif',
      fontSize: fontSize,
      color: textColor,
      fontStyle: 'bold',
    });
    keyLabel.setOrigin(0.5, 0.5);

    keyContainer.add([keyBg, keyLabel]);
    container.add(keyContainer);

    // Handle key press
    keyBg.on('pointerdown', () => {
      if (char === '⌫') {
        onBackspace();
      } else if (char === '✓') {
        onSubmit();
      } else {
        onNumberPress(char);
      }
      
      // Visual feedback
      scene.tweens.add({
        targets: keyBg,
        scaleX: 0.9,
        scaleY: 0.9,
        duration: 50,
        yoyo: true,
        ease: 'Power2',
      });
    });

    // Hover effect
    keyBg.on('pointerover', () => {
      keyBg.setStrokeStyle(2, strokeColor, 1);
    });

    keyBg.on('pointerout', () => {
      keyBg.setStrokeStyle(1, strokeColor, 0.6);
    });
  });

  const show = () => {
    container.setVisible(true);
    container.setAlpha(0);
    scene.tweens.add({
      targets: container,
      alpha: 1,
      duration: 200,
      ease: 'Power2',
    });
  };

  const hide = () => {
    scene.tweens.add({
      targets: container,
      alpha: 0,
      duration: 200,
      ease: 'Power2',
      onComplete: () => {
        container.setVisible(false);
      },
    });
  };

  const destroy = () => {
    container.destroy(true);
  };

  return {
    container,
    destroy,
    show,
    hide,
  };
}
