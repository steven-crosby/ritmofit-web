/**
 * Root: gate on the Better Auth session. Signed out → Login; signed in →
 * Dashboard (the minimal builder: create class → add a tagged track), proving
 * the end-to-end flow through the backend (M1 step 12 acceptance).
 */
import { authClient } from './lib/auth-client.js';
import { Login } from './components/Login.js';
import { Dashboard } from './components/Dashboard.js';

export function App() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="font-ui text-text-tertiary">Loading…</p>
      </main>
    );
  }

  if (!session) return <Login />;
  return <Dashboard userId={session.user.id} userName={session.user.name || session.user.email} />;
}
