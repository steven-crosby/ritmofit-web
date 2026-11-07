import { createRoot } from 'react-dom/client';
import { Root } from './Root';
import { initPlaybackTiming } from './lib/playback/start-timing';
import { redirectLegacyAuthIntent } from './lib/app-route';
import './index.css';

// Debug-only (RF-128): read ?playback-timing once, before any navigation.
initPlaybackTiming();
// Old "/?auth=" links go to their own paths before anything reads the URL (RF-195).
redirectLegacyAuthIntent();

const root = document.getElementById('root');
if (!root) throw new Error('Root element #root not found');

createRoot(root).render(<Root />);
