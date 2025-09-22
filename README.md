# Math Cash - Tile-Based Math Adventure Game

A fun and educational browser-based tile game where kids navigate maps, solve math challenges, and collect currency. Built with React, TypeScript, and Express.

## 🎮 Game Features

- **Tile-Based Navigation**: Navigate 2D grid maps using arrow keys (like classic Zelda games)
- **Math Challenges**: Solve addition, subtraction, multiplication, and division problems
- **Progressive Difficulty**: Each completed map unlocks harder challenges with better rewards
- **Boss Battles**: Defeat challenging bosses to advance to the next level
- **Currency System**: Earn in-game currency for completing challenges
- **Local Progress**: Game progress saved locally with optional backend sync

## 🏗️ Project Structure

```
math-cash/
├── packages/
│   └── shared/              # Shared TypeScript types and game logic
│       ├── src/
│       │   ├── types.ts     # Game types (Player, TileMap, Challenge, etc.)
│       │   ├── utils.ts     # Math utilities and helper functions
│       │   └── game-logic.ts # Map generation and game rules
│       └── package.json
├── apps/
│   ├── frontend/            # React frontend application
│   │   ├── src/
│   │   │   ├── components/  # Reusable UI components
│   │   │   ├── pages/       # Route pages (Home, Game)
│   │   │   ├── context/     # React context for game state
│   │   │   └── hooks/       # Custom React hooks
│   │   └── package.json
│   └── backend/             # Express backend API (future)
├── .github/
│   └── copilot-instructions.md
└── package.json             # Workspace root
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm 9+

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd math-cash
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development servers**
   ```bash
   npm run dev
   ```

   This will start:
   - Frontend: http://localhost:3000
   - Backend: http://localhost:3001 (when implemented)

### Development Commands

```bash
# Install all dependencies
npm install

# Start all development servers
npm run dev

# Build all packages
npm run build

# Run all tests
npm test

# Lint all code
npm run lint

# Type check all code
npm run typecheck

# Format all code
npm run format
```

## 🎯 How to Play

1. **Start**: Enter your name and begin your adventure
2. **Navigate**: Use arrow keys to move around the tile map
3. **Challenges**: Step on challenge tiles (📚) to solve math problems
4. **Boss**: Find and defeat the boss tile (👑) to complete the map
5. **Progression**: Each completed map generates a new, harder level
6. **Currency**: Earn coins for each correct answer to track your progress

## 🛠️ Development Guidelines

### Code Organization

- **Shared Package**: Contains all game logic, types, and utilities
- **Frontend**: React components and game UI
- **Backend**: Express API for progress sync (future implementation)

### Key Design Principles

- **Type Safety**: Strict TypeScript with runtime validation using Zod
- **Accessibility**: Large buttons, high contrast, keyboard navigation
- **Kid-Friendly**: Simple visuals, positive feedback, appropriate difficulty curves
- **Performance**: Efficient rendering and state management

### Adding New Features

1. **Define Types**: Add new types to `packages/shared/src/types.ts`
2. **Implement Logic**: Add game logic to `packages/shared/src/game-logic.ts`
3. **Create Components**: Build UI components in `apps/frontend/src/components/`
4. **Add Tests**: Write tests for both logic and components

## 🧮 Math Challenge System

### Difficulty Progression
- **Beginner**: 1-5 (addition/subtraction)
- **Easy**: 1-10 (all operations)
- **Medium**: 5-20 (mixed challenges)
- **Hard**: 10-50 (complex problems)
- **Expert**: 20-100 (advanced math)

### Map Generation
- Maps are procedurally generated based on difficulty
- Challenge density increases with difficulty
- Boss placement optimized for maximum distance from start
- Rewards scale with difficulty level

## 📁 File Structure Details

### Shared Package (`packages/shared/`)
- `types.ts`: Core game types with Zod validation
- `utils.ts`: Math utilities and helper functions
- `game-logic.ts`: Map generation and game rules
- `index.ts`: Package exports

### Frontend (`apps/frontend/`)
- `pages/HomePage.tsx`: Landing page with game start/continue
- `pages/GamePage.tsx`: Main game interface with tile map
- `context/GameContext.tsx`: Global game state management
- `components/`: Reusable UI components (TileMap, Challenge Modal, etc.)

## 🔧 Configuration

### ESLint Rules
- Strict TypeScript checking
- React hooks validation
- Import order enforcement
- No unused variables

### Prettier
- 2-space indentation
- Single quotes
- Trailing commas
- 100-character line width

## 📝 Next Steps

- [ ] Complete tile map rendering system
- [ ] Implement challenge modal UI
- [ ] Add keyboard navigation
- [ ] Create boss battle mechanics
- [ ] Build backend API for progress sync
- [ ] Add sound effects and animations
- [ ] Implement leaderboard system

## 🤝 Contributing

1. Follow existing code patterns and conventions
2. Ensure all tests pass before submitting PRs
3. Add tests for new features
4. Update documentation as needed
5. Use conventional commit messages

## 📄 License

[Add your license here]