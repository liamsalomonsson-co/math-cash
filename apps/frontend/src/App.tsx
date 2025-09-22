import { Routes, Route } from 'react-router-dom';

import { GameProvider } from './context/GameContext';
import GamePage from './pages/GamePage';
import HomePage from './pages/HomePage';

function App() {
  return (
    <GameProvider>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/game" element={<GamePage />} />
      </Routes>
    </GameProvider>
  );
}

export default App;