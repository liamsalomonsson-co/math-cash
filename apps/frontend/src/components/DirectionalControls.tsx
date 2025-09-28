import { useRef } from 'react';
import type { Direction } from '@math-cash/shared';

interface DirectionalControlsProps {
  onMove: (direction: Direction) => void;
  disabled?: boolean;
}

export default function DirectionalControls({ onMove, disabled = false }: DirectionalControlsProps) {
  const touchStartTimeRef = useRef<number>(0);

  // Mobile touch button handler
  const handleTouchMove = (direction: Direction) => {
    if (!disabled) {
      touchStartTimeRef.current = Date.now();
      onMove(direction);
    }
  };

  // Mouse click handler (for desktop)
  const handleClickMove = (direction: Direction) => {
    if (disabled) return;
    
    // If a touch event happened recently (within 500ms), ignore this click
    const timeSinceTouch = Date.now() - touchStartTimeRef.current;
    if (timeSinceTouch < 500) {
      return;
    }
    
    onMove(direction);
  };

  return (
    <div className="directional-controls">
      {/* Mobile touch controls */}
      <div className="mobile-controls">
        <div className="control-row">
          <button
            className="direction-btn"
            onTouchStart={(e) => {
              e.preventDefault();
              handleTouchMove('up');
            }}
            onClick={() => handleClickMove('up')}
            disabled={disabled}
            aria-label="Move up"
          >
            ⬆️
          </button>
        </div>
        
        <div className="control-row">
          <button
            className="direction-btn"
            onTouchStart={(e) => {
              e.preventDefault();
              handleTouchMove('left');
            }}
            onClick={() => handleClickMove('left')}
            disabled={disabled}
            aria-label="Move left"
          >
            ⬅️
          </button>
          
          <div className="center-space">
            <span className="control-hint">
              {/* Desktop hint */}
              <span className="desktop-hint">Arrow Keys / WASD</span>
              {/* Mobile hint */}
              <span className="mobile-hint">Tap to Move</span>
            </span>
          </div>
          
          <button
            className="direction-btn"
            onTouchStart={(e) => {
              e.preventDefault();
              handleTouchMove('right');
            }}
            onClick={() => handleClickMove('right')}
            disabled={disabled}
            aria-label="Move right"
          >
            ➡️
          </button>
        </div>
        
        <div className="control-row">
          <button
            className="direction-btn"
            onTouchStart={(e) => {
              e.preventDefault();
              handleTouchMove('down');
            }}
            onClick={() => handleClickMove('down')}
            disabled={disabled}
            aria-label="Move down"
          >
            ⬇️
          </button>
        </div>
      </div>
    </div>
  );
}