const { app, BrowserWindow, Menu, dialog, ipcMain, shell } = require('electron');
const childProcess = require('child_process');
const path = require('path');
const fs = require('fs');
const STRINGS = require('./src/i18n/strings.js');

let mainWindow = null;

// Parpadeo negro en pantalla completa: es un problema conocido de la composición
// por GPU de Chromium en Windows (ciertos drivers, cambios de modo/monitor).
// MDK es un editor de texto: el renderizado por software no se nota y elimina
// el parpadeo. Ver DECISIONS.md #32. Debe llamarse antes de app.whenReady().
app.disableHardwareAcceleration();

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
// Formatos: Markdown y texto siempre son gratis; el resto (código, web, datos) es
// "Pro" en la edición Store. La edición directa (GitHub, winget, portable) los
// tiene todos. La puerta está ABIERTA mientras PRO_GATE_ENABLED sea false (se
// cierra cuando exista el complemento de la Store). Ver DECISIONS.md #37.
const FREE_EXTS = ['md', 'markdown', 'txt'];
const PRO_EXTS = ['html', 'htm', 'css', 'js', 'ts', 'json', 'xml', 'yaml', 'yml', 'csv', 'py', 'java', 'c', 'cpp', 'sql', 'sh', 'svg', 'tsx', 'jsx', 'tex', 'log'];
const ALL_EXTS = FREE_EXTS.concat(PRO_EXTS);
const EDITION = process.windowsStore ? 'store' : 'direct';
const PRO_GATE_ENABLED = true;   // solo afecta a la edición 'store'
const DONATE_URL = 'https://www.paypal.com/donate/?business=X3L55L7U5FXJL&no_recurring=0&item_name=MDK+es+gratis+y+sin+anuncios.+Si+lo+usas+a+diario+y+quieres+que+siga+mejorando%2C+puedes+invitarme+un+caf%C3%A9.&currency_code=USD';

function extOf(p) {
  const m = /\.([A-Za-z0-9]+)$/.exec(String(p || ''));
  return m ? m[1].toLowerCase() : '';
}

function isSupportedDocPath(p) {
  return typeof p === 'string' && ALL_EXTS.indexOf(extOf(p)) !== -1;
}

// ---------- licencia Pro de la edición Store ----------
// El desbloqueo es un complemento (add-on) duradero de la Store con Product ID
// STORE_ADDON_TOKEN. Electron no puede llamar a Windows.Services.Store, así que
// se consulta con un script de Windows PowerShell 5.1 (los procesos hijos de la
// app empaquetada comparten su identidad de paquete). El resultado se guarda en
// mdk-settings.json con fecha: si no hay red, vale hasta 30 días sin reconfirmar.
// Comprar y canjear códigos se hace en la propia Store (enlaces ms-windows-store://).
const STORE_ADDON_TOKEN = 'mdkpro';
const STORE_PRODUCT_ID = '9PKLBD74P3J7';          // ID de la app en la Store
const PRO_OFFLINE_GRACE_MS = 30 * 24 * 3600 * 1000;
let proCache = { pro: false, at: 0 };
try {
  const saved = readSettings().proLicense;
  if (saved && typeof saved.at === 'number') proCache = { pro: !!saved.pro, at: saved.at };
} catch (e) { /* sin caché */ }

const LICENSE_PS = `
$ErrorActionPreference = 'Stop'
try {
  Add-Type -AssemblyName System.Runtime.WindowsRuntime
  [void][Windows.Services.Store.StoreContext, Windows.Services.Store, ContentType=WindowsRuntime]
  $asTask = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
    $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation\`1' })[0]
  function Await($op, $type) {
    $task = $asTask.MakeGenericMethod($type).Invoke($null, @($op))
    [void]$task.Wait(20000)
    if (-not $task.IsCompleted) { throw 'timeout' }
    $task.Result
  }
  $ctx = [Windows.Services.Store.StoreContext]::GetDefault()
  $lic = Await ($ctx.GetAppLicenseAsync()) ([Windows.Services.Store.StoreAppLicense])
  $pro = $false
  foreach ($kv in $lic.AddOnLicenses) {
    if ($kv.Value.InAppOfferToken -eq '${STORE_ADDON_TOKEN}' -and $kv.Value.IsActive) { $pro = $true }
  }
  Write-Output ('{"ok":true,"pro":' + $pro.ToString().ToLower() + '}')
} catch {
  Write-Output ('{"ok":false,"error":"' + ($_.Exception.Message -replace '[\\"\r\n]', ' ') + '"}')
}
`;

