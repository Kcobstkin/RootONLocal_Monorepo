/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_STATION_MODEL: string;
  readonly VITE_STATION_TOKEN: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
