import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';

export default function HomePage() {
  const [playerName, setPlayerName] = useState('');
  const { state, dispatch } = useGame();
  const navigate = useNavigate();

  const handleStartGame = () => {
    if (playerName.trim()) {
      dispatch({ type: 'START_GAME', payload: { playerName: playerName.trim() } });
      navigate('/game');
    }
  };

  const handleContinueGame = () => {
    navigate('/game');
  };

  return (
    <div className="game-container">
      <div style={{ textAlign: 'center', color: 'white', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '48px', margin: '20px 0' }}>🏰 Math Cash 💰</h1>
        <p style={{ fontSize: '20px', opacity: 0.9 }}>
          Embark on a tile-based adventure where math challenges unlock treasures!
        </p>
      </div>

      <div style={{ 
        background: 'rgba(255, 255, 255, 0.1)', 
        padding: '32px', 
        borderRadius: '16px',
        backdropFilter: 'blur(10px)',
        maxWidth: '400px',
        margin: '0 auto'
      }}>
        {state.session ? (
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ color: 'white', marginBottom: '20px' }}>
              Welcome back, {state.session.player.name}!
            </h2>
            <div style={{ color: 'white', marginBottom: '20px', opacity: 0.9 }}>
              <p>💰 Currency: {state.session.player.currency}</p>
              <p>🏆 Maps Completed: {state.session.player.completedMaps.length}</p>
              <p>⚡ Best Streak: {state.session.player.bestStreak}</p>
            </div>
            <button 
              className="btn btn-primary" 
              onClick={handleContinueGame}
              style={{ width: '100%', marginBottom: '12px' }}
            >
              Continue Adventure
            </button>
            <button 
              className="btn" 
              onClick={() => {
                localStorage.removeItem('math-cash-save');
                window.location.reload();
              }}
              style={{ 
                width: '100%', 
                background: 'rgba(255, 255, 255, 0.2)', 
                color: 'white' 
              }}
            >
              Start New Game
            </button>
          </div>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ color: 'white', marginBottom: '20px' }}>Start Your Adventure</h2>
            <input
              type="text"
              placeholder="Enter your name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleStartGame()}
              style={{
                width: '100%',
                padding: '12px 16px',
                fontSize: '18px',
                border: 'none',
                borderRadius: '8px',
                marginBottom: '20px',
                textAlign: 'center',
              }}
              maxLength={20}
              autoFocus
            />
            <button 
              className="btn btn-primary" 
              onClick={handleStartGame}
              disabled={!playerName.trim()}
              style={{ width: '100%' }}
            >
              Start Adventure 🚀
            </button>
          </div>
        )}
      </div>

      <div style={{ 
        color: 'white', 
        textAlign: 'center', 
        marginTop: '40px',
        opacity: 0.8,
        fontSize: '16px'
      }}>
        <h3>How to Play:</h3>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <p>🎯 Navigate the tile map using arrow keys</p>
          <p>📚 Solve math challenges to earn currency</p>
          <p>👑 Defeat the boss to unlock the next level</p>
          <p>🏅 Each map gets progressively more challenging</p>
        </div>
      </div>
    </div>
  );
}