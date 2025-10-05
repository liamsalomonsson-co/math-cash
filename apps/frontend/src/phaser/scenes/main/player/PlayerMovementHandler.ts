import type { Direction, Position, TileMap } from '../../../../lib';
import type { BoardController } from '../board/BoardController';
import type { GameStateManager } from '../state/GameStateManager';

/**
 * Handles player movement logic and position calculations
 */
export class PlayerMovementHandler {
  private stateManager: GameStateManager;
  private board: BoardController;

  constructor(stateManager: GameStateManager, board: BoardController) {
    this.stateManager = stateManager;
    this.board = board;
  }

  /**
   * Move player in the given direction if valid
   * Returns the new position if movement succeeded, null otherwise
   */
  movePlayer(direction: Direction): Position | null {
    const session = this.stateManager.getSession();
    if (!session) {
      return null;
    }

    const next = this.calculateNextPosition(direction, session.currentMap, session.player.currentPosition);
    if (!next) {
      return null;
    }

    session.player.currentPosition = next;
    this.stateManager.updateLastPlayed();
    this.board.refreshTiles(session.currentMap, next);
    this.board.updatePlayerMarker(next);
    this.stateManager.persistSession();
    
    return next;
  }

  /**
   * Calculate the next position based on direction and map constraints
   */
  private calculateNextPosition(direction: Direction, map: TileMap, current: Position): Position | null {
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
}
