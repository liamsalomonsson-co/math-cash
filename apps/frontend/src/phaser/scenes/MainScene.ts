import Phaser from 'phaser';
import type {
  Direction,
  DifficultyLevel,
  GameSession,
  MathChallenge,
  Position,
  Tile,
} from '@math-cash/shared';
import { generateTileMap, getNextDifficulty } from '@math-cash/shared';

const TILE_GAP = 6;
const PLAYER_COLOR = 0x4cc9f0;
const MENU_BG_COLOR = 0x0d1b2a;
const MENU_BORDER_COLOR = 0x415a77;
const MENU_BUTTON_COLOR = 0x4895ef;
const MENU_BUTTON_DISABLED = 0x274060;
const STORAGE_KEY = 'math-cash-save';
const FIXED_MAP_SIZE = 16;

type GamePhase = 'menu' | 'play';

interface ChallengeContext {
  container: Phaser.GameObjects.Container;
  scrim: Phaser.GameObjects.Rectangle;
  panel: Phaser.GameObjects.Rectangle;
  answerText: Phaser.GameObjects.Text;
  feedbackText: Phaser.GameObjects.Text;
  hintText: Phaser.GameObjects.Text;
  tilePosition: Position;
  challenge: MathChallenge;
  attempts: number;
  inputValue: string;
  keydownHandler: (event: KeyboardEvent) => void;
}

const encouragements = [
  'Not quite right, try again! 🤔',
  'Close! Give it another shot! 💪',
  'You can do this! Think it through! 🧠',
];

function formatChallenge(operation: MathChallenge['operation'], operands: number[]): string {
  const [a, b] = operands;
  const symbols: Record<MathChallenge['operation'], string> = {
    addition: '+',
    subtraction: '-',
    multiplication: '×',
    division: '÷',
  };
  return `${a} ${symbols[operation]} ${b} = ?`;
}

export class MainScene extends Phaser.Scene {
  private phase: GamePhase = 'menu';

  private session: GameSession | null = null;

  private tileContainer?: Phaser.GameObjects.Container;

  private menuContainer?: Phaser.GameObjects.Container;

  private playerMarker?: Phaser.GameObjects.Arc;

  private tileSize = 0;

  private gridOrigin = { x: 0, y: 0 };

  private tileObjects = new Map<string, Phaser.GameObjects.Rectangle>();

  private hudContainer?: Phaser.GameObjects.Container;

  private hudTexts?: {
    player: Phaser.GameObjects.Text;
    currency: Phaser.GameObjects.Text;
    streak: Phaser.GameObjects.Text;
    difficulty: Phaser.GameObjects.Text;
    instructions: Phaser.GameObjects.Text;
    menuHint: Phaser.GameObjects.Text;
  };

  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;

  private wasdKeys?: Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>;

  private pendingRebuild = false;

  private lastChallengeKey: string | null = null;

  private pendingName = '';

  private menuNameInput?: Phaser.GameObjects.DOMElement;

  private nameInputListeners: { input: (event: Event) => void; keydown: (event: KeyboardEvent) => void } | null = null;

  private menuErrorText?: Phaser.GameObjects.Text;

  private startButton?: Phaser.GameObjects.Container;
  private continueButton?: Phaser.GameObjects.Container;

  private challengeContext?: ChallengeContext;

  private levelOverlay?: Phaser.GameObjects.DOMElement;

  private isChallengeActive = false;

  constructor() {
    super('MainScene');
  }

