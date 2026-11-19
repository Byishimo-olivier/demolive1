/**
 * Demo mode: lets a prospect open the app without an account.
 *
 * While the flag is on, every API request is answered in the browser by the demo backend
 * (src/demo/demo-backend.ts) from sample data kept in this browser's localStorage. Nothing
 * reaches the real server and every visitor gets a private sandbox.
 */

const DEMO_FLAG_KEY = 'infrasoko_demo';

export const DEMO_USER_ID = '64d000000000000000000001';
export const DEMO_COMPANY_ID = '64d0000000000000000000c1';

/** How a visitor reaches you to get a real account (set in .env, falls back to the contact page) */
export const DEMO_CONTACT = {
  phone: (import.meta.env.VITE_DEMO_CONTACT_PHONE as string | undefined) || '',
  whatsapp: (import.meta.env.VITE_DEMO_CONTACT_WHATSAPP as string | undefined) || '',
  email: (import.meta.env.VITE_DEMO_CONTACT_EMAIL as string | undefined) || '',
};

export function isDemoMode(): boolean {
  try {
    return window.localStorage.getItem(DEMO_FLAG_KEY) === '1';
  } catch {
    return false;
  }
}

export function setDemoFlag(on: boolean) {
  try {
    if (on) window.localStorage.setItem(DEMO_FLAG_KEY, '1');
    else window.localStorage.removeItem(DEMO_FLAG_KEY);
  } catch {
    /* storage blocked: demo only lasts for this page */
  }
}

function base64Url(value: string) {
  return btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** A token shaped like a JWT (no expiry) so the session code treats the demo as signed in */
export const DEMO_TOKEN = [
  base64Url(JSON.stringify({ alg: 'none', typ: 'JWT' })),
  base64Url(JSON.stringify({ sub: DEMO_USER_ID, demo: true })),
  'demo',
].join('.');
