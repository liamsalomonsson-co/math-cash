import React, { createContext, useContext, useReducer, useEffect } from 'react';
import type { GameSession, PlayerState, Position, Direction } from '@math-cash/shared';

// Temporary inline functions until module resolution is fixed
const generateTileMap = (id: string, width: number, height: number, difficulty: string) => {
  // Initialize all tiles as blocked
  const tiles = Array(height).fill(null).map((_, y) =>
    Array(width).fill(null).map((_, x) => ({
      position: { x, y },
      type: 'blocked' as 'empty' | 'challenge' | 'boss' | 'blocked',
      isCompleted: false,
      isAccessible: false,
      challenge: undefined as any,
    }))
  );
  
  // Define start and boss positions
  const startX = 0;
  const startY = height - 1; // Bottom-left
  const bossX = width - 1;
  const bossY = 0; // Top-right

  const difficultySettings: Record<string, { operations: Array<'addition' | 'subtraction' | 'multiplication'>; min: number; max: number; reward: number; density: number }> = {
    infant: { operations: ['addition'], min: 0, max: 5, reward: 5, density: 0.08 },
    toddler: { operations: ['addition'], min: 0, max: 9, reward: 8, density: 0.12 },
    beginner: { operations: ['addition', 'subtraction', 'multiplication'], min: 1, max: 5, reward: 10, density: 0.15 },
    easy: { operations: ['addition', 'subtraction', 'multiplication'], min: 1, max: 10, reward: 15, density: 0.2 },
    medium: { operations: ['addition', 'subtraction', 'multiplication'], min: 5, max: 20, reward: 25, density: 0.25 },
    hard: { operations: ['addition', 'subtraction', 'multiplication'], min: 10, max: 50, reward: 40, density: 0.3 },
    expert: { operations: ['addition', 'subtraction', 'multiplication'], min: 20, max: 100, reward: 60, density: 0.35 },
  };
  const getSettings = (level: string) => difficultySettings[level] ?? difficultySettings.beginner;
  const settings = getSettings(difficulty);

  const getOperands = (levelSettings: { min: number; max: number }) => {
    const range = levelSettings.max - levelSettings.min + 1;
    const randomOperand = () => Math.floor(Math.random() * range) + levelSettings.min;
    return [randomOperand(), randomOperand()];
  };

  const computeAnswer = (operation: string, operands: number[]): number => {
    switch (operation) {
      case 'addition':
        return operands[0] + operands[1];
      case 'subtraction':
        return Math.abs(operands[0] - operands[1]);
      case 'multiplication':
      default:
        return operands[0] * operands[1];
    }
  };
  
  // Generate maze using recursive backtracking for connected paths
  const generateMaze = () => {
    const visited = Array(height).fill(null).map(() => Array(width).fill(false));
    const stack: Array<{x: number, y: number}> = [];
    
    // Start from a random position near the center to ensure good connectivity
    const centerX = Math.floor(width / 2);
    const centerY = Math.floor(height / 2);
    
    stack.push({ x: centerX, y: centerY });
    visited[centerY][centerX] = true;
    tiles[centerY][centerX].type = 'empty';
    tiles[centerY][centerX].isAccessible = true;
    
    const directions = [
      { x: 0, y: -1 }, // up
      { x: 1, y: 0 },  // right
      { x: 0, y: 1 },  // down
      { x: -1, y: 0 }  // left
    ];
    
    while (stack.length > 0) {
      const current = stack[stack.length - 1];
      const neighbors = [];
      
      // Find unvisited neighbors
      for (const dir of directions) {
        const newX = current.x + dir.x * 2; // Skip one cell to create corridors
        const newY = current.y + dir.y * 2;
        
        if (newX >= 0 && newX < width && newY >= 0 && newY < height && !visited[newY][newX]) {
          neighbors.push({ x: newX, y: newY, dir });
        }
      }
      
      if (neighbors.length > 0) {
        // Choose random neighbor
        const neighbor = neighbors[Math.floor(Math.random() * neighbors.length)];
        
        // Mark neighbor as visited and accessible
        visited[neighbor.y][neighbor.x] = true;
        tiles[neighbor.y][neighbor.x].type = 'empty';
        tiles[neighbor.y][neighbor.x].isAccessible = true;
        
        // Create path between current and neighbor
        const pathX = current.x + neighbor.dir.x;
        const pathY = current.y + neighbor.dir.y;
        if (pathX >= 0 && pathX < width && pathY >= 0 && pathY < height) {
          tiles[pathY][pathX].type = 'empty';
          tiles[pathY][pathX].isAccessible = true;
        }
        
        stack.push(neighbor);
      } else {
        stack.pop(); // Backtrack
      }
    }
  };
  
  // Generate the maze structure
  generateMaze();
  
  // Ensure start position is accessible
  tiles[startY][startX].type = 'empty';
  tiles[startY][startX].isAccessible = true;
  
  // Connect start to nearest accessible tile if needed
  const connectToNearestPath = (fromX: number, fromY: number) => {
    const queue = [{ x: fromX, y: fromY, distance: 0 }];
    const visited = Array(height).fill(null).map(() => Array(width).fill(false));
    visited[fromY][fromX] = true;
    
    while (queue.length > 0) {
      const current = queue.shift()!;
      
      // Check if we found an accessible tile
      if (tiles[current.y][current.x].isAccessible && (current.x !== fromX || current.y !== fromY)) {
        // Create path back to start
        let pathX = fromX;
        let pathY = fromY;
        
        while (pathX !== current.x || pathY !== current.y) {
          // Don't overwrite boss or challenge tiles when creating paths
          if (tiles[pathY][pathX].type === 'blocked') {
            tiles[pathY][pathX].type = 'empty';
          }
          tiles[pathY][pathX].isAccessible = true;
          
          // Move towards target
          if (pathX < current.x) pathX++;
          else if (pathX > current.x) pathX--;
          else if (pathY < current.y) pathY++;
          else if (pathY > current.y) pathY--;
        }
        break;
      }
      
      // Add neighbors to queue
      const directions = [
        { x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }
      ];
      
      for (const dir of directions) {
        const newX = current.x + dir.x;
        const newY = current.y + dir.y;
        
        if (newX >= 0 && newX < width && newY >= 0 && newY < height && !visited[newY][newX]) {
          visited[newY][newX] = true;
          queue.push({ x: newX, y: newY, distance: current.distance + 1 });
        }
      }
    }
  };
  
  // Connect start position to maze
  connectToNearestPath(startX, startY);
  
  // Ensure boss position is accessible
  tiles[bossY][bossX].type = 'boss';
  tiles[bossY][bossX].isAccessible = true;
  
  // Connect boss to maze
  connectToNearestPath(bossX, bossY);
  
  // Add some extra openings to make the maze less restrictive (20% more paths)
  const extraOpenings = Math.floor((width * height) * 0.1);
  for (let i = 0; i < extraOpenings; i++) {
    const randomX = Math.floor(Math.random() * width);
    const randomY = Math.floor(Math.random() * height);
    
    if (tiles[randomY][randomX].type === 'blocked') {
      tiles[randomY][randomX].type = 'empty';
      tiles[randomY][randomX].isAccessible = true;
    }
  }
  
  const bossDifficulty = getNextDifficulty(difficulty);
  const bossSettings = getSettings(bossDifficulty);
  const bossOperations = bossSettings.operations;
  const bossOperation = bossOperations[Math.floor(Math.random() * bossOperations.length)];
  const bossOperands = getOperands(bossSettings);
  const bossReward = bossSettings.reward * 3;

  tiles[bossY][bossX].challenge = {
    id: `boss-${Date.now()}`,
    operation: bossOperation as any,
    operands: bossOperands,
    correctAnswer: computeAnswer(bossOperation, bossOperands),
    difficulty: bossDifficulty as any,
    reward: bossReward,
  };
  
  // Add challenges to accessible tiles (excluding start and boss)
  let challengesPlaced = 0;
  const maxChallenges = Math.floor(width * height * settings.density);
  
  for (let y = 0; y < height && challengesPlaced < maxChallenges; y++) {
    for (let x = 0; x < width && challengesPlaced < maxChallenges; x++) {
      // Only place challenges on accessible empty tiles, not start or boss
      if (tiles[y][x].isAccessible && 
          tiles[y][x].type === 'empty' && 
          !(x === startX && y === startY) &&
          !(x === bossX && y === bossY) &&
          Math.random() < 0.25) { // 25% chance for accessible tiles
        
        const operationPool = settings.operations;
        const chosenOperation = operationPool[Math.floor(Math.random() * operationPool.length)];
        const operands = getOperands(settings);

        tiles[y][x].type = 'challenge';
        tiles[y][x].challenge = {
          id: `challenge-${Date.now()}-${challengesPlaced}`,
          operation: chosenOperation as any,
          operands,
          correctAnswer: computeAnswer(chosenOperation, operands),
          difficulty: difficulty as any,
          reward: settings.reward,
        };
        challengesPlaced++;
      }
    }
  }
  
  return {
    id,
    width,
    height,
    tiles,
    difficulty: difficulty as any,
    bossPosition: { x: bossX, y: bossY },
    startPosition: { x: startX, y: startY },
    isCompleted: false,
  };
};

