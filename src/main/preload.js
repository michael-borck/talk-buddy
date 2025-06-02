const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Database operations
  database: {
    query: (query, params) => ipcRenderer.invoke('db:query', { query, params }),
    run: (query, params) => ipcRenderer.invoke('db:run', { query, params })
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
    getPath: (name) => ipcRenderer.invoke('app:getPath', name)
  },

  // Platform info
  platform: process.platform,

  // Scenarios
  scenarios: {
    restoreDefaults: () => ipcRenderer.invoke('scenarios:restoreDefaults')
  },

  // API proxy to bypass CORS
  fetch: ({ url, options }) => ipcRenderer.invoke('api:fetch', { url, options })
});