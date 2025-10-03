import Phaser from 'phaser';
import type { Mob, Position, TileMap } from '../../../../lib';

export class MobController {
  private mobSprites: Map<string, Phaser.GameObjects.Sprite> = new Map();
  private moveTimer?: Phaser.Time.TimerEvent;
  private tileSize = 0;
  private offsetX = 0;
  private offsetY = 0;
  private onMobMoved?: () => void;

  constructor(private readonly scene: Phaser.Scene) {}

  destroy() {
    this.moveTimer?.destroy();
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
    this.moveTimer?.destroy();
    this.onMobMoved = onMobMoved;

    // Move mobs every 1-2 seconds randomly
    this.moveTimer = this.scene.time.addEvent({
      delay: Phaser.Math.Between(1000, 2000),
      callback: () => this.moveMobs(map),
      loop: true,
    });
  }

  /**
   * Stop the automatic movement timer
   */
  stopMovement() {
    this.moveTimer?.destroy();
    this.moveTimer = undefined;
  }

  /**
   * Update mob sprite visibility based on completion status
   */
  updateMobVisibility(map: TileMap) {
    map.mobs.forEach((mob) => {
      const sprite = this.mobSprites.get(mob.id);
      if (mob.isCompleted && sprite) {
        sprite.destroy();
        this.mobSprites.delete(mob.id);
      }
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

  private moveMobs(map: TileMap) {
    map.mobs.forEach((mob) => {
      if (mob.isCompleted) {
        return;
      }

      const newPosition = this.getRandomAdjacentPosition(map, mob.position);
      if (newPosition) {
        mob.position = newPosition;
        this.updateMobSpritePosition(mob);
      }
    });

    // Notify that mobs have moved (for collision detection)
    if (this.onMobMoved) {
      this.onMobMoved();
    }

    // Randomize next move interval
    if (this.moveTimer) {
      this.moveTimer.reset({
        delay: Phaser.Math.Between(1000, 2000),
        callback: () => this.moveMobs(map),
        loop: true,
      });
    }
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
      if (tile && tile.isAccessible) {
        return { x: newX, y: newY };
      }
    }

    // No valid moves, stay in place
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
