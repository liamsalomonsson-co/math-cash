import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import TileMap from '../components/TileMap';
import ChallengeModal from '../components/ChallengeModal';
import DirectionalControls from '../components/DirectionalControls';
import type { Position, MathChallenge, Direction } from '@math-cash/shared';

export default function GamePage() {
  const { state, dispatch } = useGame();
  const navigate = useNavigate();
  const [currentChallenge, setCurrentChallenge] = useState<MathChallenge | null>(null);
  const [isChallengeModalOpen, setIsChallengeModalOpen] = useState(false);

  useEffect(() => {
    if (!state.session) {
      navigate('/');
    }
  }, [state.session, navigate]);

  if (!state.session) {
    return <div>Loading...</div>;
  }

  const handleTileClick = (position: Position) => {
    const tile = state.session!.currentMap.tiles[position.y][position.x];
    
    // Only interact with accessible tiles that have challenges and aren't completed
    if (tile.isAccessible && tile.challenge && !tile.isCompleted) {
      setCurrentChallenge(tile.challenge);
      setIsChallengeModalOpen(true);
    }
  };

  const handlePlayerMove = (direction: Direction) => {
    dispatch({
      type: 'MOVE_PLAYER',
      payload: { direction }
    });
    
    // Check if player moved onto a challenge tile
    const newPos = getNewPosition(direction);
    if (newPos) {
      const tile = state.session!.currentMap.tiles[newPos.y][newPos.x];
      if (tile.challenge && !tile.isCompleted) {
        setCurrentChallenge(tile.challenge);
        setIsChallengeModalOpen(true);
      }
    }
  };

  const getNewPosition = (direction: Direction): Position | null => {
    const currentPos = state.session!.player.currentPosition;
    let newPosition: Position;

    switch (direction) {
      case 'up':
        newPosition = { x: currentPos.x, y: Math.max(0, currentPos.y - 1) };
        break;
      case 'down':
        newPosition = { x: currentPos.x, y: Math.min(state.session!.currentMap.height - 1, currentPos.y + 1) };
        break;
      case 'left':
        newPosition = { x: Math.max(0, currentPos.x - 1), y: currentPos.y };
        break;
      case 'right':
        newPosition = { x: Math.min(state.session!.currentMap.width - 1, currentPos.x + 1), y: currentPos.y };
        break;
    }

    // Check if move would be to same position (boundary) or blocked tile
    if (newPosition.x === currentPos.x && newPosition.y === currentPos.y) {
      return null;
    }
    
    const targetTile = state.session!.currentMap.tiles[newPosition.y][newPosition.x];
    if (!targetTile.isAccessible) {
      return null;
    }

    return newPosition;
  };

  const handleChallengeSubmit = (answer: number) => {
    if (currentChallenge && answer === currentChallenge.correctAnswer) {
      dispatch({
        type: 'COMPLETE_CHALLENGE',
        payload: {
          challengeId: currentChallenge.id,
          reward: currentChallenge.reward,
        },
      });
      
      setIsChallengeModalOpen(false);
      setCurrentChallenge(null);
      
      // Check if this was the boss and if all challenges are complete
      checkMapCompletion();
    }
  };

  const handleChallengeClose = () => {
    setIsChallengeModalOpen(false);
    setCurrentChallenge(null);
  };

  const checkMapCompletion = () => {
    const map = state.session!.currentMap;
    let allCompleted = true;
    
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const tile = map.tiles[y][x];
        if (tile.challenge && !tile.isCompleted) {
          allCompleted = false;
          break;
        }
      }
      if (!allCompleted) break;
    }
    
    if (allCompleted) {
      // Show completion message and generate next map
      alert(`🎉 Congratulations! You've completed the ${map.difficulty} level! 
        
Earned: ${state.session!.player.currency} coins total
Next level coming up...`);
      
      dispatch({ type: 'COMPLETE_MAP' });
    }
  };

  return (
    <div className="game-container">
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <div className="currency-display">
          💰 {state.session.player.currency}
        </div>
        <div style={{ 
          color: 'white', 
          fontSize: '18px',
          textAlign: 'center'
        }}>
          <div>{state.session.player.name}'s Adventure</div>
          <div style={{ fontSize: '14px', opacity: 0.8 }}>
            Level: {state.session.currentMap.difficulty} | 
            Streak: {state.session.player.currentStreak}
          </div>
        </div>
        <button 
          className="btn"
          onClick={() => navigate('/')}
          style={{ background: 'rgba(255, 255, 255, 0.2)', color: 'white' }}
        >
          🏠 Home
        </button>
      </div>

      <TileMap
        tileMap={state.session.currentMap}
        playerPosition={state.session.player.currentPosition}
        onTileClick={handleTileClick}
      />
      
      <DirectionalControls 
        onMove={handlePlayerMove}
        disabled={isChallengeModalOpen}
      />
      
      <div style={{ 
        color: 'white', 
        textAlign: 'center', 
        marginTop: '20px',
        fontSize: '14px'
      }}>
        <p>🗺️ Use keyboard arrows/WASD or tap direction buttons to move!</p>
        <p>📚 Step on challenge tiles to solve math problems and earn coins!</p>
        <p>🧱 Dark walls block your path - find the way around them!</p>
        <p>👑 Reach the boss in the top-right to complete the level!</p>
      </div>

      {currentChallenge && (
        <ChallengeModal
          challenge={currentChallenge}
          isOpen={isChallengeModalOpen}
          onSubmit={handleChallengeSubmit}
          onClose={handleChallengeClose}
        />
      )}
    </div>
  );
}