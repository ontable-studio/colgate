/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEVICE_ID?: string;
}

/** Injected by Vite `define` from package.json version. */
declare const __GAME_VERSION__: string;

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