function runLicenseCheck() {
  return new Promise((resolve) => {
    const encoded = Buffer.from(LICENSE_PS, 'utf16le').toString('base64');
    childProcess.execFile('powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', encoded],
      { timeout: 30000, windowsHide: true },
      (err, stdout) => {
        if (err) return resolve({ ok: false, error: String(err.message || err) });
        try { resolve(JSON.parse(String(stdout).trim().split(/\r?\n/).pop())); }
        catch (e) { resolve({ ok: false, error: 'respuesta inválida' }); }
      });
  });
}

// Consulta la Store y actualiza la caché. Si la consulta falla (sin red, etc.) no se toca la caché.
let licenseCheckRunning = null;
let lastLicenseError = '';
function refreshProLicense() {
  if (EDITION !== 'store') return Promise.resolve(proCache.pro);
  if (licenseCheckRunning) return licenseCheckRunning;
  licenseCheckRunning = runLicenseCheck().then((res) => {
    licenseCheckRunning = null;
    lastLicenseError = (res && !res.ok && res.error) ? String(res.error) : '';
    if (res && res.ok) {
      const changed = proCache.pro !== !!res.pro;
      proCache = { pro: !!res.pro, at: Date.now() };
      writeSettings({ ...readSettings(), proLicense: proCache });
      if (changed) send('pro-changed', proCache.pro);
    }
    return proCache.pro;
  });
  return licenseCheckRunning;
}

function proUnlocked() {
  if (EDITION === 'direct' || !PRO_GATE_ENABLED) return true;
  return proCache.pro && (Date.now() - proCache.at) < PRO_OFFLINE_GRACE_MS;
}

// Diálogo de MDK Pro (Store): comprar, canjear un código o verificar. Devuelve true si Pro quedó activo.
async function showProDialog() {
  for (;;) {
    const { response } = await dialog.showMessageBox(mainWindow, {
      type: 'info',
      buttons: [t('dialog.proBuy'), t('dialog.proRedeem'), t('dialog.proVerify'), t('dialog.close')],
      defaultId: 0, cancelId: 3, noLink: true,
      title: t('dialog.proTitle'),
      message: t('dialog.proMessage')
    });
    if (response === 0) { shell.openExternal('ms-windows-store://pdp/?ProductId=' + STORE_PRODUCT_ID); return false; }
    if (response === 1) { shell.openExternal('ms-windows-store://redeem'); return false; }
    if (response === 2) {
      if (await refreshProLicense() && proUnlocked()) return true;
      await dialog.showMessageBox(mainWindow, { type: 'info', buttons: [t('dialog.ok')], title: t('dialog.proTitle'), message: t('dialog.proNotFound'), detail: lastLicenseError ? ('Detalle técnico: ' + lastLicenseError) : undefined });
      continue;
    }
    return false;
  }
}

// true si se puede abrir/guardar este archivo; si es un formato Pro sin
// desbloquear, ofrece comprar/canjear y devuelve false (o true si ya lo desbloqueó).
async function ensureProFor(filePath) {
  const ext = extOf(filePath);
  if (!ext || FREE_EXTS.indexOf(ext) !== -1 || proUnlocked()) return true;
  if (await refreshProLicense() && proUnlocked()) return true;   // quizá compró hace un momento
  return showProDialog();
}

function extractFilePathFromArgv(argv) {
  // argv[0] es el ejecutable (o, en desarrollo, el binario de Electron); el
  // resto son argumentos. Se toma el último que parezca una ruta .md/.txt.
  const candidates = argv.filter((a, i) => i > 0 && isSupportedDocPath(a));
  return candidates.length ? candidates[candidates.length - 1] : null;
}

