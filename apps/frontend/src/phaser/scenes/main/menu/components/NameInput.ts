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
  const input = document.createElement('input');

  input.type = 'text';
  input.value = initialValue;
  input.placeholder = 'Enter your adventurer name';
  input.maxLength = 20;
  input.autocomplete = 'off';
  input.spellcheck = false;
  Object.assign(input.style, {
    width: '100%',
    maxWidth: '100%',
    padding: '14px 18px',
    fontSize: '20px',
    borderRadius: '12px',
    border: 'none',
    outline: 'none',
    textAlign: 'center',
    background: 'rgba(27,45,68,0.85)',
    color: '#ffffff',
    fontFamily: 'Poppins, sans-serif',
    boxShadow: '0 6px 18px rgba(0,0,0,0.35)',
    display: 'block',
    margin: '0 auto',
  } as Partial<CSSStyleDeclaration>);

  const container = scene.add.container(0, y);
  const dom = scene.add.dom(0, 0, input);
  dom.setOrigin(0.5, 0.5);
  container.add(dom);
  container.setSize(width, 56);

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
    container.setSize(nextWidth, container.height ?? 56);
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
