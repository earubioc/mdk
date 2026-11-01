// Puente Android de MDK: implementa window.mdk (lo que en escritorio hace preload.js)
// sobre la interfaz nativa AndroidMdk de MainActivity. Se carga justo antes de renderer.js.
(function () {
  'use strict';
  const native = window.AndroidMdk;
  window.mdkStrings = module.exports;
  const S = () => window.mdkStrings[native.getLanguage()] || window.mdkStrings.en;

  // Llamadas asíncronas: Java responde con window.__mdkResolve(id, valor).
  const pending = {};
  let nextId = 1;
  window.__mdkResolve = (id, value) => { const r = pending[id]; delete pending[id]; if (r) r(value); };
  const call = (fn) => new Promise((resolve) => { const id = nextId++; pending[id] = resolve; fn(id); });

  let dirty = false;
  let langCb = null, menuCb = null, openCb = null;
  let queuedOpen = null;
  window.__mdkPro = () => {};

  window.mdk = {
    openFile: () => call((id) => native.openFile(id)),
    openPath: () => Promise.resolve({ cancelled: true }),
    saveFile: (content, filePath, saveAs) =>
      call((id) => native.saveFile(id, content, filePath || '', !!saveAs, S()['dialog.defaultFileName'], S()['dialog.saveAsTitle'])),

    setDirty: (d) => { dirty = !!d; },
    setTitle: () => {},
    quitNow: () => native.quit(),
    confirmCloseTab: (name) => call((id) => {
      const s = S();
      native.confirmCloseTab(id, s['dialog.closeTitle'], s['dialog.closeTabMessage'].replace('{name}', String(name || '')),
        s['dialog.save'], s['dialog.discard'], s['dialog.cancel']);
    }),

    exportPdf: (html, name, page) => call((id) =>
      native.print(id, html, String(name || 'MDK').replace(/\.(md|markdown|txt)$/i, ''), (page && page.widthMm) || 0, (page && page.heightMm) || 0)),
    printNative: (html, page) => call((id) => native.print(id, html, 'MDK', (page && page.widthMm) || 0, (page && page.heightMm) || 0)),
    showItemInFolder: () => {},
    getAppVersion: () => Promise.resolve(native.getVersion()),

    getLanguageSync: () => native.getLanguage(),
    getLanguage: () => Promise.resolve(native.getLanguage()),
    setLanguage: (lang) => { native.setLanguage(lang); if (langCb) langCb(lang); },
    onLanguageChanged: (cb) => { langCb = cb; },

    onOpenFile: (cb) => { openCb = cb; if (queuedOpen) { cb(queuedOpen); queuedOpen = null; } },
    onMenuAction: (cb) => { menuCb = cb; }
  };

  // Archivo abierto desde el gestor de archivos (intent VIEW).
  window.__mdkOpenFile = (payload) => {
    if (!payload || payload.cancelled) return;   // p. ej. formato Pro sin desbloquear
    hideHome();
    if (openCb) openCb(payload); else queuedOpen = payload;
  };

  // Botón «atrás»: cierra un diálogo abierto; si no, guarda lo pendiente y sale (igual que cerrar la ventana).
  window.__mdkBack = () => {
    if (homeFromButton && !home.hidden) {
      hideHome();
    } else if (document.querySelector('.modal-overlay:not([hidden])')) {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    } else if (dirty && menuCb) {
      menuCb('save-all-and-quit');
    } else {
      native.quit();
    }
  };

  const es = () => native.getLanguage() === 'es';
  const L = (a, b) => (es() ? a : b);

  // ---------- Barra superior: fila 1 = pestañas + índice; fila 2 = acciones ----------
  const tabbar = document.querySelector('.tabbar');
  const mk = (action, label, title) => {
    const b = document.createElement('button');
    b.className = 'icon-btn icon-btn--text';
    if (action) b.dataset.action = action;
    b.title = title;
    b.textContent = label;
    return b;
  };
  const saveBtn = mk('save', '💾', 'Save');
  const saveAsBtn = mk('save-as', '⇩…', 'Save as');
  const homeBtn = mk('', '🕘', '');
  const proBtn = mk('', '🔓', '');
  const testBtn = mk('', '🧪', '');   // solo en compilaciones de prueba: simula Pro encendido/apagado
  proBtn.hidden = true;
  testBtn.hidden = true;
  proBtn.addEventListener('click', () => native.buyPro());
  testBtn.addEventListener('click', () => native.toggleProTest());
  homeBtn.addEventListener('click', () => showHome(true));

  if (tabbar) {
    const actions = document.createElement('div');
    actions.className = 'tabbar-actions';
    const pick = (sel) => tabbar.querySelector(sel);
    [pick('[data-action="open"]'), saveBtn, saveAsBtn, homeBtn, pick('[data-action="show-skins"]'), proBtn,
      pick('[data-action="toggle-search"]'), pick('#darkToggle'), pick('.zoom-group'),
      pick('#languageToggle'), pick('[data-action="show-info"]'), testBtn]
      .forEach((el) => { if (el) actions.appendChild(el); });
    tabbar.appendChild(actions);
  }

  // MD Kraft Pro: botón de desbloqueo (visible mientras no sea Pro) y, en pruebas, el interruptor.
  window.__mdkPro = (pro, price, testBuild, testOn) => {
    proBtn.hidden = pro;
    proBtn.title = 'MD Kraft Pro' + (price ? ' · ' + price : '');
    proBtn.textContent = '🔓 Pro' + (price ? ' ' + price : '');
    testBtn.hidden = !testBuild;
    testBtn.textContent = '🧪 Pro ' + (testOn ? 'ON' : 'OFF');
  };

  // Vista previa real de HTML (Pro): botón visible solo cuando la pestaña activa es .html/.htm.
  const toolbar = document.querySelector('.app-toolbar');
  const htmlBtn = document.createElement('button');
  htmlBtn.className = 'tool-btn tool-btn--accent html-preview-btn';
  htmlBtn.textContent = '▶ Vista previa';
  htmlBtn.hidden = true;
  let previewKind = null;
  htmlBtn.addEventListener('click', () => {
    const name = (document.querySelector('.tab.is-active .tab-name') || {}).textContent || '';
    native.preview(previewKind, name.replace(/^●\s*/, '').trim(), document.getElementById('editor').value);
  });
  if (toolbar) toolbar.appendChild(htmlBtn);
  const tabsEl = document.getElementById('tabsList');
  const syncHtmlBtn = () => {
    const n = document.querySelector('.tab.is-active .tab-name');
    const ext = n ? (n.textContent.trim().match(/\.([a-z0-9]+)$/i) || [])[1] : '';
    previewKind = { html: 'html', htm: 'html', svg: 'svg', tsx: 'react', jsx: 'react' }[(ext || '').toLowerCase()] || null;
    htmlBtn.hidden = !previewKind;
    htmlBtn.title = L('Previsualizar (HTML, SVG, React)', 'Preview (HTML, SVG, React)');
  };
  if (tabsEl) new MutationObserver(syncHtmlBtn).observe(tabsEl, { childList: true, subtree: true, characterData: true });

  // Zoom flotante (teléfono): dos botoncitos translúcidos en la esquina inferior derecha del documento.
  const workspace = document.querySelector('.workspace');
  if (workspace) {
    const fab = document.createElement('div');
    fab.className = 'zoom-fab';
    fab.innerHTML = '<button data-action="zoom-in" aria-label="+">A+</button><button data-action="zoom-out" aria-label="-">A−</button>';
    workspace.appendChild(fab);
  }

  // ---------- Pantalla de inicio: archivos recientes ----------
  const home = document.createElement('div');
  home.id = 'homeScreen';
  document.body.appendChild(home);
  let homeFromButton = false;

  const KINDS = { md: 'md', markdown: 'md', txt: 'txt', log: 'txt', html: 'web', htm: 'web', css: 'web', js: 'code', ts: 'code',
    json: 'code', xml: 'code', yaml: 'code', yml: 'code', py: 'code', java: 'code', c: 'code', cpp: 'code', sql: 'code', sh: 'code', csv: 'data', tex: 'txt' };
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function ago(ts) {
    const m = Math.max(0, Math.round((Date.now() - ts) / 60000));
    if (m < 1) return L('ahora', 'just now');
    if (m < 60) return L('hace ' + m + ' min', m + ' min ago');
    const h = Math.round(m / 60);
    if (h < 24) return L('hace ' + h + ' h', h + ' h ago');
    const d = Math.round(h / 24);
    if (d === 1) return L('ayer', 'yesterday');
    if (d < 7) return L('hace ' + d + ' días', d + ' days ago');
    return new Date(ts).toLocaleDateString(es() ? 'es' : 'en', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function recents() {
    try { return JSON.parse(native.getRecents()); } catch (e) { return []; }
  }

  function renderHome() {
    const list = recents();
    home.innerHTML =
      '<div class="home-inner">' +
        '<div class="home-head"><div class="home-mark">+</div><div><div class="home-title">MD Kraft</div>' +
        '<div class="home-sub">' + L('Editor de Markdown y texto', 'Markdown and text editor') + '</div></div></div>' +
        '<div class="home-actions">' +
          '<button class="home-btn home-btn--main" id="homeNew">＋ ' + L('Nuevo documento', 'New document') + '</button>' +
          '<button class="home-btn" id="homeOpen">📂 ' + L('Abrir archivo', 'Open file') + '</button>' +
        '</div>' +
        '<div class="home-section">' + L('Recientes', 'Recent') + '</div>' +
        (list.length
          ? '<div class="home-list">' + list.map((r, i) => {
              const ext = (r.name.split('.').pop() || '').toLowerCase();
              const kind = r.name.includes('.') ? (KINDS[ext] || 'txt') : 'txt';
              return '<div class="home-card" data-i="' + i + '">' +
                '<div class="home-badge home-badge--' + kind + '">' + esc(r.name.includes('.') ? ext.slice(0, 4) : 'txt') + '</div>' +
                '<div class="home-body"><div class="home-name">' + esc(r.name) + '</div>' +
                (r.snippet ? '<div class="home-snip">' + esc(r.snippet) + '</div>' : '') +
                '<div class="home-time">' + ago(r.time) + '</div></div>' +
                '<button class="home-del" data-del="' + i + '" title="' + L('Quitar de recientes', 'Remove from recent') + '">×</button></div>';
            }).join('') + '</div>'
          : '<div class="home-empty"><div class="home-empty-ico">🗂️</div>' +
            L('Aún no hay archivos recientes.<br>Abre o guarda un documento y aparecerá aquí.',
              'No recent files yet.<br>Open or save a document and it will show up here.') + '</div>') +
      '</div>';

    home.querySelector('#homeNew').addEventListener('click', () => {
      hideHome();
      if (homeFromButton && menuCb) menuCb('new-tab');
    });
    home.querySelector('#homeOpen').addEventListener('click', () => { hideHome(); if (menuCb) menuCb('open'); });
    home.querySelectorAll('.home-card').forEach((card) => {
      card.addEventListener('click', (e) => {
        const item = list[Number(card.dataset.i)];
        if (e.target.closest('.home-del')) {
          native.removeRecent(item.uri);
          renderHome();
          return;
        }
        call((id) => native.openRecent(id, item.uri)).then((res) => {
          if (res && !res.cancelled) window.__mdkOpenFile(res);
          else renderHome();   // ya no existe o no hay permiso: se quitó de la lista
        });
      });
    });
  }

  function showHome(fromButton) {
    homeFromButton = !!fromButton;
    renderHome();
    home.hidden = false;
  }
  function hideHome() { home.hidden = true; }

  showHome(false);

  // En el teléfono el índice es un panel superpuesto: se cierra al elegir un encabezado.
  const outline = document.getElementById('outlineList');
  if (outline) {
    outline.addEventListener('click', () => {
      const side = document.getElementById('sidebar');
      if (window.innerWidth <= 700 && side && !side.hidden) document.getElementById('sidebarToggle').click();
    });
  }

  // Marca de la versión Android (en Play Store «MDK» ya existe).
  document.title = 'MD Kraft';
  document.querySelectorAll('.brand-name, .modal-card--info .modal-title').forEach((el) => { el.textContent = 'MD Kraft'; });
})();
