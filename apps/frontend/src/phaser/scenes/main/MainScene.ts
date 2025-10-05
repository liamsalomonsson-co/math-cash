import Phaser from 'phaser';
import type { GameSession } from '../../../lib';
import { BoardController } from './board/BoardController';
import { MenuController } from './menu/MenuController';
import { HudController } from './hud/HudController';
import { ChallengeController } from './challenge/ChallengeController';
import { LevelOverlayController } from './level/LevelOverlayController';
import { ShopController } from './shop/ShopController';
import { MobController } from './mob/MobController';
import type { ShopItem } from './shop/ShopController';
import { InputHandler } from './input/InputHandler';
import { GameStateManager } from './state/GameStateManager';
import { ChallengeManager } from './challenge/ChallengeManager';
import { PlayerMovementHandler } from './player/PlayerMovementHandler';
import { MapProgressionManager } from './map/MapProgressionManager';

export class MainScene extends Phaser.Scene {
  private pendingRebuild = false;

  // Controllers
  private menu!: MenuController;
  private board!: BoardController;
  private hud!: HudController;
  private challenge!: ChallengeController;
  private levelOverlay!: LevelOverlayController;
  private shop!: ShopController;
  private mob!: MobController;

  // Handlers
  private inputHandler!: InputHandler;
  private stateManager!: GameStateManager;
  private challengeManager!: ChallengeManager;
  private playerMovement!: PlayerMovementHandler;
  private mapProgression!: MapProgressionManager;

  constructor() {
    super('MainScene');
  }

  preload() {
    this.load.image('wizard', '/assets/sprites/wizard.png');
    
    // Load mob sprite sheet - 4 sprites in a 2x2 grid (512x512 each in 1024x1024 image)
    this.load.spritesheet('mobs', '/assets/sprites/mobs.png', {
      frameWidth: 512,
      frameHeight: 512
    });
  }

