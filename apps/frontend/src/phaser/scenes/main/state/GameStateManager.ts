import type { DifficultyLevel, GameSession } from '../../../../lib';
import { generateTileMap } from '../../../../lib';
import { loadSession, saveSession } from '../session/storage';
import { FIXED_MAP_SIZE } from '../constants';
import type { GamePhase } from '../types';

/**
 * Manages game session state, phase transitions, and persistence
 */
export class GameStateManager {
  private phase: GamePhase = 'menu';
  private session: GameSession | null = null;

  /**
   * Get the current game phase
   */
  getPhase(): GamePhase {
    return this.phase;
  }

  /**
   * Set the game phase
   */
  setPhase(phase: GamePhase) {
    this.phase = phase;
  }

  /**
   * Get the current session
   */
  getSession(): GameSession | null {
    return this.session;
  }

  /**
   * Set the session
   */
  setSession(session: GameSession | null) {
    this.session = session;
  }

  /**
   * Load existing session from storage
   */
  loadExistingSession(): GameSession | null {
    const session = loadSession();
    if (session) {
      this.session = session;
    }
    return session;
  }

  /**
   * Persist the current session to storage
   */
  persistSession() {
    saveSession(this.session);
  }

  /**
   * Create a new game session
   */
  createNewSession(playerName: string): GameSession {
    const trimmed = playerName.trim();
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
        coinMultiplierCharges: 0,
      },
      currentMap: map,
      gameStartedAt: now,
      isPaused: false,
    };

    return this.session;
  }

  /**
   * Reset current streak (e.g., on challenge failure)
   */
  resetStreak() {
    if (!this.session) return;
    this.session.player.currentStreak = 0;
  }

  /**
   * Update streak and stats after successful challenge
   */
  updateStreakAndStats() {
    if (!this.session) return;
    
    this.session.player.totalChallengesCompleted += 1;
    this.session.player.currentStreak += 1;
    this.session.player.bestStreak = Math.max(
      this.session.player.bestStreak,
      this.session.player.currentStreak,
    );
  }

  /**
   * Add currency to player's wallet
   */
  addCurrency(amount: number) {
    if (!this.session) return;
    this.session.player.currency += amount;
  }

  /**
   * Deduct currency from player's wallet (never goes below 0)
   */
  deductCurrency(amount: number): number {
    if (!this.session) return 0;
    
    const coinsToDeduct = Math.min(amount, this.session.player.currency);
    this.session.player.currency = Math.max(0, this.session.player.currency - coinsToDeduct);
    return coinsToDeduct;
  }

  /**
   * Apply coin multiplier if active, returns actual coins earned
   */
  applyReward(baseReward: number): number {
    if (!this.session) return baseReward;
    
    let coinsEarned = baseReward;
    if (this.session.player.coinMultiplierCharges > 0) {
      coinsEarned = baseReward * 2;
      this.session.player.coinMultiplierCharges -= 1;
    }
    
    this.addCurrency(coinsEarned);
    return coinsEarned;
  }

  /**
   * Update last played timestamp
   */
  updateLastPlayed() {
    if (!this.session) return;
    this.session.player.lastPlayedAt = new Date();
  }
}
