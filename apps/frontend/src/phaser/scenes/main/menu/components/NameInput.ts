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
  dom: Phaser.GameObjects.DOMElement;
  destroy(): void;
  getValue(): string;
  setValue(value: string): void;
  setWidth(width: number): void;
}

export function createNameInput(scene: Phaser.Scene, options: NameInputOptions): NameInputControl {
  const { y, width, initialValue, onInput, onSubmit } = options;
  const height = 56;
  
  const container = scene.add.container(0, y);

  // Background rectangle similar to MenuButton
  const background = scene.add.rectangle(0, 0, width, height, 0x1b2d44, 0.85);
  background.setOrigin(0.5, 0.5);
  background.setStrokeStyle(2, 0x4cc9f0, 0.4);

  // Create minimal input element that fills the background
  const input = document.createElement('input');
  input.type = 'text';
  input.value = initialValue;
  input.placeholder = 'Enter your adventurer name';
  input.maxLength = 20;
  input.autocomplete = 'off';
  input.spellcheck = false;
  
  // Minimal inline styles - match background size exactly
  Object.assign(input.style, {
    width: `${width}px`,
    height: `${height}px`,
    padding: '14px 18px',
    fontSize: '20px',
    border: 'none',
    outline: 'none',
    textAlign: 'center',
    background: 'transparent',
    color: '#ffffff',
    fontFamily: 'Poppins, sans-serif',
    boxSizing: 'border-box',
    top: '75px',
    right: '150px',
  } as Partial<CSSStyleDeclaration>);

  // Add DOM element at container center
  const dom = scene.add.dom(0, 0, input);
  dom.setOrigin(0.5, 0.5);
  
  container.add([background, dom]);
  container.setSize(width, height);

  const handleInput = (event: Event) => {
    const target = event.target as HTMLInputElement;
    onInput(target.value);
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      onSubmit();
    }
  };

  input.addEventListener('input', handleInput);
  input.addEventListener('keydown', handleKeyDown);

  setTimeout(() => {
    input.focus({ preventScroll: true });
    input.select();
  }, 50);

  const destroy = () => {
    input.removeEventListener('input', handleInput);
    input.removeEventListener('keydown', handleKeyDown);
    dom.destroy();
    container.destroy(true);
  };

  const setValue = (value: string) => {
    if (input.value !== value) {
      input.value = value;
    }
  };

  const setWidth = (nextWidth: number) => {
    const nextHeight = 56;
    container.setSize(nextWidth, nextHeight);
    background.setSize(nextWidth, nextHeight);
    const inputElement = dom.node as HTMLInputElement;
    if (inputElement && inputElement.style) {
      inputElement.style.width = `${nextWidth}px`;
      inputElement.style.height = `${nextHeight}px`;
    }
  };

  const getValue = () => input.value;

  return {
    container,
    dom,
    destroy,
    getValue,
    setValue,
    setWidth,
  };
}
