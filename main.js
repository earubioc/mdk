const { app, BrowserWindow, Menu, dialog, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const STRINGS = require('./src/i18n/strings.js');

let mainWindow = null;

// Con pestañas múltiples, el proceso principal ya no rastrea "el archivo actual":
// cada pestaña vive en el renderer. Aquí solo guardamos si HAY (en cualquier
// pestaña) cambios sin guardar, para poder advertir al cerrar la ventana.
let hasUnsavedChanges = false;

// ---------- idioma: detección, persistencia y helper de traducción ----------
// Se guarda en un settings.json propio (no localStorage, que solo ve el
// renderer) porque el proceso principal necesita el idioma ANTES de crear la
// ventana, para construir el menú nativo ya traducido desde el primer frame.
const settingsPath = path.join(app.getPath('userData'), 'mdk-settings.json');

function readSettings() {
  try {
    return JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
  } catch (e) {
    return {};
  }
}

function writeSettings(settings) {
  try {
    fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
  } catch (e) {
    // Si falla, simplemente no persiste; no es crítico para poder usar la app.
  }
}

function localeToLang(locale) {
  return (locale || '').toLowerCase().startsWith('es') ? 'es' : 'en';
}

const savedSettings = readSettings();
let currentLanguage = savedSettings.language || localeToLang(app.getLocale());

function t(key) {
  const dict = STRINGS[currentLanguage] || STRINGS.en;
  return dict[key] != null ? dict[key] : (STRINGS.en[key] || key);
}

function send(channel, payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, payload);
  }
}

// ---------- abrir .md por asociación de archivos / doble clic ----------
// Windows abre MDK pasando la ruta del archivo como argumento de línea de
// comandos (tanto al asociar .md a MDK como al arrastrar un archivo sobre el
// ícono del programa). Sin este bloque, ese argumento simplemente se ignora
// y la app arranca con un documento en blanco — el bug reportado.
function isSupportedDocPath(p) {
  return typeof p === 'string' && /\.(md|markdown|txt)$/i.test(p);
}

function extractFilePathFromArgv(argv) {
  // argv[0] es el ejecutable (o, en desarrollo, el binario de Electron); el
  // resto son argumentos. Se toma el último que parezca una ruta .md/.txt.
  const candidates = argv.filter((a, i) => i > 0 && isSupportedDocPath(a));
  return candidates.length ? candidates[candidates.length - 1] : null;
}

function openFilePathInRenderer(filePath) {
  if (!filePath) return;
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    send('open-file', { filePath, content });
    addRecentFile(filePath);
  } catch (err) {
    dialog.showErrorBox(t('dialog.openErrorTitle'), String(err.message || err));
  }
}

// ---------- archivos recientes ----------
// Se guardan en el mismo settings.json que el idioma (no localStorage: el
// menú nativo, que vive en el proceso principal, es quien arma "Abrir
// reciente", y solo el proceso principal puede leer settings.json).
const MAX_RECENT_FILES = 15;

function addRecentFile(filePath) {
  if (!filePath) return;
  const settings = readSettings();
  let recent = Array.isArray(settings.recentFiles) ? settings.recentFiles : [];
  recent = [filePath, ...recent.filter((p) => p !== filePath)].slice(0, MAX_RECENT_FILES);
  writeSettings({ ...settings, recentFiles: recent });
  buildMenu();
}

function getRecentFiles() {
  const settings = readSettings();
  const recent = Array.isArray(settings.recentFiles) ? settings.recentFiles : [];
  // No mostrar rutas de archivos que ya no existen (movidos/borrados).
  return recent.filter((p) => {
    try {
      return fs.existsSync(p);
    } catch (e) {
      return false;
    }
  });
}

function clearRecentFiles() {
  writeSettings({ ...readSettings(), recentFiles: [] });
  buildMenu();
}

function buildRecentFilesSubmenu() {
  const recent = getRecentFiles();
  if (!recent.length) {
    return [{ label: t('menu.file.openRecentEmpty'), enabled: false }];
  }
  const items = recent.map((filePath) => ({
    label: `${path.basename(filePath)}  —  ${path.dirname(filePath)}`,
    click: () => openFilePathInRenderer(filePath)
  }));
  items.push({ type: 'separator' });
  items.push({ label: t('menu.file.clearRecent'), click: clearRecentFiles });
  return items;
}

