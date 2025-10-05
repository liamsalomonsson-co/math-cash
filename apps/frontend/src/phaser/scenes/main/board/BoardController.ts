import Phaser from 'phaser';
import type { TileMap, Tile, Position } from '../../../../lib';
import { PLAYER_COLOR, TILE_GAP } from '../constants';

export class BoardController {
  private readonly tileContainer: Phaser.GameObjects.Container;
  private playerMarker?: Phaser.GameObjects.Sprite;
  private tileSize = 0;
  private gridOrigin = { x: 0, y: 0 };
  private tileObjects = new Map<string, Phaser.GameObjects.Rectangle>();

  constructor(private readonly scene: Phaser.Scene) {
    this.tileContainer = scene.add.container(0, 0);
    this.tileContainer.setVisible(false);
  }

  destroy() {
    this.tileContainer.destroy(true);
    this.playerMarker?.destroy();
    this.tileObjects.clear();
  }

  setVisible(visible: boolean) {
    this.tileContainer.setVisible(visible);
    this.playerMarker?.setVisible(visible);
  }

  rebuild(map: TileMap, currentPosition: Position): boolean {
    this.tileContainer.removeAll(true);
    this.tileObjects.clear();

    this.tileSize = this.calculateTileSize(map);
    if (this.tileSize <= 0) {
      this.tileContainer.setVisible(false);
      this.playerMarker?.setVisible(false);
      return false;
    }

    this.renderTiles(map);
    this.renderPlayerMarker();
    this.refreshTiles(map, currentPosition);
    this.updatePlayerMarker(currentPosition);
    this.tileContainer.setVisible(true);
    return true;
  }

  refreshTiles(map: TileMap, currentPosition: Position) {
    for (const [key, rect] of this.tileObjects.entries()) {
      const [x, y] = key.split(',').map(Number);
      const tile = map.tiles[y][x];
      const isPlayerTile = x === currentPosition.x && y === currentPosition.y;
      const fillColor = this.getTileBaseColor(tile);
      rect.setFillStyle(isPlayerTile ? PLAYER_COLOR : fillColor, isPlayerTile ? 0.35 : 1);
    }
  }

  updatePlayerMarker(position: Position) {
    if (!this.playerMarker) {
      return;
    }

    const tileRect = this.tileObjects.get(`${position.x},${position.y}`);
    if (!tileRect) {
      return;
    }

    this.playerMarker.setPosition(tileRect.x, tileRect.y);
  }

  /**
   * Animate player swooshing back to start position with penalty text
   */
  animatePlayerResetToStart(fromPosition: Position, toPosition: Position, penalty: number, onComplete?: () => void) {
    if (!this.playerMarker) {
      onComplete?.();
      return;
    }

    const fromRect = this.tileObjects.get(`${fromPosition.x},${fromPosition.y}`);
    const toRect = this.tileObjects.get(`${toPosition.x},${toPosition.y}`);
    
    if (!fromRect || !toRect) {
      onComplete?.();
      return;
    }

    // Show penalty text at current position
    const penaltyText = this.scene.add.text(fromRect.x, fromRect.y, `-${penalty}`, {
      fontFamily: 'Poppins, sans-serif',
      fontSize: '28px',
      color: '#ff6b6b',
      fontStyle: 'bold',
      stroke: '#4a0e0e',
      strokeThickness: 4,
    });
    penaltyText.setOrigin(0.5, 0.5);
    penaltyText.setDepth(11);
    
    // Animate penalty text upward and fade
    this.scene.tweens.add({
      targets: penaltyText,
      y: fromRect.y - this.tileSize * 1.5,
      alpha: 0,
      scale: { from: 0.8, to: 1.2 },
      duration: 2000,
      ease: 'Power2',
      onComplete: () => penaltyText.destroy(),
    });

    // Swoosh player back to start with arc motion
    const duration = 800;
    const spriteSize = this.tileSize * 0.8; // Same as renderPlayerMarker

    // Create a path for the arc
    this.scene.tweens.add({
      targets: this.playerMarker,
      x: { from: fromRect.x, to: toRect.x },
      y: { from: fromRect.y, to: toRect.y },
      duration: duration,
      ease: 'Cubic.InOut',
      onUpdate: (tween) => {
        // Calculate arc position
        const progress = tween.progress;
        const x = fromRect.x + (toRect.x - fromRect.x) * progress;
        const y = fromRect.y + (toRect.y - fromRect.y) * progress;
        
        // Add vertical offset for arc (parabola)
        const arcHeight = this.tileSize * 2;
        const yOffset = -arcHeight * Math.sin(progress * Math.PI);
        
        this.playerMarker?.setPosition(x, y + yOffset);
      },
      onComplete: () => {
        // Ensure final position is exact
        this.playerMarker?.setPosition(toRect.x, toRect.y);
        // Reset angle to 0
        this.playerMarker?.setAngle(0);
        onComplete?.();
      }
    });

    // Add size effect during swoosh using displayWidth/displayHeight instead of scale
    this.scene.tweens.add({
      targets: this.playerMarker,
      displayWidth: { from: spriteSize, to: spriteSize * 0.6 },
      displayHeight: { from: spriteSize, to: spriteSize * 0.6 },
      duration: duration / 2,
      ease: 'Sine.InOut',
      yoyo: true,
    });

    // Add rotation for swoosh effect
    this.scene.tweens.add({
      targets: this.playerMarker,
      angle: { from: 0, to: 360 },
      duration: duration,
      ease: 'Power2',
    });
  }

