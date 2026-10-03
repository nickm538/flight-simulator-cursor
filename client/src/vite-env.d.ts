/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEFAULT_CALLSIGN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