// Instancia única: si el usuario hace doble clic en un segundo .md mientras
// MDK ya está abierto, Windows lanzaría un segundo proceso completo. Con el
// lock, ese segundo proceso se cierra solo y le pasa su línea de comandos
// (con la ruta del archivo) a la instancia que ya está corriendo, vía el
// evento 'second-instance' — así el archivo se abre como pestaña nueva en la
// misma ventana en vez de abrir una ventana de MDK por cada archivo.
const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', (_event, argv) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
    openFilePathInRenderer(extractFilePathFromArgv(argv));
  });

  app.whenReady().then(() => {
    createWindow();
    const initialFilePath = extractFilePathFromArgv(process.argv);
    if (initialFilePath) {
      // Esperar a que el renderer haya terminado de cargar (y por lo tanto ya
      // registró su listener 'open-file') antes de empujarle el archivo.
      mainWindow.webContents.once('did-finish-load', () => openFilePathInRenderer(initialFilePath));
    }
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 760,
    minWidth: 640,
    minHeight: 480,
    backgroundColor: '#F4F3F1',
    title: 'MDK',
    icon: path.join(__dirname, 'build', 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      spellcheck: true
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

  mainWindow.on('close', (e) => {
    if (hasUnsavedChanges) {
      const choice = dialog.showMessageBoxSync(mainWindow, {
        type: 'warning',
        buttons: [t('dialog.cancel'), t('dialog.exitWithoutSaving')],
        defaultId: 0,
        cancelId: 0,
        title: t('dialog.closeTitle'),
        message: t('dialog.closeMessage')
      });
      if (choice === 0) e.preventDefault();
    }
  });

  buildMenu();
}

function setLanguage(lang) {
  if (lang !== 'es' && lang !== 'en') return;
  currentLanguage = lang;
  writeSettings({ ...readSettings(), language: lang });
  buildMenu();
  send('language-changed', lang);
}

function buildMenu() {
  const isMac = process.platform === 'darwin';
  const template = [
    {
      label: t('menu.file'),
      submenu: [
        { label: t('menu.file.newTab'), accelerator: 'CmdOrCtrl+N', click: () => send('menu-action', 'new-tab') },
        { label: t('menu.file.open'), accelerator: 'CmdOrCtrl+O', click: () => send('menu-action', 'open') },
        { label: t('menu.file.openRecent'), submenu: buildRecentFilesSubmenu() },
        { type: 'separator' },
        { label: t('menu.file.save'), accelerator: 'CmdOrCtrl+S', click: () => send('menu-action', 'save') },
        { label: t('menu.file.saveAs'), accelerator: 'CmdOrCtrl+Shift+S', click: () => send('menu-action', 'save-as') },
        { label: t('menu.file.closeTab'), accelerator: 'CmdOrCtrl+W', click: () => send('menu-action', 'close-tab') },
        { type: 'separator' },
        { label: t('menu.file.exportPdf'), accelerator: 'CmdOrCtrl+P', click: () => send('menu-action', 'export-pdf') },
        { label: t('menu.file.print'), accelerator: 'CmdOrCtrl+Shift+P', click: () => send('menu-action', 'print') },
        { type: 'separator' },
        isMac ? { role: 'close' } : { label: t('menu.file.quit'), accelerator: 'CmdOrCtrl+Q', click: () => app.quit() }
      ]
    },
    {
      label: t('menu.edit'),
      submenu: [
        { role: 'undo', label: t('menu.edit.undo') },
        { role: 'redo', label: t('menu.edit.redo') },
        { type: 'separator' },
        { role: 'cut', label: t('menu.edit.cut') },
        { role: 'copy', label: t('menu.edit.copy') },
        { role: 'paste', label: t('menu.edit.paste') },
        { role: 'selectAll', label: t('menu.edit.selectAll') },
        { type: 'separator' },
        { label: t('menu.edit.find'), accelerator: 'CmdOrCtrl+F', click: () => send('menu-action', 'toggle-search') }
      ]
    },
    {
      label: t('menu.format'),
      submenu: [
        { label: t('menu.format.h1'), accelerator: 'CmdOrCtrl+1', click: () => send('menu-action', 'h1') },
        { label: t('menu.format.h2'), accelerator: 'CmdOrCtrl+2', click: () => send('menu-action', 'h2') },
        { label: t('menu.format.h3'), accelerator: 'CmdOrCtrl+3', click: () => send('menu-action', 'h3') },
        { label: t('menu.format.p'), accelerator: 'CmdOrCtrl+0', click: () => send('menu-action', 'p') },
        { type: 'separator' },
        { label: t('menu.format.bold'), accelerator: 'CmdOrCtrl+B', click: () => send('menu-action', 'bold') },
        { label: t('menu.format.italic'), accelerator: 'CmdOrCtrl+I', click: () => send('menu-action', 'italic') },
        { label: t('menu.format.code'), accelerator: 'CmdOrCtrl+E', click: () => send('menu-action', 'code') },
        { type: 'separator' },
        { label: t('menu.format.list'), accelerator: 'CmdOrCtrl+L', click: () => send('menu-action', 'list') },
        { label: t('menu.format.quote'), accelerator: 'CmdOrCtrl+Shift+Q', click: () => send('menu-action', 'quote') }
      ]
    },
    {
      label: t('menu.view'),
      submenu: [
        { label: t('menu.view.editMode'), accelerator: 'CmdOrCtrl+Shift+E', click: () => send('menu-action', 'view-editor') },
        { label: t('menu.view.preview'), accelerator: 'CmdOrCtrl+Shift+V', click: () => send('menu-action', 'view-preview') },
        { label: t('menu.view.split'), accelerator: 'CmdOrCtrl+Shift+B', click: () => send('menu-action', 'view-split') },
        { type: 'separator' },
        { label: t('menu.view.toggleSidebar'), accelerator: 'CmdOrCtrl+\\', click: () => send('menu-action', 'toggle-sidebar') },
        { label: t('menu.view.darkMode'), accelerator: 'CmdOrCtrl+Shift+D', click: () => send('menu-action', 'toggle-dark') },
        { type: 'separator' },
        { label: t('menu.view.zoomIn'), accelerator: 'CmdOrCtrl+=', click: () => send('menu-action', 'zoom-in') },
        { label: t('menu.view.zoomOut'), accelerator: 'CmdOrCtrl+-', click: () => send('menu-action', 'zoom-out') },
        { type: 'separator' },
        { label: t('menu.view.docInfo'), click: () => send('menu-action', 'show-info') },
        { type: 'separator' },
        { role: 'reload', label: t('menu.view.reload') },
        { role: 'toggleDevTools', label: t('menu.view.devTools') },
        { type: 'separator' },
        { role: 'togglefullscreen', label: t('menu.view.fullscreen') }
      ]
    },
    {
      label: t('menu.language'),
      submenu: [
        {
          label: t('menu.language.es'),
          type: 'radio',
          checked: currentLanguage === 'es',
          click: () => setLanguage('es')
        },
        {
          label: t('menu.language.en'),
          type: 'radio',
          checked: currentLanguage === 'en',
          click: () => setLanguage('en')
        }
      ]
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ---- IPC: estado (título de ventana y aviso de cambios sin guardar) ----
ipcMain.on('set-dirty', (_evt, dirty) => {
  hasUnsavedChanges = dirty;
});

ipcMain.on('set-title', (_evt, title) => {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.setTitle(title);
});

// ---- IPC: operaciones de archivo ----
ipcMain.handle('dialog-open', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: t('dialog.openTitle'),
    properties: ['openFile'],
    filters: [
      { name: t('dialog.filterMarkdownText'), extensions: ['md', 'markdown', 'txt'] },
      { name: t('dialog.filterAllFiles'), extensions: ['*'] }
    ]
  });
  if (result.canceled || !result.filePaths.length) return { cancelled: true };
  const filePath = result.filePaths[0];
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    addRecentFile(filePath);
    return { cancelled: false, filePath, content };
  } catch (err) {
    dialog.showErrorBox(t('dialog.openErrorTitle'), String(err.message || err));
    return { cancelled: true };
  }
});

// Usado por arrastrar-y-soltar: el renderer ya tiene la ruta del archivo
// soltado (File.path) pero no puede leer el disco directamente
// (nodeIntegration desactivado), así que se lo pide al proceso principal.
ipcMain.handle('read-file-path', async (_evt, filePath) => {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    addRecentFile(filePath);
    return { cancelled: false, filePath, content };
  } catch (err) {
    dialog.showErrorBox(t('dialog.openErrorTitle'), String(err.message || err));
    return { cancelled: true };
  }
});

