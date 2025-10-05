import Phaser from 'phaser';

interface OnScreenKeyboardOptions {
  scene: Phaser.Scene;
  y: number;
  onKeyPress: (key: string) => void;
  onBackspace: () => void;
  onSubmit: () => void;
}

export interface OnScreenKeyboardControl {
  container: Phaser.GameObjects.Container;
  destroy(): void;
  show(): void;
  hide(): void;
  setY(y: number): void;
}

export function createOnScreenKeyboard(options: OnScreenKeyboardOptions): OnScreenKeyboardControl {
  const { scene, y, onKeyPress, onBackspace, onSubmit } = options;

  // Center the keyboard horizontally
  const centerX = scene.scale.width / 2;
  const container = scene.add.container(centerX, y);
  container.setVisible(false);

  // Keyboard layout
  const rows = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
  ];

  const keyWidth = 38;
  const keyHeight = 38;
  const keySpacing = 4;
  const rowSpacing = 4;

  const keys: Phaser.GameObjects.Container[] = [];

  // Create keyboard rows
  rows.forEach((row, rowIndex) => {
    const rowWidth = row.length * keyWidth + (row.length - 1) * keySpacing;
    const startX = -rowWidth / 2 + keyWidth / 2;
    const rowY = rowIndex * (keyHeight + rowSpacing) + keyHeight / 2;

    row.forEach((char, colIndex) => {
      const keyX = startX + colIndex * (keyWidth + keySpacing);
      
      // Key container
      const keyContainer = scene.add.container(keyX, rowY);

      // Key background
      const keyBg = scene.add.rectangle(0, 0, keyWidth, keyHeight, 0x1b2d44, 0.9);
      keyBg.setStrokeStyle(1, 0x4cc9f0, 0.6);
      keyBg.setInteractive({ useHandCursor: true });

      // Key label
      const keyLabel = scene.add.text(0, 0, char, {
        fontFamily: 'Poppins, sans-serif',
        fontSize: '18px',
        color: '#ffffff',
        fontStyle: 'bold',
      });
      keyLabel.setOrigin(0.5, 0.5);

      keyContainer.add([keyBg, keyLabel]);
      container.add(keyContainer);
      keys.push(keyContainer);

      // Handle key press
      keyBg.on('pointerdown', () => {
        onKeyPress(char);
        
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
        keyBg.setStrokeStyle(2, 0x4cc9f0, 1);
      });

      keyBg.on('pointerout', () => {
        keyBg.setStrokeStyle(1, 0x4cc9f0, 0.6);
      });
    });
  });

  // Bottom row with special keys
  const bottomRowY = rows.length * (keyHeight + rowSpacing) + keyHeight / 2;
  
  // Space bar
  const spaceWidth = keyWidth * 4;
  const spaceContainer = scene.add.container(0, bottomRowY);
  const spaceBg = scene.add.rectangle(0, 0, spaceWidth, keyHeight, 0x1b2d44, 0.9);
  spaceBg.setStrokeStyle(1, 0x4cc9f0, 0.6);
  spaceBg.setInteractive({ useHandCursor: true });
  const spaceLabel = scene.add.text(0, 0, 'SPACE', {
    fontFamily: 'Poppins, sans-serif',
    fontSize: '16px',
    color: '#ffffff',
  });
  spaceLabel.setOrigin(0.5, 0.5);
  spaceContainer.add([spaceBg, spaceLabel]);
  container.add(spaceContainer);

  spaceBg.on('pointerdown', () => {
    onKeyPress(' ');
    scene.tweens.add({
      targets: spaceBg,
      scaleX: 0.95,
      scaleY: 0.9,
      duration: 50,
      yoyo: true,
      ease: 'Power2',
    });
  });

  spaceBg.on('pointerover', () => {
    spaceBg.setStrokeStyle(2, 0x4cc9f0, 1);
  });

  spaceBg.on('pointerout', () => {
    spaceBg.setStrokeStyle(1, 0x4cc9f0, 0.6);
  });

  // Backspace button
  const backspaceX = -(spaceWidth / 2 + keySpacing + keyWidth * 1.5 / 2);
  const backspaceContainer = scene.add.container(backspaceX, bottomRowY);
  const backspaceBg = scene.add.rectangle(0, 0, keyWidth * 1.5, keyHeight, 0x1b2d44, 0.9);
  backspaceBg.setStrokeStyle(1, 0xff6b6b, 0.6);
  backspaceBg.setInteractive({ useHandCursor: true });
  const backspaceLabel = scene.add.text(0, 0, '⌫', {
    fontFamily: 'Poppins, sans-serif',
    fontSize: '20px',
    color: '#ff6b6b',
  });
  backspaceLabel.setOrigin(0.5, 0.5);
  backspaceContainer.add([backspaceBg, backspaceLabel]);
  container.add(backspaceContainer);

  backspaceBg.on('pointerdown', () => {
    onBackspace();
    scene.tweens.add({
      targets: backspaceBg,
      scaleX: 0.9,
      scaleY: 0.9,
      duration: 50,
      yoyo: true,
      ease: 'Power2',
    });
  });

  backspaceBg.on('pointerover', () => {
    backspaceBg.setStrokeStyle(2, 0xff6b6b, 1);
  });

  backspaceBg.on('pointerout', () => {
    backspaceBg.setStrokeStyle(1, 0xff6b6b, 0.6);
  });

  // Done button
  const doneX = spaceWidth / 2 + keySpacing + keyWidth * 1.5 / 2;
  const doneContainer = scene.add.container(doneX, bottomRowY);
  const doneBg = scene.add.rectangle(0, 0, keyWidth * 1.5, keyHeight, 0x1b2d44, 0.9);
  doneBg.setStrokeStyle(1, 0x51cf66, 0.6);
  doneBg.setInteractive({ useHandCursor: true });
  const doneLabel = scene.add.text(0, 0, '✓', {
    fontFamily: 'Poppins, sans-serif',
    fontSize: '22px',
    color: '#51cf66',
    fontStyle: 'bold',
  });
  doneLabel.setOrigin(0.5, 0.5);
  doneContainer.add([doneBg, doneLabel]);
  container.add(doneContainer);

  doneBg.on('pointerdown', () => {
    onSubmit();
    scene.tweens.add({
      targets: doneBg,
      scaleX: 0.9,
      scaleY: 0.9,
      duration: 50,
      yoyo: true,
      ease: 'Power2',
    });
  });

  doneBg.on('pointerover', () => {
    doneBg.setStrokeStyle(2, 0x51cf66, 1);
  });

  doneBg.on('pointerout', () => {
    doneBg.setStrokeStyle(1, 0x51cf66, 0.6);
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

  const setY = (nextY: number) => {
    container.setY(nextY);
  };

  const destroy = () => {
    container.destroy(true);
  };

  return {
    container,
    destroy,
    show,
    hide,
    setY,
  };
}
