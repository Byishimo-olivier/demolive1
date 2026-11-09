/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BASE_URL?: string;
  /** Minutes of inactivity before a session without "Remember me" ends (0 = never). Default 30. */
  readonly VITE_SESSION_IDLE_MINUTES?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
