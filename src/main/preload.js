const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Database operations — named ops only, no raw SQL over IPC
  database: {
    op: (name, params) => ipcRenderer.invoke('db:op', { name, params }),
    reset: () => ipcRenderer.invoke('db:reset')
  },

  // Dialog operations
  dialog: {
    openFile: () => ipcRenderer.invoke('dialog:openFile'),
    saveFile: (defaultPath) => ipcRenderer.invoke('dialog:saveFile', defaultPath)
  },

  // Shell operations
  shell: {
    openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url)
  },

  // App info
  app: {
    getVersion: () => ipcRenderer.invoke('app:getVersion'),
    getPath: (name) => ipcRenderer.invoke('app:getPath', name),
    // Resolves a shell environment variable from main's process.env.
    // Returns null if the variable is unset.
    getEnvVar: (name) => ipcRenderer.invoke('app:getEnvVar', name),
  },

  // Platform info
  platform: process.platform,

  // Scenarios
  scenarios: {
    restoreDefaults: () => ipcRenderer.invoke('scenarios:restoreDefaults')
  },

  // API keys — encrypted at rest via OS keychain (safeStorage) in main.
  secrets: {
    get: (key) => ipcRenderer.invoke('secrets:get', key),
    set: (key, value) => ipcRenderer.invoke('secrets:set', { key, value }),
  },

  // API proxy to bypass CORS
  fetch: ({ url, options }) => ipcRenderer.invoke('api:fetch', { url, options }),

  // User-initiated https text fetch (pack import from URL)
  fetchText: (url) => ipcRenderer.invoke('net:fetchText', url),

  // Speaches proxies — multipart + binary, main-process fetch to bypass CORS
  speaches: {
    transcribe: (params) => ipcRenderer.invoke('speaches:transcribe', params),
    speak: (params) => ipcRenderer.invoke('speaches:speak', params),
  },

  // Embedded server operations
  embeddedServerStatus: () => ipcRenderer.invoke('embedded-server:status'),
  embeddedServerStart: () => ipcRenderer.invoke('embedded-server:start'),
  embeddedServerStop: () => ipcRenderer.invoke('embedded-server:stop'),
  embeddedServerRestart: () => ipcRenderer.invoke('embedded-server:restart'),

  // In-app (wasm) STT — model download/status; progress events while ensuring.
  wasmStt: {
    status: () => ipcRenderer.invoke('wasm-stt:status'),
    ensureModels: () => ipcRenderer.invoke('wasm-stt:ensure-models'),
    assetBase: () => ipcRenderer.invoke('wasm-stt:asset-base'),
    onProgress: (callback) => {
      const listener = (_event, payload) => callback(payload);
      ipcRenderer.on('wasm-stt:progress', listener);
      return () => ipcRenderer.removeListener('wasm-stt:progress', listener);
    },
  },

  // In-app (piper) TTS — binary/voice download + synthesis.
  piper: {
    status: () => ipcRenderer.invoke('piper:status'),
    ensure: () => ipcRenderer.invoke('piper:ensure'),
    speak: (params) => ipcRenderer.invoke('piper:speak', params),
    onProgress: (callback) => {
      const listener = (_event, payload) => callback(payload);
      ipcRenderer.on('piper:progress', listener);
      return () => ipcRenderer.removeListener('piper:progress', listener);
    },
  },

  // Embedded server setup flow — used by the Settings "Set up now" modal.
  embeddedInstall: {
    check: () => ipcRenderer.invoke('embedded-server:check-install'),
    run: () => ipcRenderer.invoke('embedded-server:install'),
    cancel: () => ipcRenderer.invoke('embedded-server:install-cancel'),
    // Subscribe to live stdout/stderr from setup.sh. Returns an
    // unsubscribe function that also removes the listener.
    onOutput: (callback) => {
      const listener = (_event, payload) => callback(payload);
      ipcRenderer.on('embedded-install:output', listener);
      return () => ipcRenderer.removeListener('embedded-install:output', listener);
    },
  },
});