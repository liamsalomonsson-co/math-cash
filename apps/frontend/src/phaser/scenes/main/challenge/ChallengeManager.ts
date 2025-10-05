import type { MathChallenge, Mob, Position, Tile } from '../../../../lib';
import type { BoardController } from '../board/BoardController';
import type { ChallengeController } from './ChallengeController';
import type { MobController } from '../mob/MobController';
import type { GameStateManager } from '../state/GameStateManager';

export interface ChallengeCallbacks {
  onChallengeStart: () => void;
  onChallengeComplete: () => void;
  onBossComplete: () => void;
}

/**
 * Manages challenge detection, presentation, and completion/failure logic
 */
export class ChallengeManager {
  private stateManager: GameStateManager;
  private board: BoardController;
  private challengeController: ChallengeController;
  private mobController: MobController;
  private callbacks: ChallengeCallbacks;

  private lastChallengeKey: string | null = null;
  private previousPosition: Position | null = null;

  constructor(
    stateManager: GameStateManager,
    board: BoardController,
    challengeController: ChallengeController,
    mobController: MobController,
    callbacks: ChallengeCallbacks,
  ) {
    this.stateManager = stateManager;
    this.board = board;
    this.challengeController = challengeController;
    this.mobController = mobController;
    this.callbacks = callbacks;
  }

  /**
   * Check if player position triggers a challenge (boss tile or mob collision)
   */
  checkForChallenge(currentPosition: Position) {
    const session = this.stateManager.getSession();
    if (!session) {
      this.lastChallengeKey = null;
      return;
    }

    // Check for boss tile collision first
    const currentTile = session.currentMap.tiles[currentPosition.y]?.[currentPosition.x];
    if (currentTile?.type === 'boss' && currentTile.bossChallenge && !currentTile.isBossDefeated) {
      const key = `boss:${currentPosition.x},${currentPosition.y}`;
      if (this.lastChallengeKey !== key) {
        this.lastChallengeKey = key;
        this.mobController.pauseMovement();
        const tempTile = {
          ...currentTile,
          challenge: currentTile.bossChallenge,
          isCompleted: currentTile.isBossDefeated,
        };
        this.challengeController.present(tempTile, {
          onSuccess: () => this.completeBossChallenge(currentTile),
          onCancel: () => this.handleChallengeCancel(),
          onFailure: (_, penalty) => this.handleChallengeFailure(penalty),
          getHint: (challenge) => this.getHint(challenge),
        });
      }
      return;
    }
    
    // Check for mob collision
    const mob = this.mobController.getMobAtPosition(session.currentMap, currentPosition);
    if (mob) {
      const key = `${currentPosition.x},${currentPosition.y}:${mob.id}`;
      if (this.lastChallengeKey !== key) {
        this.lastChallengeKey = key;
        this.mobController.pauseMovement();
        // Create a temporary tile object with the mob's challenge
        const tempTile = {
          position: currentPosition,
          type: 'challenge' as const,
          isAccessible: true,
          challenge: mob.challenge,
          isCompleted: mob.isCompleted,
          bossChallenge: undefined,
          isBossDefeated: false,
          mobType: mob.type,
        };
        this.challengeController.present(tempTile, {
          onSuccess: () => this.completeMobChallenge(mob),
          onCancel: () => this.handleChallengeCancel(),
          onFailure: (_, penalty) => this.handleChallengeFailure(penalty),
          getHint: (challenge) => this.getHint(challenge),
        });
      }
    } else {
      this.lastChallengeKey = null;
    }
  }

  /**
   * Set the previous position (for rollback on cancel)
   */
  setPreviousPosition(position: Position) {
    this.previousPosition = { ...position };
  }

  /**
   * Clear challenge state
   */
  clearChallengeState() {
    this.lastChallengeKey = null;
    this.previousPosition = null;
  }

  /**
   * Handle challenge cancellation - move player back
   */
  private handleChallengeCancel() {
    const session = this.stateManager.getSession();
    if (!session || !this.previousPosition) {
      return;
    }

    session.player.currentPosition = { ...this.previousPosition };
    this.stateManager.updateLastPlayed();
    this.board.refreshTiles(session.currentMap, session.player.currentPosition);
    this.board.updatePlayerMarker(session.player.currentPosition);
    this.stateManager.persistSession();
    this.clearChallengeState();
    this.mobController.resumeMovement();
  }

  /**
   * Handle challenge failure - deduct coins and reset position
   */
  private handleChallengeFailure(penalty: number) {
    const session = this.stateManager.getSession();
    if (!session) {
      return;
    }

    // Store current position before resetting
    const currentPosition = { ...session.player.currentPosition };

    // Deduct coins (never go below 0)
    this.stateManager.deductCurrency(penalty);
    
    // Reset player to start position
    session.player.currentPosition = { ...session.currentMap.startPosition };
    this.stateManager.updateLastPlayed();
    
    // Reset current streak on failure
    this.stateManager.resetStreak();
    
    this.board.refreshTiles(session.currentMap, session.player.currentPosition);
    
    // Animate player swooshing back to start with penalty text
    this.board.animatePlayerResetToStart(currentPosition, session.currentMap.startPosition, penalty, () => {
      this.stateManager.persistSession();
      this.clearChallengeState();
      this.mobController.resumeMovement();
      this.callbacks.onChallengeComplete();
    });
  }

  /**
   * Handle boss challenge completion
   */
  private completeBossChallenge(tile: Tile) {
    const session = this.stateManager.getSession();
    if (!session || !tile.bossChallenge) {
      return;
    }

    const { bossChallenge } = tile;
    if (tile.isBossDefeated) {
      return;
    }

    tile.isBossDefeated = true;
    
    // Apply coin multiplier if active
    this.stateManager.applyReward(bossChallenge.reward);
    this.stateManager.updateStreakAndStats();
    this.stateManager.updateLastPlayed();

    this.board.refreshTiles(session.currentMap, session.player.currentPosition);
    this.stateManager.persistSession();
    this.clearChallengeState();
    this.mobController.resumeMovement();
    this.callbacks.onBossComplete();
  }

  /**
   * Handle mob challenge completion
   */
  private completeMobChallenge(mob: Mob) {
    const session = this.stateManager.getSession();
    if (!session) {
      return;
    }

    const { challenge } = mob;
    if (mob.isCompleted) {
      return;
    }

    mob.isCompleted = true;
    
    // Apply coin multiplier if active
    this.stateManager.applyReward(challenge.reward);
    this.stateManager.updateStreakAndStats();
    this.stateManager.updateLastPlayed();

    this.mobController.updateMobVisibility(session.currentMap);
    this.board.refreshTiles(session.currentMap, session.player.currentPosition);
    this.stateManager.persistSession();
    this.clearChallengeState();
    this.mobController.resumeMovement();
    this.callbacks.onChallengeComplete();
  }

  /**
   * Generate contextual hint for a challenge
   */
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
}