const getNextDifficulty = (current: string) => {
  const levels = ['infant', 'toddler', 'beginner', 'easy', 'medium', 'hard', 'expert'];
  const index = levels.indexOf(current);
  return levels[Math.min(index + 1, levels.length - 1)];
};

const getRecommendedMapSize = (_difficulty: string) => {
  // All maps are now 24x24 for maze-like experience
  return { width: 12, height: 12 };
};

interface GameState {
  session: GameSession | null;
  isLoading: boolean;
  error: string | null;
}

type GameAction =
  | { type: 'START_GAME'; payload: { playerName: string } }
  | { type: 'MOVE_PLAYER'; payload: { direction: Direction } }
  | { type: 'COMPLETE_CHALLENGE'; payload: { challengeId: string; reward: number } }
  | { type: 'COMPLETE_MAP' }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'LOAD_SAVED_GAME'; payload: GameSession };

const initialState: GameState = {
  session: null,
  isLoading: false,
  error: null,
};

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START_GAME': {
  const startingDifficulty = 'infant';
  const mapSize = getRecommendedMapSize(startingDifficulty);
  const currentMap = generateTileMap('map-1', mapSize.width, mapSize.height, startingDifficulty);
      
      const player: PlayerState = {
        id: `player-${Date.now()}`,
        name: action.payload.playerName,
        currentPosition: currentMap.startPosition, // Use the map's start position
        currentMapId: 'map-1',
        currency: 0,
        completedMaps: [],
        totalChallengesCompleted: 0,
        currentStreak: 0,
        bestStreak: 0,
        createdAt: new Date(),
        lastPlayedAt: new Date(),
      };
      
      const session: GameSession = {
        player,
        currentMap,
        gameStartedAt: new Date(),
        isPaused: false,
      };

      return {
        ...state,
        session,
        error: null,
      };
    }

    case 'MOVE_PLAYER': {
      if (!state.session) return state;

      const { direction } = action.payload;
      const currentPos = state.session.player.currentPosition;
      let newPosition: Position;

      switch (direction) {
        case 'up':
          newPosition = { x: currentPos.x, y: Math.max(0, currentPos.y - 1) };
          break;
        case 'down':
          newPosition = { x: currentPos.x, y: Math.min(state.session.currentMap.height - 1, currentPos.y + 1) };
          break;
        case 'left':
          newPosition = { x: Math.max(0, currentPos.x - 1), y: currentPos.y };
          break;
        case 'right':
          newPosition = { x: Math.min(state.session.currentMap.width - 1, currentPos.x + 1), y: currentPos.y };
          break;
      }

      // Check if the new position is accessible (not blocked)
      const targetTile = state.session.currentMap.tiles[newPosition.y][newPosition.x];
      if (!targetTile.isAccessible) {
        // Can't move to blocked tiles, return current state
        return state;
      }

      return {
        ...state,
        session: {
          ...state.session,
          player: {
            ...state.session.player,
            currentPosition: newPosition,
            lastPlayedAt: new Date(),
          },
        },
      };
    }

    case 'COMPLETE_CHALLENGE': {
      if (!state.session) return state;

      const { challengeId, reward } = action.payload;
      const updatedMap = { ...state.session.currentMap };
      
      // Mark the challenge as completed
      for (let y = 0; y < updatedMap.height; y++) {
        for (let x = 0; x < updatedMap.width; x++) {
          const tile = updatedMap.tiles[y][x];
          if (tile.challenge?.id === challengeId) {
            updatedMap.tiles[y][x] = { ...tile, isCompleted: true };
            break;
          }
        }
      }

      return {
        ...state,
        session: {
          ...state.session,
          currentMap: updatedMap,
          player: {
            ...state.session.player,
            currency: state.session.player.currency + reward,
            totalChallengesCompleted: state.session.player.totalChallengesCompleted + 1,
            currentStreak: state.session.player.currentStreak + 1,
            bestStreak: Math.max(state.session.player.bestStreak, state.session.player.currentStreak + 1),
            lastPlayedAt: new Date(),
          },
        },
      };
    }

    case 'COMPLETE_MAP': {
      if (!state.session) return state;

      const nextDifficulty = getNextDifficulty(state.session.currentMap.difficulty);
      const mapSize = getRecommendedMapSize(nextDifficulty);
      const nextMapId = `map-${state.session.player.completedMaps.length + 2}`;
      const newMap = generateTileMap(nextMapId, mapSize.width, mapSize.height, nextDifficulty);

      return {
        ...state,
        session: {
          ...state.session,
          currentMap: newMap,
          player: {
            ...state.session.player,
            currentMapId: nextMapId,
            currentPosition: newMap.startPosition,
            completedMaps: [...state.session.player.completedMaps, state.session.currentMap.id],
            lastPlayedAt: new Date(),
          },
        },
      };
    }

    case 'SET_ERROR':
      return { ...state, error: action.payload };

    case 'CLEAR_ERROR':
      return { ...state, error: null };

    case 'LOAD_SAVED_GAME':
      return { ...state, session: action.payload, error: null };

    default:
      return state;
  }
}

const GameContext = createContext<{
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
} | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  // Auto-save to localStorage
  useEffect(() => {
    if (state.session) {
      localStorage.setItem('math-cash-save', JSON.stringify(state.session));
    }
  }, [state.session]);

  // Load saved game on mount
  useEffect(() => {
    const savedGame = localStorage.getItem('math-cash-save');
    if (savedGame) {
      try {
        const session = JSON.parse(savedGame);
        dispatch({ type: 'LOAD_SAVED_GAME', payload: session });
      } catch (error) {
        console.error('Failed to load saved game:', error);
      }
    }
  }, []);

  return (
    <GameContext.Provider value={{ state, dispatch }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}