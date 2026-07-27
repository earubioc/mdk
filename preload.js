const { contextBridge, ipcRenderer } = require('electron');
const STRINGS = require('./src/i18n/strings.js');

contextBridge.exposeInMainWorld('mdk', {
  // Archivo
  openFile: () => ipcRenderer.invoke('dialog-open'),
  openPath: (filePath) => ipcRenderer.invoke('read-file-path', filePath),
  saveFile: (content, filePath, saveAs = false) => ipcRenderer.invoke('save-file', { content, filePath, saveAs }),

  // Estado (título de ventana, aviso de cambios sin guardar al cerrar)
  setDirty: (dirty) => ipcRenderer.send('set-dirty', dirty),
  setTitle: (title) => ipcRenderer.send('set-title', title),

  // Exportar / imprimir
  exportPdf: (html, suggestedName) => ipcRenderer.invoke('export-pdf', { html, suggestedName }),
  printNative: (html) => ipcRenderer.invoke('print-native', { html }),
  showItemInFolder: (filePath) => ipcRenderer.invoke('show-item-in-folder', filePath),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),

  // Idioma (ver src/i18n/strings.js para el diccionario completo)
  getLanguageSync: () => ipcRenderer.sendSync('get-language-sync'),
  getLanguage: () => ipcRenderer.invoke('get-language'),
  setLanguage: (lang) => ipcRenderer.send('set-language', lang),
  onLanguageChanged: (callback) => ipcRenderer.on('language-changed', (_evt, lang) => callback(lang)),

  // Apertura de archivo por asociación (.md) / segunda instancia
  onOpenFile: (callback) => ipcRenderer.on('open-file', (_evt, payload) => callback(payload)),

  // Menú -> acciones del renderer
  onMenuAction: (callback) => ipcRenderer.on('menu-action', (_evt, action) => callback(action))
});

// Diccionario es/en compartido con main.js — un solo archivo fuente
// (src/i18n/strings.js), sin duplicar textos entre proceso principal y renderer.
contextBridge.exposeInMainWorld('mdkStrings', STRINGS);