  getTileRect(position: Position): Phaser.GameObjects.Rectangle | undefined {
    return this.tileObjects.get(`${position.x},${position.y}`);
  }

  /**
   * Get board dimensions for other controllers to use
   */
  getBoardDimensions() {
    return {
      tileSize: this.tileSize,
      offsetX: this.gridOrigin.x,
      offsetY: this.gridOrigin.y,
    };
  }

  private calculateTileSize(map: TileMap): number {
    const mapWidth = map.width;
    const mapHeight = map.height;
    const maxTiles = Math.max(mapWidth, mapHeight);

    const scaleWidth = this.scene.scale.width || Number(this.scene.game.config.width) || 0;
    const scaleHeight = this.scene.scale.height || Number(this.scene.game.config.height) || 0;

    const canvas = this.scene.game.canvas;
    const parent = canvas?.parentElement;
    const parentWidth = parent?.clientWidth ?? 0;
    const parentHeight = parent?.clientHeight ?? 0;

    const fallbackEdge = Math.min(scaleWidth, scaleHeight);
    const measuredEdge = parentWidth > 0 && parentHeight > 0 ? Math.min(parentWidth, parentHeight) : 0;
    const shortestScreenEdge = measuredEdge > 0 ? measuredEdge : fallbackEdge;

    if (!shortestScreenEdge || !Number.isFinite(shortestScreenEdge)) {
      return 0;
    }

    // Check actual parent size to determine if mobile (parent < 500px means mobile device)
    const isMobile = (parentWidth > 0 && parentWidth < 500) || (scaleWidth > 0 && scaleWidth < 500);
    
    // Use effective screen space for tile calculation
    // Values > 1.0 work because tiles are centered and can overlap HUD margins
    // Mobile: 1.3x gives bigger tiles that fit well with compact HUD
    // Desktop: 0.80 leaves comfortable room for full HUD
    const usablePercentage = isMobile ? 1.3 : 0.80;
    const availableSpace = Math.floor(shortestScreenEdge * usablePercentage);
    const rawSize = Math.floor(availableSpace / maxTiles);
    return Math.max(rawSize, 4);
  }

  private renderTiles(map: TileMap) {
    const { tiles, width, height } = map;
    const gridWidth = width * this.tileSize;
    const gridHeight = height * this.tileSize;

    this.gridOrigin = {
      x: Math.floor((this.scene.scale.width - gridWidth) / 2),
      y: Math.floor((this.scene.scale.height - gridHeight) / 2),
    };

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const tile = tiles[y][x];
        const rect = this.createTile(tile);
        this.tileContainer.add(rect);
        this.tileObjects.set(`${x},${y}`, rect);

        if (tile.type === 'boss') {
          const crown = this.scene.add.text(rect.x, rect.y - this.tileSize * 0.16, '👑');
          crown.setOrigin(0.5, 0.5);
          crown.setScale(Math.min(1.4, this.tileSize / 64));
          this.tileContainer.add(crown);
        }
      }
    }
  }

  private createTile(tile: Tile) {
    const { x, y } = tile.position;
    const centerX = this.gridOrigin.x + x * this.tileSize + this.tileSize / 2;
    const centerY = this.gridOrigin.y + y * this.tileSize + this.tileSize / 2;

    const rect = this.scene.add.rectangle(centerX, centerY, this.tileSize - TILE_GAP, this.tileSize - TILE_GAP);
    rect.setStrokeStyle(2, 0x1a2f4b, 0.6);
    rect.setFillStyle(this.getTileBaseColor(tile));

    if (tile.isAccessible && tile.type === 'boss') {
      rect.setInteractive({ useHandCursor: false });
      rect.on('pointerover', () => {
        rect.setScale(1.02);
      });
      rect.on('pointerout', () => {
        rect.setScale(1);
      });
    }

    return rect;
  }

  private renderPlayerMarker() {
    if (!this.playerMarker) {
      this.playerMarker = this.scene.add.sprite(0, 0, 'wizard');
      this.playerMarker.setDepth(5);
    }

    this.playerMarker.setVisible(true);
    // Scale the sprite to fit nicely within the tile
    const spriteSize = this.tileSize * 0.8; // 80% of tile size
    this.playerMarker.setDisplaySize(spriteSize, spriteSize);
  }

  private getTileBaseColor(tile: Tile): number {
    if (!tile.isAccessible) {
      return 0x0b1d3a;
    }

    switch (tile.type) {
      case 'boss':
        return 0xff8fab;
      case 'blocked':
        return 0x14213d;
      default:
        return 0x1d3557;
    }
  }
}
