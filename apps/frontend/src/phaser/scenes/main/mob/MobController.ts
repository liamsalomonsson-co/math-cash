import Phaser from 'phaser';
import type { Mob, Position, TileMap } from '../../../../lib';

export class MobController {
  private mobSprites: Map<string, Phaser.GameObjects.Sprite> = new Map();
  private mobTimers: Map<string, Phaser.Time.TimerEvent> = new Map();
  private mobDelayedCalls: Map<string, Phaser.Time.TimerEvent> = new Map();
  private tileSize = 0;
  private offsetX = 0;
  private offsetY = 0;
  private onMobMoved?: () => void;

  constructor(private readonly scene: Phaser.Scene) {}

  destroy() {
    this.mobTimers.forEach((timer) => timer.destroy());
    this.mobTimers.clear();
    this.mobDelayedCalls.forEach((call) => call.destroy());
    this.mobDelayedCalls.clear();
    this.mobSprites.forEach((sprite) => sprite.destroy());
    this.mobSprites.clear();
  }

  /**
   * Initialize or update mob rendering on the board
   */
  render(map: TileMap, tileSize: number, offsetX: number, offsetY: number) {
    this.tileSize = tileSize;
    this.offsetX = offsetX;
    this.offsetY = offsetY;

    // Clear existing sprites
    this.mobSprites.forEach((sprite) => sprite.destroy());
    this.mobSprites.clear();

    // Create sprites for all mobs
    map.mobs.forEach((mob) => {
      if (!mob.isCompleted) {
        this.createMobSprite(mob);
      }
    });
  }

  /**
   * Start the automatic movement timer
   */
  startMovement(map: TileMap, onMobMoved?: () => void) {
    this.stopMovement();
    this.onMobMoved = onMobMoved;

    // Create individual timer for each mob with random delay
    map.mobs.forEach((mob) => {
      if (!mob.isCompleted) {
        this.createMobTimer(mob, map);
      }
    });
  }

  /**
   * Stop the automatic movement timer
   */
  stopMovement() {
    this.mobTimers.forEach((timer) => timer.destroy());
    this.mobTimers.clear();
    this.mobDelayedCalls.forEach((call) => call.destroy());
    this.mobDelayedCalls.clear();
  }

  /**
   * Pause all mob movement (during challenges, overlays, etc.)
   */
  pauseMovement() {
    this.mobTimers.forEach((timer) => timer.paused = true);
    this.mobDelayedCalls.forEach((call) => call.paused = true);
  }

  /**
   * Resume all mob movement
   */
  resumeMovement() {
    this.mobTimers.forEach((timer) => timer.paused = false);
    this.mobDelayedCalls.forEach((call) => call.paused = false);
  }

  /**
   * Set visibility of all mob sprites
   */
  setVisible(visible: boolean) {
    this.mobSprites.forEach((sprite) => sprite.setVisible(visible));
  }

  /**
   * Update mob sprite visibility based on completion status
   */
  updateMobVisibility(map: TileMap) {
    map.mobs.forEach((mob) => {
      const sprite = this.mobSprites.get(mob.id);
      if (mob.isCompleted && sprite) {
        // Calculate explosion position from mob's grid position (not sprite position)
        // to ensure it's always centered on the correct tile
        const explosionX = this.offsetX + mob.position.x * this.tileSize + this.tileSize / 2;
        const explosionY = this.offsetY + mob.position.y * this.tileSize + this.tileSize / 2;
        
        // Stop any ongoing tweens on the sprite to prevent position conflicts
        this.scene.tweens.killTweensOf(sprite);
        
        // Play explosion animation before destroying
        this.playExplosionAnimation(explosionX, explosionY);
        sprite.destroy();
        this.mobSprites.delete(mob.id);
        
        // Stop and remove timer for this mob
        const timer = this.mobTimers.get(mob.id);
        if (timer) {
          timer.destroy();
          this.mobTimers.delete(mob.id);
        }
      }
    });
  }

  /**
   * Play an explosion animation at the specified position
   */
  private playExplosionAnimation(x: number, y: number) {
    // Create multiple particles expanding outward
    const colors = [0xffd166, 0xff6b6b, 0xff8c42, 0xffa726, 0xffb74d];
    const particleCount = 12;

    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const distance = this.tileSize * 0.8;
      
      // Create particle (small circle)
      const particle = this.scene.add.circle(x, y, 4, colors[i % colors.length]);
      particle.setDepth(10);
      
      // Calculate end position
      const endX = x + Math.cos(angle) * distance;
      const endY = y + Math.sin(angle) * distance;
      
      // Animate particle outward and fade
      this.scene.tweens.add({
        targets: particle,
        x: endX,
        y: endY,
        alpha: 0,
        scale: 0.2,
        duration: 1000,
        ease: 'Power2',
        onComplete: () => particle.destroy(),
      });
    }

    // Central flash effect
    const flash = this.scene.add.circle(x, y, this.tileSize * 0.4, 0xffffff, 0.9);
    flash.setDepth(9);
    
