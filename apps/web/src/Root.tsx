import { StrictMode } from 'react';
import { App } from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { UpdatePrompt } from './components/UpdatePrompt';

/**
 * `UpdatePrompt` sits outside the app's error boundary. A deploy can leave an
 * open tab running the old precached shell against the new API; if that shell
 * crashes, the boundary's "Reload safely" only reloads the same old shell while
 * the new worker waits. The update toast is the way out, so it must survive.
 */
export function Root() {
  return (
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
      <UpdatePrompt />
    </StrictMode>
  );
}
