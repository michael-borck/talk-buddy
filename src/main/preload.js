const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Database operations
  database: {
    query: (query, params) => ipcRenderer.invoke('db:query', { query, params }),
    run: (query, params) => ipcRenderer.invoke('db:run', { query, params }),
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

  // API proxy to bypass CORS
  fetch: ({ url, options }) => ipcRenderer.invoke('api:fetch', { url, options }),

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