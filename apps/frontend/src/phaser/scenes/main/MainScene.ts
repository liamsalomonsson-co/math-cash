import Phaser from 'phaser';
import type {
  Direction,
  DifficultyLevel,
  GameSession,
  MathChallenge,
  Position,
  Tile,
} from '../../../lib';
import { generateTileMap, getNextDifficulty } from '../../../lib';
import { BoardController } from './board/BoardController';
import { MenuController } from './menu/MenuController';
import { HudController } from './hud/HudController';
import { ChallengeController } from './challenge/ChallengeController';
import { LevelOverlayController } from './level/LevelOverlayController';
import { loadSession, saveSession } from './session/storage';
import { FIXED_MAP_SIZE } from './constants';
import type { GamePhase } from './types';

export class MainScene extends Phaser.Scene {
  private phase: GamePhase = 'menu';
  private session: GameSession | null = null;
  private pendingRebuild = false;
  private lastChallengeKey: string | null = null;
  private previousPosition: Position | null = null;

  private menu!: MenuController;
  private board!: BoardController;
  private hud!: HudController;
  private challenge!: ChallengeController;
  private levelOverlay!: LevelOverlayController;

  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys?: Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>;

  constructor() {
    super('MainScene');
  }

  create() {
    this.cameras.main.setBackgroundColor('#0b1e3f');

    this.board = new BoardController(this);
    this.hud = new HudController(this);
    this.challenge = new ChallengeController(this);
    this.levelOverlay = new LevelOverlayController(this);
    this.menu = new MenuController(this, {
      onStart: (name) => this.startNewGame(name),
      onContinue: () => this.continueSession(),
      getSession: () => this.session,
    });

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
      this.menu.destroy();
      this.hud.destroy();
      this.challenge.hide();
      this.levelOverlay.hide();
      this.board.destroy();
    });

    this.loadExistingSession();
    this.showMenu();
  }

  update() {
    if (this.phase !== 'play' || !this.session) {
      return;
    }

    if (this.pendingRebuild) {
      this.rebuildScene();
    }

    if (this.challenge.isActive() || this.levelOverlay.isActive()) {
      return;
    }

    const direction = this.pollDirectionalInput();
    if (direction) {
      this.movePlayer(direction);
    }
  }

  private handleResize = () => {
    const width = this.scale.width || Number(this.game.config.width) || 0;
    const height = this.scale.height || Number(this.game.config.height) || 0;

    this.challenge.handleResize(width, height);
    this.levelOverlay.handleResize(width, height);

    if (this.phase === 'menu') {
      this.showMenu();
      return;
    }

    this.pendingRebuild = true;
    this.rebuildScene();
    this.hud.position();
  };

  private handleMenuShortcut = (event: KeyboardEvent) => {
    if (this.phase !== 'play' || this.challenge.isActive() || this.levelOverlay.isActive()) {
      return;
    }

    event.preventDefault();
    this.showMenu();
    this.persistSession();
  };

  private showMenu() {
    this.phase = 'menu';
    this.board.setVisible(false);
    this.hud.setVisible(false);
    this.challenge.hide();
    this.levelOverlay.hide();
    if (this.session) {
      this.menu.setPendingName(this.session.player.name);
    }
    this.menu.render();
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

    this.menu.setPendingName(trimmed);
    this.lastChallengeKey = null;
    this.phase = 'play';
    this.menu.destroy();
    this.board.setVisible(true);
    this.hud.render();
    this.hud.setVisible(true);
    this.pendingRebuild = true;
    this.rebuildScene();
    this.persistSession();
  }

  private continueSession() {
    if (!this.session) {
      return;
    }

    this.menu.setPendingName(this.session.player.name);
    this.phase = 'play';
    this.menu.destroy();
    this.board.setVisible(true);
    this.hud.render();
    this.hud.setVisible(true);
    this.pendingRebuild = true;
    this.rebuildScene();
    this.persistSession();
  }

  private rebuildScene() {
    if (!this.session) {
      this.showMenu();
      return;
    }

    this.pendingRebuild = false;
    const success = this.board.rebuild(this.session.currentMap, this.session.player.currentPosition);
    if (!success) {
      this.pendingRebuild = true;
      return;
    }

    this.board.setVisible(true);
    this.hud.render();
    this.hud.setVisible(true);
    this.hud.update(this.session);
    this.hud.position();
    this.emitChallengeIfNeeded();
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
    if (!this.session) {
      return;
    }

    const next = this.calculateNextPosition(direction);
    if (!next) {
      return;
    }

    this.previousPosition = { ...this.session.player.currentPosition };
    this.session.player.currentPosition = next;
    this.session.player.lastPlayedAt = new Date();
    this.board.refreshTiles(this.session.currentMap, next);
    this.board.updatePlayerMarker(next);
    this.emitChallengeIfNeeded();
    this.persistSession();
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
        this.challenge.present(tile, {
          onSuccess: (completedTile) => this.completeChallenge(completedTile),
          onCancel: () => this.handleChallengeCancel(),
          getHint: (challenge) => this.getHint(challenge),
        });
      }
    } else {
      this.lastChallengeKey = null;
    }
  }

  private handleChallengeCancel() {
    if (!this.session || !this.previousPosition) {
      return;
    }

    this.session.player.currentPosition = { ...this.previousPosition };
    this.session.player.lastPlayedAt = new Date();
    this.board.refreshTiles(this.session.currentMap, this.session.player.currentPosition);
    this.board.updatePlayerMarker(this.session.player.currentPosition);
    this.persistSession();
    this.lastChallengeKey = null;
    this.previousPosition = null;
  }

  private completeChallenge(tile: Tile) {
    if (!this.session || !tile.challenge) {
      return;
    }

    const { challenge } = tile;
    if (tile.isCompleted) {
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

    this.board.refreshTiles(this.session.currentMap, this.session.player.currentPosition);
    this.hud.update(this.session);
    this.persistSession();
    this.checkMapCompletion();
    this.lastChallengeKey = null;
    this.previousPosition = null;
  }

  private checkMapCompletion() {
    if (!this.session) {
      return;
    }

    const map = this.session.currentMap;
    const allCompleted = map.tiles.every((row) => row.every((tile) => !tile.challenge || tile.isCompleted));
    if (!allCompleted) {
      return;
    }

    this.levelOverlay.show(this.session, {
      onAdvance: () => {
        this.advanceToNextMap();
        this.persistSession();
      },
      onMenu: () => {
        this.showMenu();
        this.persistSession();
      },
    });
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
    this.pendingRebuild = true;
    this.rebuildScene();
    this.hud.update(this.session);
    this.persistSession();
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

  private loadExistingSession() {
    const session = loadSession();
    if (!session) {
      return;
    }

    this.session = session;
    this.menu.setPendingName(session.player.name);
  }

  private persistSession() {
    saveSession(this.session);
  }
}
