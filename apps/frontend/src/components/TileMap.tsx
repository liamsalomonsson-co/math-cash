import type { TileMap as TileMapType, Position } from '@math-cash/shared';

interface TileMapProps {
  tileMap: TileMapType;
  playerPosition: Position;
  onTileClick: (position: Position) => void;
}

export default function TileMap({ tileMap, playerPosition, onTileClick }: TileMapProps) {
  const getTileContent = (x: number, y: number) => {
    const tile = tileMap.tiles[y][x];
    
    if (tile.isCompleted) {
      return '✅';
    }
    
    switch (tile.type) {
      case 'challenge':
        return '📚';
      case 'boss':
        return '👑';
      case 'empty':
        return '';
      case 'blocked':
        return '⬛'; // Use black square for walls
      default:
        return '';
    }
  };

  const getTileClass = (x: number, y: number) => {
    const tile = tileMap.tiles[y][x];
    
    if (tile.isCompleted) {
      return 'tile tile-completed';
    }
    
    switch (tile.type) {
      case 'challenge':
        return 'tile tile-challenge';
      case 'boss':
        return 'tile tile-boss';
      case 'empty':
        return 'tile tile-empty';
      case 'blocked':
        return 'tile tile-blocked';
      default:
        return 'tile tile-empty';
    }
  };

  const isPlayerOnTile = (x: number, y: number) => {
    return playerPosition.x === x && playerPosition.y === y;
  };

  return (
    <div 
      className="tile-grid"
      style={{
        gridTemplateColumns: `repeat(${tileMap.width}, 1fr)`,
        gridTemplateRows: `repeat(${tileMap.height}, 1fr)`,
      }}
    >
      {Array.from({ length: tileMap.height }, (_, y) =>
        Array.from({ length: tileMap.width }, (_, x) => {
          const tile = tileMap.tiles[y][x];
          return (
            <div
              key={`${x}-${y}`}
              className={getTileClass(x, y)}
              onClick={() => onTileClick({ x, y })}
              style={{
                position: 'relative',
                cursor: tile.type === 'blocked' ? 'not-allowed' : 'pointer',
              }}
            >
              <span style={{ fontSize: '12px' }}>
                {getTileContent(x, y)}
              </span>
              
              {isPlayerOnTile(x, y) && (
                <div className="player">
                  🧙‍♂️
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}