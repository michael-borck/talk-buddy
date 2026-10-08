// Piper TTS IPC — one module so both the real app and the dev verification
// runner register identical handlers (mirrors wasm-stt-ipc.js).

const { ipcMain } = require('electron');
const piper = require('./piper-bridge');

// Call once inside app.whenReady().
function registerPiperBridge() {
  ipcMain.handle('piper:status', () => piper.status());
  ipcMain.handle('piper:ensure', async (event) => {
    try {
      return await piper.ensureModels(event.sender);
    } catch (err) {
      console.error('piper:ensure failed:', err);
      return { success: false, error: err && err.message ? err.message : String(err) };
    }
  });
  ipcMain.handle('piper:speak', async (event, { text, voice, speed }) => {
    try {
      const { wav, sampleRate } = await piper.synthesize({ text, voice, speed });
      return { ok: true, wav: new Uint8Array(wav), sampleRate };
    } catch (err) {
      console.error('piper:speak failed:', err);
      return { ok: false, error: err && err.message ? err.message : String(err) };
    }
  });
}

module.exports = { registerPiperBridge };
