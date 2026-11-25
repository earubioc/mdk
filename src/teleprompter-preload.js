// Preload mínimo del teleprompter (ventana en sandbox): solo el puente que necesita.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('tp', {
  onInit: (cb) => ipcRenderer.on('tp-init', (_e, payload) => cb(payload)),
  onCmd: (cb) => ipcRenderer.on('tp-cmd', (_e, cmd) => cb(cmd)),
  setHidden: (hidden) => ipcRenderer.invoke('tp-set-hidden', !!hidden),
  savePrefs: (prefs) => ipcRenderer.send('tp-save-prefs', prefs),
  close: () => ipcRenderer.send('tp-close')
});
