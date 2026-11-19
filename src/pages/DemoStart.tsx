import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';

/**
 * /demo — the link to send to prospects: opens the app with sample data, no account needed.
 */
export function DemoStart({ redirectTo }: { redirectTo?: string } = {}) {
  const { startDemo } = useAuth();
  const [failed, setFailed] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    // Once, even under React StrictMode's double effects
    if (started.current) return;
    started.current = true;
    startDemo(redirectTo).catch((error) => {
      console.error('Could not start the demo', error);
      setFailed(true);
    });
  }, [startDemo, redirectTo]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 px-4 text-center">
      {failed ? (
        <>
          <p className="text-gray-700">The demo could not start in this browser.</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => window.location.reload()}>
              Try again
            </Button>
            <Button asChild variant="outline">
              <Link to="/login">Sign in</Link>
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900" />
          <p className="text-sm text-gray-600">Preparing your demo workspace…</p>
        </>
      )}
    </div>
  );
}