  create() {
    this.cameras.main.setBackgroundColor('#0b1e3f');

    // Initialize state and input handlers
    this.stateManager = new GameStateManager();
    this.inputHandler = new InputHandler(this);

    // Initialize controllers
    this.board = new BoardController(this);
    this.hud = new HudController(this);
    this.challenge = new ChallengeController(this);
    this.levelOverlay = new LevelOverlayController(this);
    this.shop = new ShopController(this);
    this.mob = new MobController(this);
    
    // Initialize gameplay handlers
    this.playerMovement = new PlayerMovementHandler(this.stateManager, this.board);
    this.challengeManager = new ChallengeManager(
      this.stateManager,
      this.board,
      this.challenge,
      this.mob,
      {
        onChallengeStart: () => {},
        onChallengeComplete: () => {
          this.hud.update(this.stateManager.getSession()!);
          this.mapProgression.checkMapCompletion();
        },
        onBossComplete: () => {
          this.hud.update(this.stateManager.getSession()!);
          this.mapProgression.checkMapCompletion();
        },
      }
    );
    this.mapProgression = new MapProgressionManager(
      this.stateManager,
      this.levelOverlay,
      this.mob,
      {
        onMapComplete: () => this.showMenu(),
        onMapAdvanced: () => {
          this.stateManager.setPhase('play');
          this.challengeManager.clearChallengeState();
          this.pendingRebuild = true;
          this.rebuildScene();
          this.hud.update(this.stateManager.getSession()!);
          this.stateManager.persistSession();
        },
      }
    );
    
    // Initialize shop and menu
    this.shop.initialize({
      onPurchase: (item, session) => this.handlePurchase(item, session),
      getSession: () => this.stateManager.getSession(),
    });
    this.menu = new MenuController(this, {
      onStart: (name) => this.startNewGame(name),
      onContinue: () => this.continueSession(),
      getSession: () => this.stateManager.getSession(),
    });

    this.input.keyboard?.on('keydown-M', this.handleMenuShortcut, this);

    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this);
      this.input.keyboard?.off('keydown-M', this.handleMenuShortcut, this);
      this.menu.destroy();
      this.hud.destroy();
      this.challenge.hide();
      this.levelOverlay.hide();
      this.shop.destroy();
      this.mob.destroy();
      this.board.destroy();
      this.inputHandler.destroy();
    });

    this.stateManager.loadExistingSession();
    this.showMenu();
  }

  update() {
    if (this.stateManager.getPhase() !== 'play' || !this.stateManager.getSession()) {
      return;
    }

    if (this.pendingRebuild) {
      this.rebuildScene();
    }

    if (this.challenge.isActive() || this.levelOverlay.isActive() || this.shop.isActive()) {
      return;
    }

    const direction = this.inputHandler.pollDirectionalInput();
    if (direction) {
      const session = this.stateManager.getSession();
      if (session) {
        this.challengeManager.setPreviousPosition(session.player.currentPosition);
        const newPosition = this.playerMovement.movePlayer(direction);
        if (newPosition) {
          this.challengeManager.checkForChallenge(newPosition);
        }
      }
    }
  }

  private handleResize = () => {
    const width = this.scale.width || Number(this.game.config.width) || 0;
    const height = this.scale.height || Number(this.game.config.height) || 0;

    this.challenge.handleResize(width, height);
    this.levelOverlay.handleResize(width, height);
    this.shop.handleResize(width, height);

    if (this.stateManager.getPhase() === 'menu') {
      this.showMenu();
      return;
    }

    this.pendingRebuild = true;
    this.rebuildScene();
    this.hud.position();
  };

  private handleMenuShortcut = (event: KeyboardEvent) => {
    if (this.stateManager.getPhase() !== 'play' || this.challenge.isActive() || this.levelOverlay.isActive()) {
      return;
    }

    event.preventDefault();
    this.showMenu();
    this.stateManager.persistSession();
  };

  private showMenu() {
    this.stateManager.setPhase('menu');
    this.board.setVisible(false);
    this.hud.setVisible(false);
    this.challenge.hide();
    this.levelOverlay.hide();
    this.shop.setVisible(false);
    this.mob.stopMovement();
    this.mob.setVisible(false);
    const session = this.stateManager.getSession();
    if (session) {
      this.menu.setPendingName(session.player.name);
    }
    this.menu.render();
  }

  private startNewGame(name: string) {
    const trimmed = name.trim();
    this.stateManager.createNewSession(trimmed);
    
    this.menu.setPendingName(trimmed);
    this.challengeManager.clearChallengeState();
    this.stateManager.setPhase('play');
    this.menu.destroy();
    this.board.setVisible(true);
    this.shop.setVisible(true);
    this.hud.render();
    this.hud.setVisible(true);
    this.pendingRebuild = true;
    this.rebuildScene();
    this.stateManager.persistSession();
  }

  private continueSession() {
    const session = this.stateManager.getSession();
    if (!session) {
      return;
    }

    this.menu.setPendingName(session.player.name);
    this.stateManager.setPhase('play');
    this.menu.destroy();
    this.board.setVisible(true);
    this.shop.setVisible(true);
    this.mob.setVisible(true);
    this.hud.render();
    this.hud.setVisible(true);
    this.pendingRebuild = true;
    this.rebuildScene();
    this.stateManager.persistSession();
  }

  private rebuildScene() {
    const session = this.stateManager.getSession();
    if (!session) {
      this.showMenu();
      return;
    }

    this.pendingRebuild = false;
    const success = this.board.rebuild(session.currentMap, session.player.currentPosition);
    if (!success) {
      this.pendingRebuild = true;
      return;
    }

    // Render and start mob movement
    const { tileSize, offsetX, offsetY } = this.board.getBoardDimensions();
    this.mob.render(session.currentMap, tileSize, offsetX, offsetY);
    this.mob.startMovement(session.currentMap, () => {
      // Check for collision whenever mobs move
      if (session.player.currentPosition) {
        this.challengeManager.checkForChallenge(session.player.currentPosition);
      }
    });

    this.board.setVisible(true);
    this.hud.render();
    this.hud.setVisible(true);
    this.hud.update(session);
    this.hud.position();
    this.challengeManager.checkForChallenge(session.player.currentPosition);
  }

  private handlePurchase(item: ShopItem, session: GameSession) {
    if (session.player.currency >= item.price) {
      session.player.currency -= item.price;
      this.stateManager.updateLastPlayed();
      
      // Handle item effects
      switch (item.id) {
        case 'coin-multiplier':
          session.player.coinMultiplierCharges += 5; // Add 5 charges (2x coins for 5 challenges)
          break;
        // TODO: Implement other items here
        default:
          break;
      }
      
      this.hud.update(session);
      this.stateManager.persistSession();
    }
  }
}
