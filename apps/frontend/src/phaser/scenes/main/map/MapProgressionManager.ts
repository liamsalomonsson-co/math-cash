import { generateTileMap, getNextDifficulty } from '../../../../lib';
import { FIXED_MAP_SIZE } from '../constants';
import type { GameStateManager } from '../state/GameStateManager';
import type { LevelOverlayController } from '../level/LevelOverlayController';
import type { MobController } from '../mob/MobController';

export interface MapProgressionCallbacks {
  onMapComplete: () => void;
  onMapAdvanced: () => void;
}

/**
 * Manages map completion detection and progression to next levels
 */
export class MapProgressionManager {
  private stateManager: GameStateManager;
  private levelOverlay: LevelOverlayController;
  private mobController: MobController;
  private callbacks: MapProgressionCallbacks;

  constructor(
    stateManager: GameStateManager,
    levelOverlay: LevelOverlayController,
    mobController: MobController,
    callbacks: MapProgressionCallbacks,
  ) {
    this.stateManager = stateManager;
    this.levelOverlay = levelOverlay;
    this.mobController = mobController;
    this.callbacks = callbacks;
  }

  /**
   * Check if current map is completed (boss defeated)
   */
  checkMapCompletion() {
    const session = this.stateManager.getSession();
    if (!session) {
      return;
    }

    const map = session.currentMap;
    // Map is complete when boss is defeated (mobs don't matter)
    const bossTile = map.tiles[map.bossPosition.y][map.bossPosition.x];
    if (!bossTile.isBossDefeated) {
      return;
    }

    this.mobController.stopMovement();
    this.levelOverlay.show(session, {
      onAdvance: () => {
        this.advanceToNextMap();
        this.stateManager.persistSession();
      },
      onMenu: () => {
        this.callbacks.onMapComplete();
        this.stateManager.persistSession();
      },
    });
  }

  /**
   * Progress to the next map level
   */
  advanceToNextMap() {
    const session = this.stateManager.getSession();
    if (!session) {
      return;
    }

    const nextDifficulty = getNextDifficulty(session.currentMap.difficulty);
    const nextMapId = `map-${session.player.completedMaps.length + 2}`;
    const newMap = generateTileMap(nextMapId, FIXED_MAP_SIZE, FIXED_MAP_SIZE, nextDifficulty);

    session.player.completedMaps = [...session.player.completedMaps, session.currentMap.id];
    session.player.currentMapId = nextMapId;
    session.player.currentPosition = newMap.startPosition;
    this.stateManager.updateLastPlayed();
    session.player.currentStreak = 0;
    session.currentMap = newMap;

    this.callbacks.onMapAdvanced();
  }
}
