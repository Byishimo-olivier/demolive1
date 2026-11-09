import type { User } from '../types';

/**
 * Browser session: where the sign-in token lives and how tabs agree on it.
 *
 * - "Remember me" keeps the session in localStorage (survives closing the browser).
 *   Otherwise it lives in sessionStorage and ends when the browser closes.
 * - A new tab of a non-remembered session borrows it from an open tab, so links
 *   opened in a new tab stay signed in.
 * - Signing out in one tab signs out every tab.
 */

const TOKEN_KEY = 'infrasoko_auth_token';
const USER_KEY = 'infrasoko_user';
const ACTIVITY_KEY = 'infrasoko_last_activity';
const LOGOUT_EVENT_KEY = 'infrasoko_logout_event';
// Why this tab's session ended, for the sign-in page to explain
const REASON_KEY = 'infrasoko_signout_reason';
const CHANNEL_NAME = 'infrasoko_session';

// Workspace state that belongs to the signed-in user
const USER_STATE_KEYS = [
  'infrasoko_active_profile',
  'infrasoko_active_project',
  'infrasoko_user_companies',
  'infrasoko_user_projects',
];

export type SignOutReason = 'manual' | 'idle' | 'expired' | 'remote';

type ChannelMessage =
  | { type: 'request' }
  | { type: 'share'; token: string; user: string };

function safeStore(kind: 'local' | 'session'): Storage | null {
  try {
    return kind === 'local' ? window.localStorage : window.sessionStorage;
  } catch {
    return null; // storage blocked (private mode, sandboxed iframe…)
  }
}

function read(store: Storage | null, key: string): string | null {
  try {
    return store?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function write(store: Storage | null, key: string, value: string) {
  try {
    store?.setItem(key, value);
  } catch {
    /* quota or blocked storage: the session just won't persist */
  }
}

function remove(store: Storage | null, key: string) {
  try {
    store?.removeItem(key);
  } catch {
    /* ignore */
  }
}

/** Decode a JWT payload (base64url) without verifying it. */
function decodeJwt(token: string): { exp?: number } | null {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const base64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

const channel: BroadcastChannel | null =
  typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL_NAME) : null;

// Answer other tabs that ask for the non-remembered session
channel?.addEventListener('message', (event: MessageEvent<ChannelMessage>) => {
  if (event.data?.type !== 'request') return;
  const store = safeStore('session');
  const token = read(store, TOKEN_KEY);
  const user = read(store, USER_KEY);
  if (token && user && !session.isExpired(token)) {
    channel.postMessage({ type: 'share', token, user } satisfies ChannelMessage);
  }
});

export const session = {
  getToken(): string | null {
    return read(safeStore('session'), TOKEN_KEY) ?? read(safeStore('local'), TOKEN_KEY);
  },

  getUser(): User | null {
    const raw = read(safeStore('session'), USER_KEY) ?? read(safeStore('local'), USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as User;
    } catch {
      return null;
    }
  },

  /** True when the user ticked "Remember me" (session survives closing the browser). */
  isRemembered(): boolean {
    return !read(safeStore('session'), TOKEN_KEY) && !!read(safeStore('local'), TOKEN_KEY);
  },

  start(token: string, user: User, remember: boolean) {
    remove(safeStore('local'), TOKEN_KEY);
    remove(safeStore('local'), USER_KEY);
    remove(safeStore('session'), TOKEN_KEY);
    remove(safeStore('session'), USER_KEY);
    const store = safeStore(remember ? 'local' : 'session');
    write(store, TOKEN_KEY, token);
    write(store, USER_KEY, JSON.stringify(user));
    session.markActivity();
  },

  updateUser(user: User) {
    const store = read(safeStore('session'), TOKEN_KEY) ? safeStore('session') : safeStore('local');
    write(store, USER_KEY, JSON.stringify(user));
  },

  /** Remove the session from this browser. Other tabs are told unless `broadcast` is false. */
  clear(reason: SignOutReason = 'manual', broadcast = true) {
    const local = safeStore('local');
    const sess = safeStore('session');
    for (const key of [TOKEN_KEY, USER_KEY, ...USER_STATE_KEYS]) {
      remove(local, key);
      remove(sess, key);
    }
    remove(local, ACTIVITY_KEY);
    if (reason === 'manual') remove(sess, REASON_KEY);
    else write(sess, REASON_KEY, reason);
    if (broadcast) {
      // The changing value fires a `storage` event in every other tab
      write(local, LOGOUT_EVENT_KEY, JSON.stringify({ reason, at: Date.now() }));
    }
  },

  /** Why this tab was last signed out (other than by the user), if not yet shown. */
  peekSignOutReason(): SignOutReason | null {
    const value = read(safeStore('session'), REASON_KEY);
    return value === 'idle' || value === 'expired' || value === 'remote' ? value : null;
  },

  forgetSignOutReason() {
    remove(safeStore('session'), REASON_KEY);
  },

  /** When the token stops being valid (ms since epoch), or null if it has no expiry. */
  getExpiry(token: string | null = session.getToken()): number | null {
    if (!token) return null;
    const exp = decodeJwt(token)?.exp;
    return typeof exp === 'number' ? exp * 1000 : null;
  },

  isExpired(token: string | null = session.getToken()): boolean {
    if (!token) return true;
    if (!decodeJwt(token)) return true; // malformed
    const expiry = session.getExpiry(token);
    return expiry !== null && expiry <= Date.now();
  },

  /** Shared across tabs, so activity in one tab keeps the others signed in. */
  markActivity() {
    write(safeStore('local'), ACTIVITY_KEY, String(Date.now()));
  },

  lastActivity(): number {
    const value = Number(read(safeStore('local'), ACTIVITY_KEY));
    return Number.isFinite(value) && value > 0 ? value : Date.now();
  },

  /**
   * A fresh tab has no sessionStorage. Ask open tabs for their non-remembered session
   * and adopt it. Resolves true when one was received.
   */
  borrowFromOpenTab(timeoutMs = 250): Promise<boolean> {
    if (!channel) return Promise.resolve(false);
    return new Promise((resolve) => {
      const onMessage = (event: MessageEvent<ChannelMessage>) => {
        if (event.data?.type !== 'share') return;
        if (session.isExpired(event.data.token)) return;
        const store = safeStore('session');
        write(store, TOKEN_KEY, event.data.token);
        write(store, USER_KEY, event.data.user);
        finish(true);
      };
      const finish = (ok: boolean) => {
        clearTimeout(timer);
        channel.removeEventListener('message', onMessage);
        resolve(ok);
      };
      const timer = setTimeout(() => finish(false), timeoutMs);
      channel.addEventListener('message', onMessage);
      channel.postMessage({ type: 'request' } satisfies ChannelMessage);
    });
  },

  keys: { TOKEN_KEY, USER_KEY, ACTIVITY_KEY, LOGOUT_EVENT_KEY },
};