  create() {
    this.cameras.main.setBackgroundColor('#0b1e3f');
    this.tileContainer = this.add.container(0, 0);

    this.cursors = this.input.keyboard?.createCursorKeys();
    this.wasdKeys = this.input.keyboard?.addKeys({
      W: Phaser.Input.Keyboard.KeyCodes.W,
      A: Phaser.Input.Keyboard.KeyCodes.A,
      S: Phaser.Input.Keyboard.KeyCodes.S,
      D: Phaser.Input.Keyboard.KeyCodes.D,
    }) as Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key> | undefined;

    this.input.keyboard?.addCapture([
      Phaser.Input.Keyboard.KeyCodes.UP,
      Phaser.Input.Keyboard.KeyCodes.DOWN,
      Phaser.Input.Keyboard.KeyCodes.LEFT,
      Phaser.Input.Keyboard.KeyCodes.RIGHT,
      Phaser.Input.Keyboard.KeyCodes.W,
      Phaser.Input.Keyboard.KeyCodes.A,
      Phaser.Input.Keyboard.KeyCodes.S,
      Phaser.Input.Keyboard.KeyCodes.D,
    ]);

    this.input.keyboard?.on('keydown-M', this.handleMenuShortcut, this);

    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this);
      this.input.keyboard?.off('keydown-M', this.handleMenuShortcut, this);
      this.detachNameInput();
      this.destroyHud();
      this.hideChallenge();
      this.hideLevelOverlay();
    });

    this.loadSavedSession();
    if (this.session) {
      this.pendingName = this.session.player.name;
    }

    this.renderMenu();
  }

  update() {
    if (this.phase !== 'play' || !this.session) {
      return;
    }

    if (this.pendingRebuild) {
      this.rebuildScene();
    }

    if (this.isChallengeActive) {
      return;
    }

    const direction = this.pollDirectionalInput();
    if (direction) {
      this.movePlayer(direction);
    }
  }

  private handleResize = () => {
    if (this.challengeContext) {
      const { container, scrim } = this.challengeContext;
      const width = this.scale.width || Number(this.game.config.width) || 0;
      const height = this.scale.height || Number(this.game.config.height) || 0;
      scrim.setSize(width, height);
      scrim.setDisplaySize(width, height);
      container.setPosition(width / 2, height / 2);
    }

    if (this.levelOverlay) {
      this.levelOverlay.setPosition(this.scale.width / 2, this.scale.height / 2);
    }

    if (this.phase === 'menu') {
      this.renderMenu();
      return;
    }

    this.pendingRebuild = true;
    this.rebuildScene();
    this.positionHud();
  };

  private handleMenuShortcut = (event: KeyboardEvent) => {
    if (this.phase !== 'play' || this.isChallengeActive) {
      return;
    }

    event.preventDefault();
    this.phase = 'menu';
    this.renderMenu();
    this.saveSession();
  };

  private loadSavedSession() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as GameSession;
      parsed.player.createdAt = new Date(parsed.player.createdAt);
      parsed.player.lastPlayedAt = new Date(parsed.player.lastPlayedAt);
      parsed.gameStartedAt = new Date(parsed.gameStartedAt);
      this.session = parsed;
    } catch (error) {
      console.error('Failed to load saved game', error);
    }
  }

  private saveSession() {
    if (!this.session) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.session));
  }

  private renderMenu() {
    this.phase = 'menu';
    this.destroyMenu();
    this.hideChallenge();
    this.hideLevelOverlay();
    this.tileContainer?.setVisible(false);
    this.playerMarker?.setVisible(false);
    this.hudContainer?.setVisible(false);

    const width = this.scale.width || Number(this.game.config.width) || 640;
    const height = this.scale.height || Number(this.game.config.height) || 640;

    const container = this.add.container(width / 2, height / 2);
    const panelWidth = Math.min(width * 0.85, 540);
    const panelHeight = Math.min(height * 0.9, 620);

    const panel = this.add.rectangle(0, 0, panelWidth, panelHeight, MENU_BG_COLOR, 0.92);
    panel.setOrigin(0.5, 0.5);
    panel.setStrokeStyle(4, MENU_BORDER_COLOR, 0.85);

    const title = this.add
      .text(0, -panelHeight / 2 + 80, '🏰 Math Cash', {
        fontFamily: 'Poppins, sans-serif',
        fontSize: '52px',
        color: '#ffffff',
      })
      .setOrigin(0.5, 0.5);

    const subtitle = this.add
      .text(0, title.y + 60, 'Choose your adventure to begin!', {
        fontFamily: 'Poppins, sans-serif',
        fontSize: '20px',
        color: '#dce8ff',
      })
      .setOrigin(0.5, 0.5);

    const nameInputY = subtitle.y + 90;
    const nameInput = this.createNameInput(nameInputY);

    const errorY = nameInputY + 60;
    this.menuErrorText = this.add
      .text(0, errorY, '', {
        fontFamily: 'Poppins, sans-serif',
        fontSize: '16px',
        color: '#ffccd5',
      })
      .setOrigin(0.5, 0.5)
      .setVisible(false);

    const startButtonY = errorY + 80;
    this.startButton = this.createStartMenuButton(startButtonY);

    const hasSession = Boolean(this.session);
    const continueButtonY = startButtonY + 86;
    this.continueButton = this.createContinueMenuButton(continueButtonY, hasSession);

    container.add([panel, title, subtitle, nameInput]);
    if (this.menuErrorText) {
      container.add(this.menuErrorText);
    }
    if (this.startButton) {
      container.add(this.startButton);
    }
    if (this.continueButton) {
      container.add(this.continueButton);
    }

    if (this.session) {
      const { player, currentMap } = this.session;
      const statsBoxWidth = panelWidth * 0.82;
      const statsBoxHeight = 120;
      const statsY = continueButtonY + 120;

      const statsBackground = this.add.rectangle(0, statsY, statsBoxWidth, statsBoxHeight, 0x0f2239, 0.65);
      statsBackground.setOrigin(0.5, 0.5);
      statsBackground.setStrokeStyle(2, MENU_BORDER_COLOR, 0.6);
      statsBackground.setDepth(-5);

      const stats = this.add
        .text(
          0,
          statsY,
          [`Explorer: ${player.name}`, `Coins: ${player.currency}`, `Best Streak: ${player.bestStreak}`, `Current Level: ${currentMap.difficulty}`].join('\n'),
          {
            fontFamily: 'Poppins, sans-serif',
            fontSize: '18px',
            color: '#cbd5f5',
            align: 'center',
            lineSpacing: 6,
          },
        )
        .setOrigin(0.5, 0.5);
      stats.setDepth(-4);

      container.add([statsBackground, stats]);
    }

    const hint = this.add
      .text(0, panelHeight / 2 - 40, 'Tip: Use arrow keys or WASD once the game starts. Press M to return here.', {
        fontFamily: 'Poppins, sans-serif',
        fontSize: '16px',
        color: '#9fb3d9',
        align: 'center',
      })
      .setOrigin(0.5, 0.5);
    container.add(hint);

    if (this.startButton) {
      container.bringToTop(this.startButton);
    }
    if (this.continueButton) {
      container.bringToTop(this.continueButton);
    }

    this.menuContainer = container;
    this.updateStartButtonState();
  }

  private createNameInput(y: number) {
    this.detachNameInput();

    const input = document.createElement('input');
    const inputWidth = Math.min((this.scale.width || 640) * 0.55, 340);
    input.type = 'text';
    input.value = this.pendingName;
    input.placeholder = 'Enter your adventurer name';
    input.maxLength = 20;
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.setAttribute(
      'style',
      `width:${inputWidth}px;padding:14px 18px;font-size:20px;border-radius:12px;border:none;outline:none;text-align:center;` +
        `background:rgba(27,45,68,0.85);color:#ffffff;font-family:Poppins, sans-serif;box-shadow:0 6px 18px rgba(0,0,0,0.35);`,
    );

    const dom = this.add.dom(0, y, input);
    dom.setOrigin(0.5, 0.5);

    const handleInput = (event: Event) => {
      const target = event.target as HTMLInputElement;
      this.pendingName = target.value;
      this.setNameError();
      this.updateStartButtonState();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        this.handleStartButton();
      }
    };

    input.addEventListener('input', handleInput);
    input.addEventListener('keydown', handleKeyDown);

    setTimeout(() => {
      input.focus({ preventScroll: true });
      input.select();
    }, 50);

    this.menuNameInput = dom;
    this.nameInputListeners = { input: handleInput, keydown: handleKeyDown };
    return dom;
  }

  private detachNameInput() {
    if (!this.menuNameInput) {
      return;
    }

    const node = this.menuNameInput.node as HTMLInputElement | null;
    if (node && this.nameInputListeners) {
      node.removeEventListener('input', this.nameInputListeners.input);
      node.removeEventListener('keydown', this.nameInputListeners.keydown as EventListener);
    }

    this.menuNameInput.destroy();
    this.menuNameInput = undefined;
    this.nameInputListeners = null;
  }

  private updateStartButtonState() {
    this.setButtonDisabled(this.startButton, !this.hasValidName());
  }

  private setButtonDisabled(button: Phaser.GameObjects.Container | undefined, disabled: boolean) {
    if (!button) {
      return;
    }

    const background = button.getData('background') as Phaser.GameObjects.Rectangle | undefined;
    const label = button.getData('label') as Phaser.GameObjects.Text | undefined;
  const glow = button.getData('glow') as Phaser.GameObjects.Rectangle | undefined;
  const interactiveTarget = button.getData('interactiveTarget') as Phaser.GameObjects.Shape | undefined;
    const enabledFill = (button.getData('enabledFill') as number | undefined) ?? MENU_BUTTON_COLOR;
    const disabledFill = (button.getData('disabledFill') as number | undefined) ?? MENU_BUTTON_DISABLED;
    const enabledAlpha = (button.getData('enabledAlpha') as number | undefined) ?? 0.95;
    const disabledAlpha = (button.getData('disabledAlpha') as number | undefined) ?? 0.5;
    const textColor = (button.getData('textColor') as string | undefined) ?? '#ffffff';

    button.setData('disabled', disabled);

    if (background) {
      background.setFillStyle(disabled ? disabledFill : enabledFill, 1);
      background.setAlpha(disabled ? disabledAlpha : enabledAlpha);
      background.setScale(1);
    }

    if (label) {
      label.setAlpha(disabled ? 0.6 : 1);
      label.setColor(textColor);
    }

    if (glow) {
      glow.setAlpha(0);
      glow.setScale(1);
    }

    if (!interactiveTarget) {
      return;
    }

    if (disabled) {
      interactiveTarget.disableInteractive();
    } else {
      interactiveTarget.setInteractive({ useHandCursor: true });
    }

    if (interactiveTarget.input) {
      interactiveTarget.input.cursor = disabled ? 'default' : 'pointer';
    }
  }

  private createStartMenuButton(y: number) {
    return this.createMenuActionButton({
      label: 'Start Adventure',
      y,
      onClick: () => this.handleStartButton(),
      disabled: !this.hasValidName(),
      fillColor: MENU_BUTTON_COLOR,
      disabledFillColor: MENU_BUTTON_DISABLED,
      textColor: '#ffffff',
      glowColor: 0x9bc9ff,
    });
  }

  private createContinueMenuButton(y: number, hasSession: boolean) {
    return this.createMenuActionButton({
      label: hasSession ? 'Continue Journey' : 'Continue (Locked)',
      y,
      onClick: () => this.continueSession(),
      disabled: !hasSession,
      fillColor: 0x4361ee,
      disabledFillColor: 0x1e2b44,
      textColor: '#ffffff',
      glowColor: 0x88b2ff,
    });
  }

  private createMenuActionButton({
    label,
    y,
    onClick,
    disabled = false,
    fillColor = MENU_BUTTON_COLOR,
    disabledFillColor = MENU_BUTTON_DISABLED,
    textColor = '#ffffff',
    glowColor = 0x9bc9ff,
  }: {
    label: string;
    y: number;
    onClick: () => void;
    disabled?: boolean;
    fillColor?: number;
    disabledFillColor?: number;
    textColor?: string;
    glowColor?: number;
  }): Phaser.GameObjects.Container {
    const width = Math.min((this.scale.width || 640) * 0.7, 420);
    const height = 72;

    const container = this.add.container(0, y);
    container.setDataEnabled();

    const glow = this.add.rectangle(0, 0, width + 24, height + 18, glowColor, 0.25);
    glow.setOrigin(0.5, 0.5);
    glow.setAlpha(0);

    const background = this.add.rectangle(0, 0, width, height, fillColor, 1);
    background.setOrigin(0.5, 0.5);
    background.setStrokeStyle(3, 0xffffff, 0.32);
    background.setAlpha(0.95);

    const labelText = this.add
      .text(0, 0, label, {
        fontFamily: 'Poppins, sans-serif',
        fontSize: '26px',
        fontStyle: 'bold',
        color: textColor,
      })
      .setOrigin(0.5, 0.5);

  container.add([glow, background, labelText]);
  container.setSize(width, height);
  container.setData('background', background);
  container.setData('label', labelText);
  container.setData('glow', glow);
  container.setData('interactiveTarget', background);
  container.setData('width', width);
  container.setData('height', height);
  container.setData('enabledFill', fillColor);
  container.setData('disabledFill', disabledFillColor);
  container.setData('enabledAlpha', 0.95);
  container.setData('disabledAlpha', 0.45);
  container.setData('glowAlpha', 0.3);
  container.setData('textColor', textColor);

  background.setInteractive({ useHandCursor: true });

    let hoverTween: Phaser.Tweens.Tween | null = null;
    let glowTween: Phaser.Tweens.Tween | null = null;
    let pressTween: Phaser.Tweens.Tween | null = null;

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
      const targetGlowAlpha = over ? (container.getData('glowAlpha') ?? 0.3) : 0;
      hoverTween = this.tweens.add({
        targets: background,
        scaleX: over ? 1.05 : 1,
        scaleY: over ? 1.08 : 1,
        duration: 150,
        ease: 'Quad.easeOut',
      });
      glowTween = this.tweens.add({
        targets: glow,
        alpha: targetGlowAlpha,
        duration: 150,
        ease: 'Quad.easeOut',
      });
    };

    const animatePress = (down: boolean) => {
      stopPressTween();
      pressTween = this.tweens.add({
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

    background.on('pointerover', () => {
      if (container.getData('disabled')) {
        return;
      }
      animateHover(true);
    });

    background.on('pointerout', () => {
      stopPressTween();
      animateHover(false);
    });

    background.on('pointerdown', () => {
      if (container.getData('disabled')) {
        return;
      }
      animatePress(true);
    });

    background.on('pointerup', () => {
      const isDisabled = container.getData('disabled');
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

    this.setButtonDisabled(container, disabled);
    return container;
  }

  private createOverlayButton(
    label: string,
    x: number,
    y: number,
    handler: () => void,
    options?: { backgroundColor?: number; textColor?: string; alpha?: number },
  ) {
    const width = Math.min((this.scale.width || 640) * 0.4, 220);
    const height = 56;
    const container = this.add.container(x, y);
    const backgroundColor = options?.backgroundColor ?? MENU_BUTTON_COLOR;
    const alpha = options?.alpha ?? 0.95;
    const textColor = options?.textColor ?? '#ffffff';

    const background = this.add.rectangle(0, 0, width, height, backgroundColor, alpha);
    background.setOrigin(0.5, 0.5);
    background.setStrokeStyle(2, 0xffffff, 0.25);

    const text = this.add
      .text(0, 0, label, {
        fontFamily: 'Poppins, sans-serif',
        fontSize: '20px',
        color: textColor,
      })
      .setOrigin(0.5, 0.5);

    container.add([background, text]);
    container.setSize(width, height);
    const hitArea = new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height);
    container.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);
    if (container.input) {
      container.input.cursor = 'pointer';
    }

    container.on('pointerover', () => {
      background.setAlpha(Math.min(1, alpha + 0.1));
    });
    container.on('pointerout', () => {
      background.setAlpha(alpha);
      background.setScale(1);
    });
    container.on('pointerdown', () => {
      background.setScale(0.97);
    });
    container.on('pointerup', () => {
      background.setScale(1);
      handler();
    });
    container.on('pointerupoutside', () => background.setScale(1));

    return container;
  }

  private handleStartButton() {
    const name = this.pendingName.trim();
    if (!name) {
      this.setNameError('Please enter your name to begin.');
      this.updateStartButtonState();
      return;
    }

    this.setNameError();
    this.startNewGame(name);
  }

  private startNewGame(name: string) {
    const trimmed = name.trim();
    const now = new Date();
    const initialDifficulty: DifficultyLevel = 'infant';
    const map = generateTileMap('map-1', FIXED_MAP_SIZE, FIXED_MAP_SIZE, initialDifficulty);

    this.session = {
      player: {
        id: `player-${now.getTime()}`,
        name: trimmed,
        currentPosition: map.startPosition,
        currentMapId: map.id,
        currency: 0,
        completedMaps: [],
        totalChallengesCompleted: 0,
        currentStreak: 0,
        bestStreak: 0,
        createdAt: now,
        lastPlayedAt: now,
      },
      currentMap: map,
      gameStartedAt: now,
      isPaused: false,
    };

    this.pendingName = trimmed;
    this.phase = 'play';
    this.destroyMenu();
    this.tileContainer?.setVisible(true);
    this.hudContainer?.setVisible(true);
    this.pendingRebuild = true;
    this.rebuildScene();
    this.saveSession();
  }

  private hasValidName(): boolean {
    return this.pendingName.trim().length > 0;
  }

  private setNameError(message?: string) {
    if (!this.menuErrorText) {
      return;
    }

    if (!message) {
      this.menuErrorText.setVisible(false);
      this.menuErrorText.setText('');
      return;
    }

    this.menuErrorText.setVisible(true);
    this.menuErrorText.setText(message);
  }

  private destroyMenu() {
    if (this.menuContainer) {
      this.menuContainer.destroy(true);
      this.menuContainer = undefined;
    }
    this.detachNameInput();
    this.menuErrorText = undefined;
    this.startButton = undefined;
    this.continueButton = undefined;
  }

  private continueSession() {
    if (!this.session) {
      return;
    }

    this.pendingName = this.session.player.name;
    this.phase = 'play';
    this.destroyMenu();
    this.tileContainer?.setVisible(true);
    this.hudContainer?.setVisible(true);
    this.pendingRebuild = true;
    this.rebuildScene();
    this.saveSession();
  }

  private rebuildScene() {
    if (!this.session || !this.tileContainer) {
      this.phase = 'menu';
      this.renderMenu();
      return;
    }

    this.pendingRebuild = false;
    this.tileContainer.setVisible(true);
    this.tileContainer.removeAll(true);
    this.tileObjects.clear();
    this.lastChallengeKey = null;

    this.tileSize = this.calculateTileSize();
    if (this.tileSize <= 0) {
      this.pendingRebuild = true;
      return;
    }

    this.renderTiles();
    this.renderPlayerMarker();
    this.refreshTiles();
    this.updatePlayerMarker();
    this.renderHud();
    this.updateHud();
    this.emitChallengeIfNeeded();
  }

  private calculateTileSize(): number {
    if (!this.session) {
      return 0;
    }

    const { width: mapWidth, height: mapHeight } = this.session.currentMap;
    const maxTiles = Math.max(mapWidth, mapHeight);

    const scaleWidth = this.scale.width || Number(this.game.config.width) || 0;
    const scaleHeight = this.scale.height || Number(this.game.config.height) || 0;

    const canvas = this.game.canvas;
    const parent = canvas?.parentElement;
    const parentWidth = parent?.clientWidth ?? 0;
    const parentHeight = parent?.clientHeight ?? 0;

    const fallbackEdge = Math.min(scaleWidth, scaleHeight);
    const measuredEdge = parentWidth > 0 && parentHeight > 0 ? Math.min(parentWidth, parentHeight) : 0;
    const shortestScreenEdge = measuredEdge > 0 ? measuredEdge : fallbackEdge;

    if (!shortestScreenEdge || !Number.isFinite(shortestScreenEdge)) {
      return 0;
    }

    const usableEdge = Math.max(shortestScreenEdge - TILE_GAP, 0);
    const rawSize = Math.floor(usableEdge / maxTiles);
    return Math.max(rawSize, 4);
  }

  private renderTiles() {
    if (!this.session || !this.tileContainer) {
      return;
    }

    const { tiles, width, height } = this.session.currentMap;
    const container = this.tileContainer;
    const gridWidth = width * this.tileSize;
    const gridHeight = height * this.tileSize;
    this.gridOrigin = {
      x: Math.floor((this.scale.width - gridWidth) / 2),
      y: Math.floor((this.scale.height - gridHeight) / 2),
    };

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const tile = tiles[y][x];
        const rect = this.createTile(tile);
        container.add(rect);
        this.tileObjects.set(`${x},${y}`, rect);

        if (tile.type === 'boss') {
          const crown = this.add.text(rect.x, rect.y - this.tileSize * 0.16, '👑');
          crown.setOrigin(0.5, 0.5);
          crown.setScale(Math.min(1.4, this.tileSize / 64));
          container.add(crown);
        }
      }
    }
  }

  private createTile(tile: Tile) {
    const { x, y } = tile.position;
    const centerX = this.gridOrigin.x + x * this.tileSize + this.tileSize / 2;
    const centerY = this.gridOrigin.y + y * this.tileSize + this.tileSize / 2;

    const rect = this.add.rectangle(centerX, centerY, this.tileSize - TILE_GAP, this.tileSize - TILE_GAP);
    rect.setStrokeStyle(2, 0x1a2f4b, 0.6);
    rect.setFillStyle(this.getTileBaseColor(tile));

    if (tile.isAccessible && (tile.challenge || tile.type === 'boss')) {
      rect.setInteractive({ useHandCursor: true });
      rect.on('pointerup', () => this.handleTileInteract(tile));
      rect.on('pointerover', () => {
        rect.setScale(1.02);
      });
      rect.on('pointerout', () => {
        rect.setScale(1);
      });
    }

    return rect;
  }

  private renderPlayerMarker() {
    if (!this.session) {
      return;
    }

    if (!this.playerMarker) {
      this.playerMarker = this.add.circle(0, 0, (this.tileSize - TILE_GAP) / 3, PLAYER_COLOR, 0.95);
      this.playerMarker.setDepth(5);
    }

    this.playerMarker.setVisible(true);
    this.playerMarker.setRadius(Math.max(12, (this.tileSize - TILE_GAP) / 3));
    this.updatePlayerMarker();
  }

  private updatePlayerMarker() {
    if (!this.session || !this.playerMarker) {
      return;
    }

    const { x, y } = this.session.player.currentPosition;
    const tileRect = this.tileObjects.get(`${x},${y}`);
    if (!tileRect) {
      return;
    }

    this.playerMarker.setPosition(tileRect.x, tileRect.y);
  }

  private refreshTiles() {
    if (!this.session) {
      return;
    }

    for (const [key, rect] of this.tileObjects.entries()) {
      const [x, y] = key.split(',').map(Number);
      const tile = this.session.currentMap.tiles[y][x];

      const isPlayerTile = x === this.session.player.currentPosition.x && y === this.session.player.currentPosition.y;
      const fillColor = this.getTileBaseColor(tile);
      rect.setFillStyle(isPlayerTile ? PLAYER_COLOR : fillColor, isPlayerTile ? 0.35 : 1);

      if (tile.isCompleted && tile.challenge) {
        rect.setFillStyle(0x43aa8b, 0.85);
      }
    }
  }

  private renderHud() {
    if (!this.session) {
      return;
    }

    if (this.hudContainer) {
      this.hudContainer.setVisible(true);
      this.positionHud();
      return;
    }

    const container = this.add.container(0, 0);
    container.setDepth(20);

    const player = this.add.text(24, 20, '', {
      fontFamily: 'Poppins, sans-serif',
      fontSize: '20px',
      color: '#ffffff',
    });

    const currency = this.add.text(24, 52, '', {
      fontFamily: 'Poppins, sans-serif',
      fontSize: '18px',
      color: '#f4d35e',
    });

    const streak = this.add.text(24, 80, '', {
      fontFamily: 'Poppins, sans-serif',
      fontSize: '18px',
      color: '#f4f1de',
    });

    const difficulty = this.add.text(24, 108, '', {
      fontFamily: 'Poppins, sans-serif',
      fontSize: '18px',
      color: '#bde0fe',
    });

    const instructions = this.add.text(0, 0, 'Use arrow keys or WASD to move. Step on challenge tiles to play!', {
      fontFamily: 'Poppins, sans-serif',
      fontSize: '16px',
      color: '#cbd5f5',
      align: 'center',
      wordWrap: { width: Math.min(this.scale.width - 80, 520) },
    });

    const menuHint = this.add.text(0, 0, 'Press M to open the menu at any time.', {
      fontFamily: 'Poppins, sans-serif',
      fontSize: '14px',
      color: '#8ecae6',
      align: 'center',
    });

    container.add([player, currency, streak, difficulty, instructions, menuHint]);

    this.hudContainer = container;
    this.hudTexts = { player, currency, streak, difficulty, instructions, menuHint };
    this.positionHud();
  }

  private positionHud() {
    if (!this.hudTexts) {
      return;
    }

    const centerX = this.scale.width / 2;
    const bottomY = (this.scale.height || Number(this.game.config.height) || 640) - 24;

    this.hudTexts.instructions.setPosition(centerX, bottomY - 40);
    this.hudTexts.instructions.setOrigin(0.5, 1);

    this.hudTexts.menuHint.setPosition(centerX, bottomY);
    this.hudTexts.menuHint.setOrigin(0.5, 1);
  }

  private updateHud() {
    if (!this.session || !this.hudTexts) {
      return;
    }

    const { player, currentMap } = this.session;
    this.hudTexts.player.setText(`${player.name}'s Adventure`);
    this.hudTexts.currency.setText(`💰 Coins: ${player.currency}`);
    this.hudTexts.streak.setText(`🔥 Current Streak: ${player.currentStreak}`);
    this.hudTexts.difficulty.setText(`🎯 Level: ${currentMap.difficulty}`);
  }

  private destroyHud() {
    if (this.hudContainer) {
      this.hudContainer.destroy(true);
      this.hudContainer = undefined;
    }
    this.hudTexts = undefined;
  }

  private getTileBaseColor(tile: Tile): number {
    if (!tile.isAccessible) {
      return 0x0b1d3a;
    }

    switch (tile.type) {
      case 'boss':
        return 0xff8fab;
      case 'challenge':
        return 0xffc857;
      case 'blocked':
        return 0x14213d;
      default:
        return 0x1d3557;
    }
  }

  private pollDirectionalInput(): Direction | null {
    const { JustDown } = Phaser.Input.Keyboard;
    if (this.cursors) {
      const { left, right, up, down } = this.cursors;
      if (left && JustDown(left)) return 'left';
      if (right && JustDown(right)) return 'right';
      if (up && JustDown(up)) return 'up';
      if (down && JustDown(down)) return 'down';
    }

    if (this.wasdKeys) {
      if (JustDown(this.wasdKeys.A)) return 'left';
      if (JustDown(this.wasdKeys.D)) return 'right';
      if (JustDown(this.wasdKeys.W)) return 'up';
      if (JustDown(this.wasdKeys.S)) return 'down';
    }

    return null;
  }

  private movePlayer(direction: Direction) {
    if (!this.session || this.isChallengeActive) {
      return;
    }

    const next = this.calculateNextPosition(direction);
    if (!next) {
      return;
    }

    this.session.player.currentPosition = next;
    this.session.player.lastPlayedAt = new Date();
    this.refreshTiles();
    this.updatePlayerMarker();
    this.emitChallengeIfNeeded();
    this.saveSession();
  }

  private calculateNextPosition(direction: Direction): Position | null {
    if (!this.session) {
      return null;
    }

    const current = this.session.player.currentPosition;
    const map = this.session.currentMap;
    let target: Position = current;

    switch (direction) {
      case 'left':
        target = { x: Math.max(0, current.x - 1), y: current.y };
        break;
      case 'right':
        target = { x: Math.min(map.width - 1, current.x + 1), y: current.y };
        break;
      case 'up':
        target = { x: current.x, y: Math.max(0, current.y - 1) };
        break;
      case 'down':
        target = { x: current.x, y: Math.min(map.height - 1, current.y + 1) };
        break;
      default:
        break;
    }

    if (target.x === current.x && target.y === current.y) {
      return null;
    }

    const tile = map.tiles[target.y][target.x];
    if (!tile.isAccessible) {
      return null;
    }

    return target;
  }

  private handleTileInteract(tile: Tile) {
    if (!this.session || this.isChallengeActive) {
      return;
    }

    if (tile.challenge && !tile.isCompleted) {
      this.showChallenge(tile);
    }
  }

  private emitChallengeIfNeeded() {
    if (!this.session) {
      this.lastChallengeKey = null;
      return;
    }

    const { currentPosition } = this.session.player;
    const tileRow = this.session.currentMap.tiles[currentPosition.y];
    if (!tileRow) {
      this.lastChallengeKey = null;
      return;
    }

    const tile = tileRow[currentPosition.x];
    if (!tile) {
      this.lastChallengeKey = null;
      return;
    }

    if (tile.challenge && !tile.isCompleted) {
      const key = `${currentPosition.x},${currentPosition.y}:${tile.challenge.id}`;
      if (this.lastChallengeKey !== key) {
        this.lastChallengeKey = key;
        this.showChallenge(tile);
      }
    } else {
      this.lastChallengeKey = null;
    }
  }

  private showChallenge(tile: Tile) {
    if (!tile.challenge || tile.isCompleted || !this.session) {
      return;
    }

    this.hideChallenge();
    this.isChallengeActive = true;

    const challenge = tile.challenge;
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;
    const panelWidth = Math.min(this.scale.width * 0.8, 520);
    const panelHeight = Math.min(this.scale.height * 0.8, 440);

    const container = this.add.container(centerX, centerY);
    container.setDepth(30);

  const scrim = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x020d1d, 0.55);
  scrim.setOrigin(0.5, 0.5);

    const background = this.add.rectangle(0, 0, panelWidth, panelHeight, 0x061023, 0.95);
    background.setOrigin(0.5, 0.5);
    background.setStrokeStyle(3, 0x4cc9f0, 0.6);

    const title = this.add
      .text(0, -panelHeight / 2 + 70, `${this.getDifficultyEmoji(challenge.difficulty)} Math Challenge`, {
        fontFamily: 'Poppins, sans-serif',
        fontSize: '30px',
        color: '#ffffff',
      })
      .setOrigin(0.5, 0.5);

    const reward = this.add
      .text(0, title.y + 40, `Reward: 💰 ${challenge.reward} coins`, {
        fontFamily: 'Poppins, sans-serif',
        fontSize: '18px',
        color: '#cfe1ff',
      })
      .setOrigin(0.5, 0.5);

    const display = this.add
      .text(0, reward.y + 60, formatChallenge(challenge.operation, challenge.operands), {
        fontFamily: 'Poppins, sans-serif',
        fontSize: '36px',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5, 0.5);

    const answerLabel = this.add
      .text(0, display.y + 70, 'Type your answer using the keyboard:', {
        fontFamily: 'Poppins, sans-serif',
        fontSize: '18px',
        color: '#9fb3d9',
      })
      .setOrigin(0.5, 0.5);

    const answerText = this.add
      .text(0, answerLabel.y + 40, '—', {
        fontFamily: 'Poppins, sans-serif',
        fontSize: '32px',
        color: '#ffd166',
        backgroundColor: 'rgba(255,255,255,0.08)',
        padding: { x: 16, y: 8 },
      })
      .setOrigin(0.5, 0.5);

    const feedbackText = this.add
      .text(0, answerText.y + 60, '', {
        fontFamily: 'Poppins, sans-serif',
        fontSize: '16px',
        color: '#ffe066',
        align: 'center',
        wordWrap: { width: panelWidth * 0.8 },
      })
      .setOrigin(0.5, 0.5);

    const hintText = this.add
      .text(0, feedbackText.y + 40, '', {
        fontFamily: 'Poppins, sans-serif',
        fontSize: '15px',
        color: '#ffccd5',
        align: 'center',
        wordWrap: { width: panelWidth * 0.85 },
      })
      .setOrigin(0.5, 0.5)
      .setVisible(false);

  const buttonsY = hintText.y + 70;
  const buttonOffset = Math.min(panelWidth * 0.25, 120);

    let context!: ChallengeContext;

    const updateAnswerDisplay = () => {
      context.answerText.setText(context.inputValue.length > 0 ? context.inputValue : '—');
    };

    const attemptSubmit = () => {
      const trimmed = context.inputValue.trim();
      if (!trimmed) {
        context.feedbackText.setText('Please enter a number to submit!');
        return;
      }

      const numericAnswer = Number(trimmed);
      if (!Number.isFinite(numericAnswer)) {
        context.feedbackText.setText('That did not look like a number. Try again!');
        return;
      }

      context.attempts += 1;

      if (numericAnswer === challenge.correctAnswer) {
        context.feedbackText.setText('Brilliant! 🎉');
        this.completeChallenge(context);
        return;
      }

      context.feedbackText.setText(encouragements[Math.min(context.attempts - 1, encouragements.length - 1)]);
      if (context.attempts >= 2) {
        context.hintText.setText(this.getHint(challenge));
        context.hintText.setVisible(true);
      }
      context.inputValue = '';
      updateAnswerDisplay();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!this.challengeContext) {
        return;
      }

      const { key } = event;

      if (key === 'Enter') {
        event.preventDefault();
        attemptSubmit();
        return;
      }

      if (key === 'Escape') {
        event.preventDefault();
        this.hideChallenge();
        return;
      }

      if (key === 'Backspace') {
        event.preventDefault();
        context.inputValue = context.inputValue.slice(0, -1);
        updateAnswerDisplay();
        return;
      }

      if (/^[0-9]$/.test(key) || (key === '-' && context.inputValue.length === 0)) {
        event.preventDefault();
        if (context.inputValue.length >= 6) {
          return;
        }
        context.inputValue += key;
        updateAnswerDisplay();
      }
    };

    const submitButton = this.createOverlayButton('Submit Answer ✨', -buttonOffset, buttonsY, () => attemptSubmit());
    const cancelButton = this.createOverlayButton('Cancel', buttonOffset, buttonsY, () => this.hideChallenge(), {
      backgroundColor: 0xe9ecef,
      textColor: '#1d3557',
    });

  container.add([scrim, background, title, reward, display, answerLabel, answerText, feedbackText, hintText, submitButton, cancelButton]);

    context = {
      container,
      scrim,
      panel: background,
      answerText,
      feedbackText,
      hintText,
      tilePosition: tile.position,
      challenge,
      attempts: 0,
      inputValue: '',
      keydownHandler: handleKeyDown,
    };

    this.challengeContext = context;
    updateAnswerDisplay();
    this.input.keyboard?.on('keydown', handleKeyDown);
  }

  private hideChallenge() {
    if (this.challengeContext) {
      this.input.keyboard?.off('keydown', this.challengeContext.keydownHandler);
      this.challengeContext.container.destroy(true);
      this.challengeContext = undefined;
    }
    this.isChallengeActive = false;
  }

  private completeChallenge(context: ChallengeContext) {
    if (!this.session) {
      this.hideChallenge();
      return;
    }

    const { tilePosition, challenge } = context;
    const tile = this.session.currentMap.tiles[tilePosition.y][tilePosition.x];
    if (tile.challenge?.id !== challenge.id) {
      this.hideChallenge();
      return;
    }

    tile.isCompleted = true;
    this.session.player.currency += challenge.reward;
    this.session.player.totalChallengesCompleted += 1;
    this.session.player.currentStreak += 1;
    this.session.player.bestStreak = Math.max(
      this.session.player.bestStreak,
      this.session.player.currentStreak,
    );
    this.session.player.lastPlayedAt = new Date();

    this.hideChallenge();
    this.refreshTiles();
    this.updateHud();
    this.saveSession();
    this.checkMapCompletion();
  }

  private checkMapCompletion() {
    if (!this.session) {
      return;
    }

    const map = this.session.currentMap;
    const allCompleted = map.tiles.every((row) =>
      row.every((tile) => !tile.challenge || tile.isCompleted),
    );

    if (allCompleted) {
      this.showLevelCompleteOverlay();
    }
  }

  private showLevelCompleteOverlay() {
    if (!this.session) {
      return;
    }

    this.hideLevelOverlay();
    this.isChallengeActive = true;

    const container = document.createElement('div');
    container.setAttribute(
      'style',
      'width: min(520px, 92vw); background: rgba(3, 15, 32, 0.96); color: #ffffff; padding: 32px;' +
        'border-radius: 20px; box-shadow: 0 18px 40px rgba(0,0,0,0.45); font-family: Poppins, sans-serif; text-align: center;',
    );

    const heading = document.createElement('div');
    heading.textContent = `🎉 ${this.session.currentMap.difficulty.toUpperCase()} Complete!`;
    heading.style.fontSize = '30px';
    heading.style.marginBottom = '18px';
    container.appendChild(heading);

    const message = document.createElement('div');
    message.innerHTML = `Earned so far: <strong>💰 ${this.session.player.currency}</strong><br/>Ready for the next challenge?`;
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

    const dom = this.add.dom(this.scale.width / 2, this.scale.height / 2, container);
    dom.setOrigin(0.5, 0.5);
    dom.setDepth(25);

    continueBtn.addEventListener('click', () => {
      this.hideLevelOverlay();
      this.advanceToNextMap();
      this.isChallengeActive = false;
    });

    menuBtn.addEventListener('click', () => {
      this.hideLevelOverlay();
      this.phase = 'menu';
      this.renderMenu();
      this.saveSession();
    });

    this.levelOverlay = dom;
  }

  private hideLevelOverlay() {
    if (this.levelOverlay) {
      this.levelOverlay.destroy();
      this.levelOverlay = undefined;
    }
  }

  private advanceToNextMap() {
    if (!this.session) {
      return;
    }

    const nextDifficulty = getNextDifficulty(this.session.currentMap.difficulty);
    const nextMapId = `map-${this.session.player.completedMaps.length + 2}`;
  const newMap = generateTileMap(nextMapId, FIXED_MAP_SIZE, FIXED_MAP_SIZE, nextDifficulty);

    this.session.player.completedMaps = [...this.session.player.completedMaps, this.session.currentMap.id];
    this.session.player.currentMapId = nextMapId;
    this.session.player.currentPosition = newMap.startPosition;
    this.session.player.lastPlayedAt = new Date();
    this.session.player.currentStreak = 0;
    this.session.currentMap = newMap;

    this.phase = 'play';
    this.lastChallengeKey = null;
    this.rebuildScene();
    this.updateHud();
    this.saveSession();
  }

  private getHint(challenge: MathChallenge): string {
    const [a, b] = challenge.operands;
    switch (challenge.operation) {
      case 'addition':
        return `Hint: Add the numbers together! ${a} + ${b} = ?`;
      case 'subtraction':
        return `Hint: Take away the second number! ${a} - ${b} = ?`;
      case 'multiplication':
        return `Hint: Multiply the numbers! ${a} × ${b} = ?`;
      case 'division':
        return `Hint: Divide the first number by the second! ${a} ÷ ${b} = ?`;
      default:
        return 'Think about what operation you need to do!';
    }
  }

  private getDifficultyEmoji(difficulty: MathChallenge['difficulty']): string {
    switch (difficulty) {
      case 'infant':
        return '🍼';
      case 'toddler':
        return '🧸';
      case 'beginner':
        return '🌱';
      case 'easy':
        return '⭐';
      case 'medium':
        return '🔥';
      case 'hard':
        return '💎';
      case 'expert':
        return '🏆';
      default:
        return '📚';
    }
  }
}
