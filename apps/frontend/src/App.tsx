import { Routes, Route } from 'react-router-dom';

import GamePage from './pages/GamePage';
import HomePage from './pages/HomePage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/game" element={<GamePage />} />
    </Routes>
  );
}

export default App;