/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SITE_URL?: string;
}

/** Injected by Vite `define` from package.json version. */
declare const __GAME_VERSION__: string;

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
