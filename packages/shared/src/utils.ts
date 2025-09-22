import type { MathOperation, DifficultyLevel, Position, Direction } from './types';

/**
 * Generate a random integer between min and max (inclusive)
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Calculate distance between two positions using Manhattan distance
 */
export function getManhattanDistance(pos1: Position, pos2: Position): number {
  return Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y);
}

/**
 * Get new position after moving in a direction
 */
export function getNewPosition(position: Position, direction: Direction): Position {
  switch (direction) {
    case 'up':
      return { x: position.x, y: position.y - 1 };
    case 'down':
      return { x: position.x, y: position.y + 1 };
    case 'left':
      return { x: position.x - 1, y: position.y };
    case 'right':
      return { x: position.x + 1, y: position.y };
  }
}

/**
 * Check if a position is within map bounds
 */
export function isValidPosition(position: Position, mapWidth: number, mapHeight: number): boolean {
  return position.x >= 0 && position.x < mapWidth && position.y >= 0 && position.y < mapHeight;
}

/**
 * Generate operands for math challenges based on difficulty
 */
export function generateOperands(operation: MathOperation, difficulty: DifficultyLevel): number[] {
  const ranges: Record<DifficultyLevel, { min: number; max: number }> = {
    beginner: { min: 1, max: 5 },
    easy: { min: 1, max: 10 },
    medium: { min: 5, max: 20 },
    hard: { min: 10, max: 50 },
    expert: { min: 20, max: 100 },
  };

  const range = ranges[difficulty];

  switch (operation) {
    case 'addition':
    case 'subtraction':
      return [randomInt(range.min, range.max), randomInt(range.min, range.max)];
    case 'multiplication':
      // Keep multiplication smaller to avoid huge numbers
      const multRange = { min: range.min, max: Math.min(range.max, 12) };
      return [randomInt(multRange.min, multRange.max), randomInt(multRange.min, multRange.max)];
    case 'division':
      // For division, ensure clean division
      const divisor = randomInt(range.min, Math.min(range.max, 12));
      const quotient = randomInt(range.min, range.max);
      return [divisor * quotient, divisor];
    default:
      throw new Error(`Unsupported operation: ${operation}`);
  }
}

/**
 * Calculate the correct answer for a math challenge
 */
export function calculateAnswer(operation: MathOperation, operands: number[]): number {
  const [a, b] = operands;
  switch (operation) {
    case 'addition':
      return a + b;
    case 'subtraction':
      return a - b;
    case 'multiplication':
      return a * b;
    case 'division':
      return a / b;
    default:
      throw new Error(`Unsupported operation: ${operation}`);
  }
}

/**
 * Format a math challenge as a human-readable string
 */
export function formatChallenge(operation: MathOperation, operands: number[]): string {
  const [a, b] = operands;
  const symbols: Record<MathOperation, string> = {
    addition: '+',
    subtraction: '-',
    multiplication: '×',
    division: '÷',
  };
  return `${a} ${symbols[operation]} ${b} = ?`;
}