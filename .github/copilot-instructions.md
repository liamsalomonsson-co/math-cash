# Copilot Instructions – Math Cash: Tile-Based Adventure Game

## Project Overview
Math Cash is a kid-friendly tile-based adventure game combining navigation with math challenges. Players move through procedurally generated maps, solving math problems to earn currency and progress to harder levels.

**Architecture**: Monorepo with shared game logic, React frontend, and planned Express backend.

## Essential Project Knowledge

### Core Game Mechanics (packages/shared/)
- **Tile System**: 2D grid navigation with challenge, boss, and empty tiles
- **Procedural Generation**: Maps auto-generated with increasing difficulty (4x4 → 8x8)
- **Math Challenges**: Addition, subtraction, multiplication, division with difficulty scaling
- **Boss Mechanics**: Harder challenges placed at maximum distance from start position
- **Currency/Progression**: Linear progression through difficulty levels (beginner → expert)

### State Management Pattern (frontend/src/context/)
- **GameContext**: Central state using useReducer with actions for movement, challenge completion
- **Local Persistence**: Auto-save to localStorage with session restoration
- **Action-Based Updates**: Immutable state updates via dispatch pattern

### Critical Code Patterns

#### Type Safety with Runtime Validation
```typescript
// All game types use Zod for runtime validation
export const TileMap = z.object({
  id: z.string(),
  tiles: z.array(z.array(Tile)),
  difficulty: DifficultyLevel,
  // ...
});
```

#### Map Generation Algorithm (shared/src/game-logic.ts)
- Boss positioning uses Manhattan distance calculation
- Challenge density based on difficulty multipliers (0.2 → 0.6)
- Reward scaling tied to difficulty levels

#### Game State Transitions
- Movement: Boundary-checked position updates
- Challenge completion: Tile marking + currency update + streak tracking
- Map completion: Generate next map with increased difficulty

## Development Workflow

### Essential Commands
```bash
npm run dev          # Start all development servers
npm run typecheck    # Type checking across monorepo
npm run lint         # ESLint with TypeScript rules
```

### File Organization Rules
- **Shared logic**: packages/shared/src/ (types, utils, game-logic)
- **React components**: apps/frontend/src/components/
- **Game state**: apps/frontend/src/context/GameContext.tsx
- **Pages**: apps/frontend/src/pages/ (HomePage, GamePage)

### Code Conventions
- **Strict TypeScript**: No `any`, prefer `unknown`, use Record<> for object types
- **Component Structure**: Functional components with hooks only
- **Import Order**: Built-ins → external → internal → relative
- **Error Handling**: Centralized error state in GameContext

## Game Design Constraints
- **Accessibility**: Large touch targets (min 48px), high contrast, keyboard navigation
- **Performance**: Efficient tile rendering, minimal re-renders
- **Kid-Friendly**: Positive feedback, emoji visual cues, simple interactions
- **Math Progression**: Difficulty curves designed for educational value

## Integration Points
- **Local Storage**: Game session persistence with JSON serialization
- **Future Backend**: REST API ready for /api/v1/ endpoints
- **Shared Types**: Cross-package type imports using workspace references

## Common Patterns to Follow
- Use `formatChallenge()` for consistent math problem display
- Always validate positions with `isValidPosition()` before movement
- Generate challenges with `generateTileMap()` for consistent behavior
- Handle errors through GameContext dispatch, never silent failures

## Testing Strategy
- **Shared Logic**: Unit tests for math generation and map algorithms
- **React Components**: React Testing Library for user interactions
- **Game State**: Test all reducer actions and state transitions

## Collaboration Style
- Before writing code, suggest **2–3 implementation options** with trade-offs and recommendations.
- Keep files **small and focused**. Split large logic into multiple files.
- Prefer **short, descriptive function and variable names**.
- If requirements are ambiguous, propose a **reasonable default**.

## Project Structure
- Separate frontend and backend into clear apps.
- Create **shared packages** for types, utilities, and UI components.
- Keep files under ~200 lines where possible.
- Avoid “misc” folders — organize by feature or responsibility.

## TypeScript Guidelines
- Use **strict mode**. Avoid `any`, prefer `unknown` if unavoidable.
- Define **shared domain types** and reuse across frontend and backend.
- Use **literal unions, enums, and discriminated unions** instead of magic strings.
- Apply **runtime validation** (e.g., zod) for all inputs and API responses.

## React Guidelines
- Use **functional components** with hooks (no class components).
- Start with **local state and context**. Add external state management only if necessary.
- Organize code into:
  - `components/` for presentational parts
  - `features/` for feature logic
  - `pages/` for routes
  - `hooks/` for reusable hooks
- Ensure **accessibility for kids** (large buttons, high contrast, ARIA labels).
- Keep performance in mind (lazy loading, memoization only when profiling shows need).

## Express Guidelines
- Structure backend into:
  - `routes/` for endpoints
  - `controllers/` for request/response mapping
  - `services/` for business logic
  - `repos/` for persistence
- Validate all inputs (params, queries, bodies).
- Centralize error handling and return consistent error shapes.
- Add basic security defaults (CORS allowlist, helmet, rate limiting).
- Use structured logging with request IDs.

## Testing and Quality
- Use **Vitest** for unit tests.
- Use **React Testing Library** for components.
- Use **Supertest** for backend endpoints.
- Focus on meaningful tests, not coverage numbers.
- Apply **ESLint + Prettier** consistently. No code should ship with lint or type errors.
- Use **import order rules** and prefer named exports.

## Game Design Constraints
- Challenges should be **short and fun** (solvable in seconds).
- Feedback should be **positive and encouraging**.
- Use minimal text and clear visuals.
- Store progress locally first, then sync with backend when possible.

## API Design
- Use **REST with versioning** (`/api/v1/...`).
- Return a consistent response envelope `{ data, error }`.
- Provide an **OpenAPI spec** and generate types for clients.

## Documentation
- Each feature should have a small **README** explaining purpose and structure.
- Document decisions with lightweight **ADRs** in `/docs/adr/`.
- Add clear comments for exported functions and components.

## Git and CI
- Use **Conventional Commits** (`feat:`, `fix:`, `chore:`).
- Keep pull requests **small and focused**.
- Require `typecheck`, `lint`, and `test` to pass in CI before merging.
- Include screenshots in PRs for UI changes.

## Dependencies
- Frontend: React, React Router, react-hook-form, zod, axios.
- Backend: Express, zod, helmet, cors, rate limiting, structured logging.
- Tooling: Vite, ESLint, Prettier, Vitest.

## What to Avoid
- Over-engineering state management too early.
- Functions longer than ~30 lines.
- Global mutable state in shared packages.
- Silent failures or swallowed errors.

## Default Copilot Prompts
- “List 2–3 implementation options with trade-offs.”
- “Show planned file and folder changes.”
- “Generate TypeScript types before implementation.”
- “Add at least one happy path and one failure path test.”

## Acceptance Criteria Checklist
- Inputs validated with runtime schemas.
- Types defined in shared packages.
- Tests cover core success and failure flows.
- UI is keyboard accessible and screen-reader friendly.
- No ESLint or type errors, Prettier clean.
- Documentation updated for any structural change.

## Telemetry and Privacy
- Keep telemetry **opt-in and anonymous**.
- Never log personally identifiable information (PII).
