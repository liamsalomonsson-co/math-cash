import type {
  TileMap,
  Tile,
  Position,
  MathChallenge,
  DifficultyLevel,
  MathOperation,
  TileType,
  Mob,
} from './types';
import { generateOperands, calculateAnswer, randomInt } from './utils';

const difficultyProgression: DifficultyLevel[] = ['infant', 'toddler', 'beginner', 'easy', 'medium', 'hard', 'expert'];

/**
 * Generate a new tile map with procedural placement of challenges and boss
 */
export function generateTileMap(
  mapId: string,
  width: number,
  height: number,
  difficulty: DifficultyLevel
): TileMap {
  // Create empty grid
  const tiles: Tile[][] = Array(height)
    .fill(null)
    .map((_, y) =>
      Array(width)
        .fill(null)
        .map((_, x) => ({
          position: { x, y },
          type: 'blocked' as TileType, // Start with all blocked
          isAccessible: false,
          isBossDefeated: false,
        }))
    );

  // Set start position (bottom-left corner)
  const startPosition: Position = { x: 0, y: height - 1 };
  
  // Set boss position (top-right corner for maximum distance)
  const bossPosition: Position = { x: width - 1, y: 0 };

  // Generate maze paths
  const mazePaths = generateMazePaths(width, height, startPosition, bossPosition);
  
  // Apply maze to tiles
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (mazePaths[y][x]) {
        tiles[y][x].type = 'empty';
        tiles[y][x].isAccessible = true;
      }
    }
  }

  // Place boss at the end position with a boss challenge
  tiles[bossPosition.y][bossPosition.x].type = 'boss';
  tiles[bossPosition.y][bossPosition.x].isAccessible = true;
  tiles[bossPosition.y][bossPosition.x].bossChallenge = generateBossChallenge(difficulty);
  tiles[bossPosition.y][bossPosition.x].isBossDefeated = false;

  // Generate 10 wandering mobs with challenges
  const mobs = generateMobs(10, width, height, difficulty, startPosition, bossPosition, mazePaths);

  return {
    id: mapId,
    width,
    height,
    tiles,
    difficulty,
    bossPosition,
    startPosition,
    mobs,
    isCompleted: false,
  };
}

/**
 * Generate wandering mobs with challenges
 */
function generateMobs(
  count: number,
  width: number,
  height: number,
  difficulty: DifficultyLevel,
  startPosition: Position,
  bossPosition: Position,
  mazePaths: boolean[][]
): Mob[] {
  const mobs: Mob[] = [];

  // Get all accessible positions (excluding start and boss)
  const accessiblePositions: Position[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (mazePaths[y][x] && 
          !(x === startPosition.x && y === startPosition.y) &&
          !(x === bossPosition.x && y === bossPosition.y)) {
        accessiblePositions.push({ x, y });
      }
    }
  }

  // Randomly select positions for mobs
  const shuffledPositions = accessiblePositions.sort(() => Math.random() - 0.5);
  
  for (let i = 0; i < Math.min(count, shuffledPositions.length); i++) {
    const pos = shuffledPositions[i];
    mobs.push({
      id: `mob-${Date.now()}-${i}-${randomInt(1000, 9999)}`,
      position: { ...pos },
      challenge: generateRegularChallenge(difficulty),
      spriteFrame: randomInt(0, 3), // Random sprite frame (0-3)
      isCompleted: false,
    });
  }

  return mobs;
}

/**
 * Generate a regular math challenge
 */
function generateRegularChallenge(difficulty: DifficultyLevel): MathChallenge {
  const allowedOperationsByDifficulty: Record<DifficultyLevel, MathOperation[]> = {
    infant: ['addition'],
    toddler: ['addition'],
    beginner: ['addition', 'subtraction', 'multiplication', 'division'],
    easy: ['addition', 'subtraction', 'multiplication', 'division'],
    medium: ['addition', 'subtraction', 'multiplication', 'division'],
    hard: ['addition', 'subtraction', 'multiplication', 'division'],
    expert: ['addition', 'subtraction', 'multiplication', 'division'],
  };

  const operations = allowedOperationsByDifficulty[difficulty];
  const operation = operations[randomInt(0, operations.length - 1)];
  const operands = generateOperands(operation, difficulty);
  const correctAnswer = calculateAnswer(operation, operands);

  const rewardMultipliers: Record<DifficultyLevel, number> = {
    infant: 5,
    toddler: 8,
    beginner: 10,
    easy: 15,
    medium: 25,
    hard: 40,
    expert: 60,
  };

  return {
    id: `challenge-${Date.now()}-${randomInt(1000, 9999)}`,
    operation,
    operands,
    correctAnswer,
    difficulty,
    reward: rewardMultipliers[difficulty],
  };
}

/**
 * Generate a boss challenge (harder and more rewarding)
 */
