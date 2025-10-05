import { z } from 'zod';

// Math operations supported by the game
export const MathOperation = z.enum(['addition', 'subtraction', 'multiplication', 'division']);
export type MathOperation = z.infer<typeof MathOperation>;

// Difficulty levels that scale with map progression
export const DifficultyLevel = z.enum(['infant', 'toddler', 'beginner', 'easy', 'medium', 'hard', 'expert']);
export type DifficultyLevel = z.infer<typeof DifficultyLevel>;

// Types of tiles on the game map
export const TileType = z.enum(['empty', 'challenge', 'boss', 'blocked']);
export type TileType = z.infer<typeof TileType>;

// Mob types that determine minigame and sprite
export const MobType = z.enum(['slime', 'skeleton', 'orc', 'bat']);
export type MobType = z.infer<typeof MobType>;

// Player movement directions
export const Direction = z.enum(['up', 'down', 'left', 'right']);
export type Direction = z.infer<typeof Direction>;

// Position on the tile grid
export const Position = z.object({
  x: z.number().int().min(0),
  y: z.number().int().min(0),
});
export type Position = z.infer<typeof Position>;

// Math challenge definition
export const MathChallenge = z.object({
  id: z.string(),
  operation: MathOperation,
  operands: z.array(z.number()).min(2),
  correctAnswer: z.number(),
  difficulty: DifficultyLevel,
  timeLimit: z.number().positive().optional(), // seconds
  reward: z.number().int().positive(), // currency amount
});
export type MathChallenge = z.infer<typeof MathChallenge>;

// Individual tile on the map
export const Tile = z.object({
  position: Position,
  type: TileType,
  isAccessible: z.boolean().default(true),
  // Boss tile has a challenge (doesn't move like mobs)
  bossChallenge: MathChallenge.optional(),
  isBossDefeated: z.boolean().default(false),
});
export type Tile = z.infer<typeof Tile>;

// Wandering mob entity
export const Mob = z.object({
  id: z.string(),
  position: Position,
  challenge: MathChallenge,
  type: MobType,
  spriteFrame: z.number().int().min(0).max(3), // 0-3 for the 4 mob sprites
  isCompleted: z.boolean().default(false),
});
export type Mob = z.infer<typeof Mob>;

// Complete tile map
export const TileMap = z.object({
  id: z.string(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  tiles: z.array(z.array(Tile)),
  difficulty: DifficultyLevel,
  bossPosition: Position,
  startPosition: Position,
  mobs: z.array(Mob).default([]),
  isCompleted: z.boolean().default(false),
});
export type TileMap = z.infer<typeof TileMap>;

// Player state and progress
export const PlayerState = z.object({
  id: z.string(),
  name: z.string().min(1),
  currentPosition: Position,
  currentMapId: z.string(),
  currency: z.number().int().min(0).default(0),
  completedMaps: z.array(z.string()).default([]),
  totalChallengesCompleted: z.number().int().min(0).default(0),
  currentStreak: z.number().int().min(0).default(0),
  bestStreak: z.number().int().min(0).default(0),
  createdAt: z.date(),
  lastPlayedAt: z.date(),
  // Power-ups
  coinMultiplierCharges: z.number().int().min(0).default(0),
});
export type PlayerState = z.infer<typeof PlayerState>;

// Game session state
export const GameSession = z.object({
  player: PlayerState,
  currentMap: TileMap,
  gameStartedAt: z.date(),
  isPaused: z.boolean().default(false),
});
export type GameSession = z.infer<typeof GameSession>;

// Challenge attempt result
export const ChallengeAttempt = z.object({
  challengeId: z.string(),
  playerId: z.string(),
  submittedAnswer: z.number(),
  isCorrect: z.boolean(),
  timeSpent: z.number().positive(), // seconds
  attemptsCount: z.number().int().positive(),
  timestamp: z.date(),
});
export type ChallengeAttempt = z.infer<typeof ChallengeAttempt>;
