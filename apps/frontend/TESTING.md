# Testing & Development Modes

## Bubble Shooter Minigame Test Mode

To quickly iterate on the bubble shooter minigame without playing through the full game:

### Option 1: URL Parameter (Recommended)
Add `?test=bubble` to your URL:
```
http://localhost:3002/?test=bubble
```

### Option 2: Browser Console
Run this in your browser console:
```javascript
localStorage.setItem('mathcash_test_mode', 'bubble');
location.reload();
```

To exit test mode:
```javascript
localStorage.removeItem('mathcash_test_mode');
location.reload();
```

### Features in Test Mode

- **Instant testing**: Minigame loads immediately
- **Quick restart**: Press `SPACE` or `ESC` to restart
- **Stats tracking**: See attempts, successes, and failures
- **Challenge display**: Shows the math problem and correct answer
- **Isolated environment**: No game state, no navigation, just the minigame

### Controls

- **Pull & Release**: Drag to aim and power, release to shoot
- **SPACE/ESC**: Restart the minigame
- **Mouse/Touch**: Full support for both input types

---

## Adding More Test Modes

To add a new test scene:

1. Create a new scene file in `src/phaser/scenes/`
2. Import it in `createGame.ts`
3. Add a condition in `getTestMode()` to check for your test parameter
4. Use `?test=yourmode` in the URL

Example:
```typescript
if (testMode === 'yourmode') {
  initialScene = YourTestScene;
  sceneName = 'YourTestScene';
}
```