ipcMain.handle('save-file', async (_evt, { content, filePath, saveAs }) => {
  let targetPath = filePath;
  if (saveAs || !targetPath) {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: t('dialog.saveAsTitle'),
      defaultPath: targetPath || t('dialog.defaultFileName'),
      filters: [
        { name: t('dialog.filterMarkdown'), extensions: ['md'] },
        { name: t('dialog.filterPlainText'), extensions: ['txt'] },
        { name: t('dialog.filterAllFiles'), extensions: ['*'] }
      ]
    });
    if (result.canceled || !result.filePath) return { cancelled: true };
    targetPath = result.filePath;
  }
  try {
    fs.writeFileSync(targetPath, content, 'utf-8');
    addRecentFile(targetPath);
    return { cancelled: false, filePath: targetPath };
  } catch (err) {
    dialog.showErrorBox(t('dialog.saveErrorTitle'), String(err.message || err));
    return { cancelled: true };
  }
});

// ---- IPC: exportar a PDF ----
ipcMain.handle('export-pdf', async (_evt, { html, suggestedName }) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: t('dialog.exportPdfTitle'),
    defaultPath: (suggestedName || t('dialog.defaultPdfBaseName')).replace(/\.(md|markdown|txt)$/i, '') + '.pdf',
    filters: [{ name: t('dialog.filterPdf'), extensions: ['pdf'] }]
  });
  if (result.canceled || !result.filePath) return { cancelled: true };

  const pdfWindow = new BrowserWindow({
    show: false,
    webPreferences: { offscreen: true }
  });
  try {
    await pdfWindow.loadURL('data:text/html;charset=UTF-8,' + encodeURIComponent(html));
    const pdfBuffer = await pdfWindow.webContents.printToPDF({
      printBackground: true,
      pageSize: 'Letter',
      margins: { marginType: 'default' }
    });
    fs.writeFileSync(result.filePath, pdfBuffer);
    pdfWindow.destroy();
    return { cancelled: false, filePath: result.filePath };
  } catch (err) {
    pdfWindow.destroy();
    dialog.showErrorBox(t('dialog.pdfErrorTitle'), String(err.message || err));
    return { cancelled: true };
  }
});

ipcMain.handle('print-native', async (_evt, { html }) => {
  const printWindow = new BrowserWindow({ show: false });
  await printWindow.loadURL('data:text/html;charset=UTF-8,' + encodeURIComponent(html));
  printWindow.webContents.print({ printBackground: true }, () => {
    printWindow.destroy();
  });
  return { started: true };
});

ipcMain.handle('show-item-in-folder', (_evt, filePath) => {
  shell.showItemInFolder(filePath);
});

// La versión mostrada en el modal de información viene de aquí, no de un
// texto escrito a mano en el HTML: así nunca queda desincronizada de
// package.json (ver docs/DECISIONS.md).
ipcMain.handle('get-app-version', () => app.getVersion());

// ---- IPC: idioma ----
// Versión síncrona (sendSync) para que el renderer pueda leer el idioma en
// su primera línea de ejecución, antes de pintar nada, y así evitar un
// parpadeo de un idioma al otro. Es la única llamada síncrona de toda la
// app, deliberadamente, solo para este arranque.
ipcMain.on('get-language-sync', (evt) => {
  evt.returnValue = currentLanguage;
});
ipcMain.handle('get-language', () => currentLanguage);
ipcMain.on('set-language', (_evt, lang) => setLanguage(lang));

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