    this.scene.tweens.add({
      targets: flash,
      scale: 1.8,
      alpha: 0,
      duration: 800,
      ease: 'Power2',
      onComplete: () => flash.destroy(),
    });

    // Secondary explosion wave
    const wave = this.scene.add.circle(x, y, this.tileSize * 0.3, 0xff6b6b, 0);
    wave.setStrokeStyle(3, 0xff6b6b, 0.8);
    wave.setDepth(8);
    
    this.scene.tweens.add({
      targets: wave,
      scale: 2.5,
      alpha: { from: 0.8, to: 0 },
      duration: 1200,
      ease: 'Cubic.Out',
      onComplete: () => wave.destroy(),
    });
  }

  /**
   * Get mob at a specific position, if any
   */
  getMobAtPosition(map: TileMap, position: Position): Mob | null {
    return map.mobs.find(
      (mob) => !mob.isCompleted && mob.position.x === position.x && mob.position.y === position.y
    ) || null;
  }

  private createMobTimer(mob: Mob, map: TileMap) {
    // Random initial delay so mobs don't all move at once
    const initialDelay = Phaser.Math.Between(0, 1000);
    const moveDelay = Phaser.Math.Between(1000, 2000);

    // Store the delayed call so it can be paused/resumed
    const delayedCall = this.scene.time.delayedCall(initialDelay, () => {
      // Remove from delayed calls map once it executes
      this.mobDelayedCalls.delete(mob.id);
      
      // Create the repeating timer after initial delay
      const repeatTimer = this.scene.time.addEvent({
        delay: moveDelay,
        callback: () => this.moveSingleMob(mob, map),
        loop: true,
      });
      this.mobTimers.set(mob.id, repeatTimer);
    });
    
    this.mobDelayedCalls.set(mob.id, delayedCall);
  }

  private moveSingleMob(mob: Mob, map: TileMap) {
    if (mob.isCompleted) {
      // Stop timer for completed mobs
      const timer = this.mobTimers.get(mob.id);
      if (timer) {
        timer.destroy();
        this.mobTimers.delete(mob.id);
      }
      return;
    }

    const newPosition = this.getRandomAdjacentPosition(map, mob.position);
    if (newPosition) {
      mob.position = newPosition;
      this.updateMobSpritePosition(mob);

      // Notify that a mob has moved (for collision detection)
      if (this.onMobMoved) {
        this.onMobMoved();
      }
    }

    // Randomize next move interval for this specific mob
    const timer = this.mobTimers.get(mob.id);
    if (timer) {
      timer.reset({
        delay: Phaser.Math.Between(1000, 2000),
        callback: () => this.moveSingleMob(mob, map),
        loop: true,
      });
    }
  }

  private createMobSprite(mob: Mob) {
    const x = this.offsetX + mob.position.x * this.tileSize + this.tileSize / 2;
    const y = this.offsetY + mob.position.y * this.tileSize + this.tileSize / 2;

    const sprite = this.scene.add.sprite(x, y, 'mobs', mob.spriteFrame);
    sprite.setDepth(5);
    
    // Scale to 75% of tile size
    const targetSize = this.tileSize * 0.75;
    sprite.setDisplaySize(targetSize, targetSize);

    this.mobSprites.set(mob.id, sprite);
  }

  private getRandomAdjacentPosition(map: TileMap, current: Position): Position | null {
    const directions = [
      { x: 0, y: -1 }, // up
      { x: 0, y: 1 },  // down
      { x: -1, y: 0 }, // left
      { x: 1, y: 0 },  // right
    ];

    // Shuffle directions for random movement
    Phaser.Utils.Array.Shuffle(directions);

    for (const dir of directions) {
      const newX = current.x + dir.x;
      const newY = current.y + dir.y;

      // Check bounds
      if (newX < 0 || newX >= map.width || newY < 0 || newY >= map.height) {
        continue;
      }

      // Check if tile is accessible
      const tile = map.tiles[newY][newX];
      if (!tile || !tile.isAccessible) {
        continue;
      }

      // Prevent mobs from walking onto boss tile
      if (tile.type === 'boss') {
        continue;
      }

      // Check if another mob is already on this tile
      const mobOnTile = map.mobs.find(
        (mob) => !mob.isCompleted && 
                 mob.position.x === newX && 
                 mob.position.y === newY &&
                 !(mob.position.x === current.x && mob.position.y === current.y) // Exclude current mob
      );

      if (mobOnTile) {
        continue; // Another mob is blocking this tile, try next direction
      }

      // Tile is valid and not occupied
      return { x: newX, y: newY };
    }

    // No valid moves available, stay in place
    return null;
  }

  private updateMobSpritePosition(mob: Mob) {
    const sprite = this.mobSprites.get(mob.id);
    if (!sprite) {
      return;
    }

    const x = this.offsetX + mob.position.x * this.tileSize + this.tileSize / 2;
    const y = this.offsetY + mob.position.y * this.tileSize + this.tileSize / 2;

    // Smooth movement animation
    this.scene.tweens.add({
      targets: sprite,
      x,
      y,
      duration: 300,
      ease: 'Power2',
    });
  }
}