function generateBossChallenge(difficulty: DifficultyLevel): MathChallenge {
  const currentIndex = difficultyProgression.indexOf(difficulty);
  const bossDifficulty = difficultyProgression[Math.min(currentIndex + 1, difficultyProgression.length - 1)];

  const challenge = generateRegularChallenge(bossDifficulty);
  
  // Boss rewards are 3x regular rewards
  return {
    ...challenge,
    id: `boss-${Date.now()}-${randomInt(1000, 9999)}`,
    reward: challenge.reward * 3,
  };
}

/**
 * Get the next difficulty level for map progression
 */
export function getNextDifficulty(currentDifficulty: DifficultyLevel): DifficultyLevel {
  const currentIndex = difficultyProgression.indexOf(currentDifficulty);
  return difficultyProgression[Math.min(currentIndex + 1, difficultyProgression.length - 1)];
}

/**
 * Calculate recommended map size based on difficulty
 */
export function getRecommendedMapSize(_difficulty: DifficultyLevel): { width: number; height: number } {
  // All maps are now 24x24 for consistent maze experience
  return { width: 24, height: 24 };
}

/**
 * Generate a maze-like path from start to end using simple algorithm
 */
function generateMazePaths(width: number, height: number, start: Position, end: Position): boolean[][] {
  // Initialize all as blocked (false = blocked, true = open)
  const maze = Array(height).fill(null).map(() => Array(width).fill(false));
  
  // Simple path carving algorithm
  const directions = [
    { x: 0, y: -2 }, // up
    { x: 2, y: 0 },  // right  
    { x: 0, y: 2 },  // down
    { x: -2, y: 0 }  // left
  ];
  
  function isValid(x: number, y: number): boolean {
    return x >= 0 && x < width && y >= 0 && y < height;
  }
  
  function carvePath(x: number, y: number) {
    maze[y][x] = true; // Mark as open
    
    // Randomize directions
    const shuffledDirections = [...directions].sort(() => Math.random() - 0.5);
    
    for (const dir of shuffledDirections) {
      const newX = x + dir.x;
      const newY = y + dir.y;
      const wallX = x + dir.x / 2;
      const wallY = y + dir.y / 2;
      
      if (isValid(newX, newY) && !maze[newY][newX]) {
        maze[wallY][wallX] = true; // Remove wall
        carvePath(newX, newY);
      }
    }
  }
  
  // Start carving from start position (ensure it's odd coordinates)
  const startX = start.x % 2 === 0 ? start.x + 1 : start.x;
  const startY = start.y % 2 === 0 ? start.y + 1 : start.y;
  carvePath(startX, startY);
  
  // Ensure start and end are accessible
  maze[start.y][start.x] = true;
  maze[end.y][end.x] = true;
  
  // Verify that the carved maze connects start to end; fall back to carving a random corridor if not
  if (!isPathAvailable(maze, start, end, width, height)) {
    carveFallbackPath(maze, start, end);
  }
  
  // Add some extra openings for more interesting paths
  addExtraOpenings(maze, width, height);
  
  return maze;
}

/**
 * Determine if start and end are connected through currently open tiles
 */
function isPathAvailable(maze: boolean[][], start: Position, end: Position, width: number, height: number): boolean {
  const visited = Array.from({ length: height }, () => Array(width).fill(false));
  const queue: Position[] = [start];
  visited[start.y][start.x] = true;

  const deltas = [
    { x: 0, y: -1 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
  ];

  while (queue.length) {
    const current = queue.shift()!;
    if (current.x === end.x && current.y === end.y) {
      return true;
    }

    for (const delta of deltas) {
      const nextX = current.x + delta.x;
      const nextY = current.y + delta.y;
      if (
        nextX >= 0 &&
        nextX < width &&
        nextY >= 0 &&
        nextY < height &&
        !visited[nextY][nextX] &&
        maze[nextY][nextX]
      ) {
        visited[nextY][nextX] = true;
        queue.push({ x: nextX, y: nextY });
      }
    }
  }

  return false;
}

/**
 * Fall back to a randomized monotonic corridor if the maze failed to connect start and end
 */
function carveFallbackPath(maze: boolean[][], start: Position, end: Position) {
  let currentX = start.x;
  let currentY = start.y;
  maze[currentY][currentX] = true;

  while (currentX !== end.x || currentY !== end.y) {
    const candidates: Position[] = [];

    if (currentX !== end.x) {
      const stepX = currentX < end.x ? 1 : -1;
      candidates.push({ x: currentX + stepX, y: currentY });
    }

    if (currentY !== end.y) {
      const stepY = currentY < end.y ? 1 : -1;
      candidates.push({ x: currentX, y: currentY + stepY });
    }

    const next = candidates[randomInt(0, candidates.length - 1)];

    maze[next.y][next.x] = true;

    currentX = next.x;
    currentY = next.y;
  }

  maze[end.y][end.x] = true;
}

/**
 * Add some extra openings to make the maze less linear
 */
function addExtraOpenings(maze: boolean[][], width: number, height: number) {
  const openingCount = Math.floor((width * height) * 0.1); // 10% extra openings
  
  for (let i = 0; i < openingCount; i++) {
    const x = randomInt(1, width - 2);
    const y = randomInt(1, height - 2);
    maze[y][x] = true;
  }
}