async function openFilePathInRenderer(filePath) {
  if (!filePath) return;
  if (!(await ensureProFor(filePath))) return;
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
  const meta = { ...(settings.recentMeta || {}), [filePath]: Date.now() };
  Object.keys(meta).forEach((k) => { if (recent.indexOf(k) === -1) delete meta[k]; });
  writeSettings({ ...settings, recentFiles: recent, recentMeta: meta });
  buildMenu();
}

// Primera línea con texto del documento, sin marcas de Markdown (para la tarjeta
// de la pantalla de inicio).
function snippetOf(filePath) {
  try {
    const fd = fs.openSync(filePath, 'r');
    const buf = Buffer.alloc(4096);
    const n = fs.readSync(fd, buf, 0, 4096, 0);
    fs.closeSync(fd);
    const lines = buf.toString('utf-8', 0, n).split(/\r?\n/);
    for (const line of lines) {
      const s = line.replace(/^[#>\-*+\s`|]+/, '').trim();
      if (s) return s.length > 90 ? s.slice(0, 90) : s;
    }
  } catch (e) { /* sin permiso o borrado */ }
  return '';
}

function getRecentDetails() {
  const meta = readSettings().recentMeta || {};
  return getRecentFiles().map((p) => ({
    path: p,
    name: path.basename(p),
    time: meta[p] || 0,
    snippet: snippetOf(p)
  }));
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
  writeSettings({ ...readSettings(), recentFiles: [], recentMeta: {} });
  buildMenu();
  send('recents-changed');
}

function removeRecentFile(filePath) {
  const settings = readSettings();
  const recent = (Array.isArray(settings.recentFiles) ? settings.recentFiles : []).filter((p) => p !== filePath);
  const meta = { ...(settings.recentMeta || {}) };
  delete meta[filePath];
  writeSettings({ ...settings, recentFiles: recent, recentMeta: meta });
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
    setupAutoUpdater();
    if (EDITION === 'store' && PRO_GATE_ENABLED) {
      refreshProLicense();
      // Al volver a la ventana (p. ej. tras comprar en la Store) se reconfirma, como máximo cada 20 s.
      let lastFocusCheck = 0;
      mainWindow.on('focus', () => {
        if (proCache.pro || Date.now() - lastFocusCheck < 20000) return;
        lastFocusCheck = Date.now();
        refreshProLicense();
      });
    }
    const initialFilePath = extractFilePathFromArgv(process.argv);
    if (initialFilePath) {
      // Esperar a que el renderer haya terminado de cargar (y por lo tanto ya
      // registró su listener 'open-file') antes de empujarle el archivo.
      mainWindow.webContents.once('did-finish-load', () => openFilePathInRenderer(initialFilePath));
    }
  });
}

