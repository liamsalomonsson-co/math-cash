import type { GameSession } from '../../../../lib';
import { STORAGE_KEY } from '../constants';

export function loadSession(): GameSession | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as GameSession;
    parsed.player.createdAt = new Date(parsed.player.createdAt);
    parsed.player.lastPlayedAt = new Date(parsed.player.lastPlayedAt);
    parsed.gameStartedAt = new Date(parsed.gameStartedAt);
    return parsed;
  } catch (error) {
    console.error('Failed to load saved game', error);
    return null;
  }
}

export function saveSession(session: GameSession | null): void {
  if (!session) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}
