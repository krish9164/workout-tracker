/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;  // add all your env vars here
  // readonly VITE_ANOTHER_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
