import './index.css';
import { createGame } from './phaser/createGame';

const root = document.getElementById('root');
if (!root) {
  throw new Error('Root element with id "root" not found');
}

root.innerHTML = '';

const container = document.createElement('div');
container.className = 'game-container';
root.appendChild(container);

const stage = document.createElement('div');
stage.className = 'phaser-stage';
container.appendChild(stage);

const handle = createGame(stage);

const cleanup = () => {
  handle.destroy();
};

window.addEventListener('beforeunload', cleanup);

const hot = (import.meta as unknown as { hot?: { dispose(callback: () => void): void } }).hot;
if (hot) {
  hot.dispose(() => {
    window.removeEventListener('beforeunload', cleanup);
    cleanup();
  });
}