// Actualizaciones automáticas (GitHub Releases vía electron-updater). Solo aplican
// a la app instalada (NSIS): la versión portable no puede reemplazarse a sí misma,
// y en desarrollo (npm start) no hay nada que actualizar. Ver DECISIONS.md #33.
// Tampoco aplica a la versión de Microsoft Store (process.windowsStore): ahí actualiza la tienda
// (DECISIONS.md #35).
function setupAutoUpdater() {
  if (!app.isPackaged || process.env.PORTABLE_EXECUTABLE_FILE || process.windowsStore) return;
  let autoUpdater;
  try {
    ({ autoUpdater } = require('electron-updater'));
  } catch (err) {
    return;
  }
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.on('update-downloaded', (info) => {
    const answer = dialog.showMessageBoxSync(mainWindow, {
      type: 'info',
      buttons: [t('update.restartNow'), t('update.later')],
      defaultId: 0,
      cancelId: 1,
      title: t('update.title'),
      message: t('update.message').replace('{version}', info.version),
      detail: t('update.detail')
    });
    if (answer === 0) autoUpdater.quitAndInstall();
  });
  autoUpdater.on('error', () => { /* sin red o sin releases: se ignora en silencio */ });
  autoUpdater.checkForUpdates().catch(() => {});
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

  // Cerrar la ventana con cambios sin guardar: Guardar todo / Salir sin guardar / Cancelar.
  // "Guardar todo" le pide al renderer que guarde cada documento modificado y,
  // si todo se guardó, el renderer llama a quit-now.
  let closePromptOpen = false;
  mainWindow.on('close', (e) => {
    if (!hasUnsavedChanges) return;
    e.preventDefault();
    if (closePromptOpen) return;
    closePromptOpen = true;
    dialog.showMessageBox(mainWindow, {
      type: 'warning',
      buttons: [t('dialog.saveAll'), t('dialog.exitWithoutSaving'), t('dialog.cancel')],
      defaultId: 0,
      cancelId: 2,
      noLink: true,
      title: t('dialog.closeTitle'),
      message: t('dialog.closeMessage')
    }).then(({ response }) => {
      closePromptOpen = false;
      if (response === 0) {
        mainWindow.webContents.send('menu-action', 'save-all-and-quit');
      } else if (response === 1) {
        hasUnsavedChanges = false;
        mainWindow.close();
      }
    });
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
        { label: t('menu.file.home'), click: () => send('menu-action', 'show-start') },
        { type: 'separator' },
        { label: t('menu.file.exportPdf'), accelerator: 'CmdOrCtrl+P', click: () => send('menu-action', 'export-pdf') },
        { label: t('menu.file.print'), accelerator: 'CmdOrCtrl+Shift+P', click: () => send('menu-action', 'print') },
        { type: 'separator' },
        ...(EDITION === 'store' && PRO_GATE_ENABLED ? [{ label: t('menu.file.pro'), click: () => { showProDialog(); } }, { type: 'separator' }] : []),
        ...(EDITION === 'direct' ? [{ label: t('menu.file.donate'), click: () => shell.openExternal(DONATE_URL) }, { type: 'separator' }] : []),
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
        { label: t('menu.view.compare'), accelerator: 'CmdOrCtrl+Shift+C', click: () => send('menu-action', 'show-compare') },
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

// El renderer terminó de guardar todo: cerrar la ventana sin volver a preguntar.
ipcMain.on('quit-now', () => {
  hasUnsavedChanges = false;
  if (mainWindow) mainWindow.close();
});

// Cerrar una pestaña con cambios: diálogo nativo de tres opciones (Guardar / No guardar / Cancelar).
// Devuelve 'save' | 'discard' | 'cancel'. Cerrar el diálogo con Esc o la X cuenta como cancelar.
ipcMain.handle('confirm-close-tab', async (_evt, name) => {
  const { response } = await dialog.showMessageBox(mainWindow, {
    type: 'warning',
    buttons: [t('dialog.save'), t('dialog.discard'), t('dialog.cancel')],
    defaultId: 0,
    cancelId: 2,
    noLink: true,
    title: t('dialog.closeTitle'),
    message: t('dialog.closeTabMessage').replace('{name}', String(name || ''))
  });
  return response === 0 ? 'save' : (response === 1 ? 'discard' : 'cancel');
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
      { name: t('dialog.filterMarkdownText'), extensions: FREE_EXTS },
      { name: t('dialog.filterSupported'), extensions: ALL_EXTS },
      { name: t('dialog.filterAllFiles'), extensions: ['*'] }
    ]
  });
  if (result.canceled || !result.filePaths.length) return { cancelled: true };
  const filePath = result.filePaths[0];
  if (!(await ensureProFor(filePath))) return { cancelled: true };
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
  if (!(await ensureProFor(filePath))) return { cancelled: true };
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    addRecentFile(filePath);
    return { cancelled: false, filePath, content };
  } catch (err) {
    dialog.showErrorBox(t('dialog.openErrorTitle'), String(err.message || err));
    return { cancelled: true };
  }
});

const SAVE_FORMATS = [
  ['HTML', ['html', 'htm']], ['CSS', ['css']], ['JavaScript', ['js']], ['TypeScript', ['ts']],
  ['JSON', ['json']], ['XML', ['xml']], ['YAML', ['yaml', 'yml']], ['CSV', ['csv']],
  ['Python', ['py']], ['Java', ['java']], ['C / C++', ['c', 'cpp']], ['SQL', ['sql']],
  ['Shell', ['sh']], ['SVG', ['svg']], ['React (TSX/JSX)', ['tsx', 'jsx']], ['LaTeX', ['tex']], ['Log', ['log']]
];

