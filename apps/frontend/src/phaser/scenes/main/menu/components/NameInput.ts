import Phaser from 'phaser';

interface NameInputOptions {
  y: number;
  width: number;
  initialValue: string;
  onInput(value: string): void;
  onSubmit(): void;
}

export interface NameInputControl {
  container: Phaser.GameObjects.Container;
  destroy(): void;
  getValue(): string;
  setValue(value: string): void;
  setWidth(width: number): void;
}

export function createNameInput(scene: Phaser.Scene, options: NameInputOptions): NameInputControl {
  const { y, width, initialValue, onInput, onSubmit } = options;
  const height = 64;
  
  const container = scene.add.container(0, y);

  // Background rectangle
  const background = scene.add.rectangle(0, 0, width, height, 0x1b2d44, 0.85);
  background.setOrigin(0.5, 0.5);
  background.setStrokeStyle(2, 0x4cc9f0, 0.4);

  // Text display for the input value
  let currentValue = initialValue;
  const displayText = scene.add.text(0, 0, currentValue || '', {
    fontFamily: 'Poppins, sans-serif',
    fontSize: '22px',
    color: '#ffffff',
    align: 'center',
  });
  displayText.setOrigin(0.5, 0.5);

  // Cursor (blinking)
  const cursor = scene.add.text(
    displayText.width / 2 + 2,
    0,
    '|',
    {
      fontFamily: 'Poppins, sans-serif',
      fontSize: '22px',
      color: '#ffffff',
    }
  );
  cursor.setOrigin(0.5, 0.5);
  cursor.setVisible(false);

  // Make background interactive
  background.setInteractive({ useHandCursor: true });

  let isActive = false;
  let cursorTween: Phaser.Tweens.Tween | null = null;

  const updateDisplay = () => {
    displayText.setText(currentValue);
    
    // Update cursor position
    cursor.setX(displayText.width / 2 + 2);
  };

  const activate = () => {
    if (isActive) return;
    isActive = true;
    background.setStrokeStyle(3, 0x4cc9f0, 0.8);
    cursor.setVisible(true);
    
    // Blinking cursor animation
    cursorTween = scene.tweens.add({
      targets: cursor,
      alpha: 0,
      duration: 500,
      yoyo: true,
      repeat: -1,
    });

    updateDisplay();
  };

  const deactivate = () => {
    if (!isActive) return;
    isActive = false;
    background.setStrokeStyle(2, 0x4cc9f0, 0.4);
    cursor.setVisible(false);
    
    if (cursorTween) {
      cursorTween.stop();
      cursorTween = null;
    }
    cursor.setAlpha(1);

    updateDisplay();
  };

  // Handle clicks
  background.on('pointerdown', () => {
    activate();
  });

  // Handle keyboard input
  const handleKeyDown = (event: KeyboardEvent) => {
    if (!isActive) return;

    if (event.key === 'Enter') {
      event.preventDefault();
      deactivate();
      onSubmit();
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      deactivate();
      return;
    }

    if (event.key === 'Backspace') {
      event.preventDefault();
      if (currentValue.length > 0) {
        currentValue = currentValue.slice(0, -1);
        onInput(currentValue);
        updateDisplay();
      }
      return;
    }

    // Only accept alphanumeric and space, max 20 chars
    if (event.key.length === 1 && currentValue.length < 20) {
      const char = event.key;
      if (/[a-zA-Z0-9 ]/.test(char)) {
        currentValue += char;
        onInput(currentValue);
        updateDisplay();
      }
    }
  };

  // Add keyboard listener
  scene.input.keyboard?.on('keydown', handleKeyDown);

  // Auto-activate on creation
  setTimeout(() => activate(), 50);

  container.add([background, displayText, cursor]);
  container.setSize(width, height);

  const destroy = () => {
    if (cursorTween) {
      cursorTween.stop();
      cursorTween = null;
    }
    scene.input.keyboard?.off('keydown', handleKeyDown);
    background.off('pointerdown');
    container.destroy(true);
  };

  const setValue = (value: string) => {
    currentValue = value;
    updateDisplay();
  };

  const setWidth = (nextWidth: number) => {
    const nextHeight = 64;
    container.setSize(nextWidth, nextHeight);
    background.setSize(nextWidth, nextHeight);
  };

  const getValue = () => currentValue;

  return {
    container,
    destroy,
    getValue,
    setValue,
    setWidth,
  };
}
