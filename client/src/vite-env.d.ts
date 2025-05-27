/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_POCKETBASE_URL: string
  readonly VITE_WHISPER_URL: string
  readonly VITE_PIPER_URL: string
  readonly VITE_OLLAMA_URL: string
  readonly VITE_OLLAMA_API_KEY: string
  readonly VITE_OLLAMA_MODEL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