ipcMain.handle('save-file', async (_evt, { content, filePath, saveAs }) => {
  let targetPath = filePath;
  if (saveAs || !targetPath) {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: t('dialog.saveAsTitle'),
      defaultPath: targetPath || t('dialog.defaultFileName'),
      filters: [
        { name: t('dialog.filterMarkdown'), extensions: ['md'] },
        { name: t('dialog.filterPlainText'), extensions: ['txt'] },
        ...SAVE_FORMATS.map(([name, exts]) => ({ name, extensions: exts })),
        { name: t('dialog.filterAllFiles'), extensions: ['*'] }
      ]
    });
    if (result.canceled || !result.filePath) return { cancelled: true };
    targetPath = result.filePath;
    if (!(await ensureProFor(targetPath))) return { cancelled: true };
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

// ---- IPC: edición, recientes, donar y vista previa aislada ----
ipcMain.on('get-edition-sync', (evt) => { evt.returnValue = EDITION; });
ipcMain.handle('get-recents', () => getRecentDetails());
ipcMain.handle('remove-recent', (_evt, filePath) => { removeRecentFile(filePath); });
ipcMain.handle('open-donate', () => { if (EDITION === 'direct') shell.openExternal(DONATE_URL); });

// Vista previa de HTML/SVG en una ventana aparte: sin preload (sin acceso a la
// API de MDK ni a Node), en sandbox, con sesión propia y sin permisos, y cargada
// como data: URL (origen opaco: no puede leer archivos locales). Un enlace del
// documento no navega esta ventana ni abre otras.
ipcMain.handle('preview-code', async (_evt, { kind, name, code }) => {
  if (!(await ensureProFor('x.html'))) return { ok: false };
  let page = String(code || '');
  if (kind === 'svg') {
    page = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">' +
      '<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#fff}svg{max-width:100vw;max-height:100vh;height:auto}</style></head><body>' + page + '</body></html>';
  }
  const url = 'data:text/html;base64,' + Buffer.from(page, 'utf-8').toString('base64');
  if (url.length > 1900000) {
    dialog.showErrorBox(t('dialog.previewErrorTitle'), t('dialog.previewTooLarge'));
    return { ok: false };
  }
  const win = new BrowserWindow({
    width: 1000, height: 720, title: (name || 'Preview'),
    autoHideMenuBar: true,
    webPreferences: {
      sandbox: true, contextIsolation: true, nodeIntegration: false,
      partition: 'mdk-preview-' + Date.now()
    }
  });
  win.setMenuBarVisibility(false);
  win.webContents.session.setPermissionRequestHandler((_w, _p, cb) => cb(false));
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (e) => e.preventDefault());
  win.loadURL(url);
  return { ok: true };
});

// ---- IPC: exportar a PDF ----
// Tamaño de hoja personalizado (mm) -> pulgadas (printToPDF) o micras (print).
function pageDimsFrom(page) {
  const w = page && Number(page.widthMm), h = page && Number(page.heightMm);
  if (!(w > 50 && w < 1000 && h > 50 && h < 1000)) return null;
  return { wIn: w / 25.4, hIn: h / 25.4, wMicron: Math.round(w * 1000), hMicron: Math.round(h * 1000) };
}

ipcMain.handle('export-pdf', async (_evt, { html, suggestedName, page }) => {
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
    // Tamaño y márgenes vienen del CSS @page del HTML (preferCSSPageSize);
    // pageSize queda como respaldo.
    const dims = pageDimsFrom(page);
    const pdfBuffer = await pdfWindow.webContents.printToPDF({
      printBackground: true,
      preferCSSPageSize: true,
      pageSize: dims ? { width: dims.wIn, height: dims.hIn } : 'Letter'
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

ipcMain.handle('print-native', async (_evt, { html, page }) => {
  const printWindow = new BrowserWindow({ show: false });
  await printWindow.loadURL('data:text/html;charset=UTF-8,' + encodeURIComponent(html));
  const dims = pageDimsFrom(page);
  const opts = { printBackground: true };
  if (dims) opts.pageSize = { width: dims.wMicron, height: dims.hMicron };
  printWindow.webContents.print(opts, () => {
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
