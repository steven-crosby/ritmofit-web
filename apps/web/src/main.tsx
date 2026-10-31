import { createRoot } from 'react-dom/client';
import { Root } from './Root';
import { initPlaybackTiming } from './lib/playback/start-timing';
import './index.css';

// Debug-only (RF-128): read ?playback-timing once, before any navigation.
initPlaybackTiming();

const root = document.getElementById('root');
if (!root) throw new Error('Root element #root not found');

createRoot(root).render(<Root />);
