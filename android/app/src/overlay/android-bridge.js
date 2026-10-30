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
  window.__mdkAds = () => {};

  window.mdk = {
    openFile: () => call((id) => native.openFile(id)).then((res) => { if (!res.cancelled) native.documentOpened(); return res; }),
    openPath: () => Promise.resolve({ cancelled: true }),
    saveFile: (content, filePath, saveAs) =>
      call((id) => native.saveFile(id, content, filePath || '', !!saveAs, S()['dialog.defaultFileName'])),

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
  window.__mdkOpenFile = (payload) => { native.documentOpened(); if (openCb) openCb(payload); else queuedOpen = payload; };

  // Botón «atrás»: cierra un diálogo abierto; si no, guarda lo pendiente y sale (igual que cerrar la ventana).
  window.__mdkBack = () => {
    if (document.querySelector('.modal-overlay:not([hidden])')) {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    } else if (dirty && menuCb) {
      menuCb('save-all-and-quit');
    } else {
      native.quit();
    }
  };

  // En escritorio Guardar/Guardar como viven en el menú nativo; en el teléfono no hay menú.
  const openBtn = document.querySelector('.tabbar [data-action="open"]');
  if (openBtn) {
    const mk = (action, label, title) => {
      const b = document.createElement('button');
      b.className = 'icon-btn icon-btn--text';
      b.dataset.action = action;
      b.title = title;
      b.textContent = label;
      return b;
    };
    openBtn.after(mk('save-as', '⇩…', 'Save as'), mk('save', '💾', 'Save'));

    // Compra única «Quitar anuncios»; solo visible mientras haya anuncios.
    const adsBtn = mk('', '🚫 Ads', '');
    adsBtn.hidden = true;
    adsBtn.addEventListener('click', () => native.buyRemoveAds());
    openBtn.parentNode.querySelector('[data-action="save"]').after(adsBtn);

    // «Privacidad de anuncios» (UMP): solo donde la ley lo exige (EEE / Reino Unido).
    const privBtn = mk('', '🔒', '');
    privBtn.hidden = true;
    privBtn.addEventListener('click', () => native.privacyOptions());
    adsBtn.after(privBtn);

    // Un documento nuevo (pestaña +) también cuenta para el intersticial.
    document.querySelectorAll('[data-action="new-tab"]').forEach((b) => b.addEventListener('click', () => native.documentOpened()));

    window.__mdkAds = (removed, price, privacy) => {
      privBtn.hidden = !privacy;
      privBtn.title = native.getLanguage() === 'es' ? 'Privacidad de anuncios' : 'Ad privacy options';
      adsBtn.hidden = removed;
      const es = native.getLanguage() === 'es';
      adsBtn.title = (es ? 'Quitar anuncios' : 'Remove ads') + (price ? ' · ' + price : '');
      adsBtn.textContent = '🚫 ' + (price || 'Ads');
    };
  }

  // Marca de la versión Android (en Play Store «MDK» ya existe).
  document.title = 'MD Kraft';
  document.querySelectorAll('.brand-name, .modal-card--info .modal-title').forEach((el) => { el.textContent = 'MD Kraft'; });
})();
