import { useEffect, useRef, useState } from 'react';
import { Clock, LogOut, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { session, type SignOutReason } from '../../lib/session';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';

// Minutes without activity before a non-remembered session ends (0 turns it off)
const IDLE_MINUTES = Number(import.meta.env.VITE_SESSION_IDLE_MINUTES ?? 30);
const IDLE_MS = Number.isFinite(IDLE_MINUTES) && IDLE_MINUTES > 0 ? IDLE_MINUTES * 60_000 : 0;
// How long the "are you still there?" warning shows before signing out
const IDLE_WARNING_MS = Math.min(60_000, IDLE_MS / 2);
// Warn this long before the token itself expires
const EXPIRY_WARNING_MS = 5 * 60_000;
// Write activity to storage at most this often
const ACTIVITY_WRITE_MS = 5_000;

const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'wheel'] as const;

type Warning = { kind: 'idle' | 'expiry'; endsAt: number };

function formatRemaining(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return minutes > 0 ? `${minutes}:${String(seconds).padStart(2, '0')}` : `${seconds}s`;
}

/**
 * Keeps the browser session honest:
 * - signs out after inactivity (sessions without "Remember me"), with a warning first
 * - signs out when the token expires, with a warning a few minutes before
 * - follows sign-in / sign-out done in other tabs
 */
export function SessionManager() {
  const { user, signOut } = useAuth();
  const [warning, setWarning] = useState<Warning | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // Latest values for listeners registered once
  const signOutRef = useRef(signOut);
  signOutRef.current = signOut;
  const userRef = useRef(user);
  userRef.current = user;
  const warningRef = useRef(warning);
  warningRef.current = warning;
  const expiryDismissedRef = useRef(false);

  // Other tabs: sign out together, and pick up a sign-in
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.storageArea !== window.localStorage) return;

      if (event.key === session.keys.LOGOUT_EVENT_KEY && event.newValue && userRef.current) {
        let reason: SignOutReason = 'remote';
        try {
          const parsed = JSON.parse(event.newValue) as { reason?: SignOutReason };
          if (parsed.reason === 'idle' || parsed.reason === 'expired') reason = parsed.reason;
        } catch {
          /* keep 'remote' */
        }
        signOutRef.current({ reason, broadcast: false });
        return;
      }

      // Signed in (with "Remember me") in another tab while this one is signed out
      if (event.key === session.keys.TOKEN_KEY && event.newValue && !userRef.current) {
        window.location.reload();
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Idle and expiry timers while signed in
  useEffect(() => {
    if (!user) {
      setWarning(null);
      return;
    }

    const remembered = session.isRemembered();
    const idleEnabled = !remembered && IDLE_MS > 0;
    expiryDismissedRef.current = false;
    let lastWrite = 0;
    let ended = false;

    const end = (reason: SignOutReason) => {
      if (ended) return;
      ended = true;
      setWarning(null);
      signOutRef.current({ reason });
    };

    const idleDeadline = () => session.lastActivity() + IDLE_MS;

    const tick = () => {
      if (ended || !session.getToken()) return;
      const t = Date.now();

      const expiry = session.getExpiry();
      if (expiry !== null && t >= expiry) return end('expired');

      if (idleEnabled) {
        const deadline = idleDeadline();
        if (t >= deadline) return end('idle');
        if (t >= deadline - IDLE_WARNING_MS) {
          setWarning({ kind: 'idle', endsAt: deadline });
          setNow(t);
          return;
        }
      }

      if (expiry !== null && t >= expiry - EXPIRY_WARNING_MS && !expiryDismissedRef.current) {
        setWarning({ kind: 'expiry', endsAt: expiry });
        setNow(t);
        return;
      }

      // Activity in another tab can clear an idle warning shown here
      if (warningRef.current) setWarning(null);
    };

    const onActivity = () => {
      if (ended) return;
      // The idle warning needs an explicit "Stay signed in"
      if (warningRef.current?.kind === 'idle') return;
      const t = Date.now();
      // Back after sleep / a throttled background tab: the limit may already be past
      if (idleEnabled && t >= idleDeadline()) return end('idle');
      if (t - lastWrite >= ACTIVITY_WRITE_MS) {
        lastWrite = t;
        session.markActivity();
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') tick();
    };

    session.markActivity();
    ACTIVITY_EVENTS.forEach((name) => window.addEventListener(name, onActivity, { passive: true }));
    document.addEventListener('visibilitychange', onVisibility);
    const interval = window.setInterval(tick, 1000);
    tick();

    return () => {
      ACTIVITY_EVENTS.forEach((name) => window.removeEventListener(name, onActivity));
      document.removeEventListener('visibilitychange', onVisibility);
      window.clearInterval(interval);
    };
  }, [user]);

  const staySignedIn = () => {
    session.markActivity();
    setWarning(null);
  };

  const dismissExpiry = () => {
    expiryDismissedRef.current = true;
    setWarning(null);
  };

  if (!warning) return null;

  const remaining = formatRemaining(warning.endsAt - now);
  const isIdle = warning.kind === 'idle';

  return (
    <Dialog open onOpenChange={(open) => !open && (isIdle ? staySignedIn() : dismissExpiry())}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
            <Clock className="h-6 w-6" />
          </div>
          <DialogTitle>{isIdle ? 'Are you still there?' : 'Your session is ending soon'}</DialogTitle>
          <DialogDescription>
            {isIdle ? (
              <>
                For your security you'll be signed out in{' '}
                <span className="font-semibold tabular-nums text-gray-900">{remaining}</span> because there
                has been no activity.
              </>
            ) : (
              <>
                Your session expires in{' '}
                <span className="font-semibold tabular-nums text-gray-900">{remaining}</span>. Save your work,
                then sign in again to continue.
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          {isIdle ? (
            <>
              <Button variant="outline" onClick={() => signOut()}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </Button>
              <Button onClick={staySignedIn} className="bg-gray-900 text-white hover:bg-gray-800" autoFocus>
                <ShieldCheck className="mr-2 h-4 w-4" />
                Stay signed in
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={dismissExpiry}>
                Remind me later
              </Button>
              <Button
                onClick={() => signOut({ reason: 'expired' })}
                className="bg-gray-900 text-white hover:bg-gray-800"
              >
                Sign in again
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
