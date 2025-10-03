import Phaser from 'phaser';
import type { TileMap, Tile, Position } from '../../../../lib';
import { PLAYER_COLOR, TILE_GAP } from '../constants';

export class BoardController {
  private readonly tileContainer: Phaser.GameObjects.Container;
  private playerMarker?: Phaser.GameObjects.Arc;
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

      if (tile.isCompleted && tile.challenge) {
        rect.setFillStyle(0x43aa8b, 0.85);
      }
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

  getTileRect(position: Position): Phaser.GameObjects.Rectangle | undefined {
    return this.tileObjects.get(`${position.x},${position.y}`);
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

    const usableEdge = Math.max(shortestScreenEdge - TILE_GAP, 0);
    const rawSize = Math.floor(usableEdge / maxTiles);
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

    if (tile.isAccessible && (tile.challenge || tile.type === 'boss')) {
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
      this.playerMarker = this.scene.add.circle(0, 0, (this.tileSize - TILE_GAP) / 3, PLAYER_COLOR, 0.95);
      this.playerMarker.setDepth(5);
    }

    this.playerMarker.setVisible(true);
    this.playerMarker.setRadius(Math.max(12, (this.tileSize - TILE_GAP) / 3));
  }

  private getTileBaseColor(tile: Tile): number {
    if (!tile.isAccessible) {
      return 0x0b1d3a;
    }

    switch (tile.type) {
      case 'boss':
        return 0xff8fab;
      case 'challenge':
        return 0xffc857;
      case 'blocked':
        return 0x14213d;
      default:
        return 0x1d3557;
    }
  }
}
