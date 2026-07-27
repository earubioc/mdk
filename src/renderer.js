(function () {
  // ---------- i18n ----------
  // Diccionario compartido con main.js, expuesto por preload.js. El idioma
  // inicial se lee de forma SÍNCRONA (sendSync) para que no haya parpadeo de
  // un idioma al otro entre el primer render y la traducción.
  const STRINGS = window.mdkStrings || { es: {}, en: {} };
  let currentLang = (window.mdk && window.mdk.getLanguageSync) ? window.mdk.getLanguageSync() : 'en';

  function t(key, vars) {
    const dict = STRINGS[currentLang] || STRINGS.en || {};
    let str = dict[key] != null ? dict[key] : ((STRINGS.en && STRINGS.en[key]) || key);
    if (vars) {
      Object.keys(vars).forEach((k) => {
        str = str.replace('{' + k + '}', vars[k]);
      });
    }
    return str;
  }

  function applyStaticTranslations() {
    document.documentElement.lang = currentLang;
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      el.textContent = t(el.dataset.i18n);
    });
    document.querySelectorAll('[data-i18n-title]').forEach((el) => {
      el.title = t(el.dataset.i18nTitle);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      el.placeholder = t(el.dataset.i18nPlaceholder);
    });
    const langBtn = document.getElementById('languageToggle');
    if (langBtn) langBtn.textContent = currentLang.toUpperCase();
  }

  const editor = document.getElementById('editor');
  const editorPane = document.querySelector('.pane--editor');
  const previewPane = document.getElementById('previewPane');
  const preview = document.getElementById('preview');
  const paneDivider = document.getElementById('paneDivider');
  const workspace = document.querySelector('.workspace');
  const statusPath = document.getElementById('statusPath');
  const statusCounts = document.getElementById('statusCounts');
  const statusSaved = document.getElementById('statusSaved');

  const tabsList = document.getElementById('tabsList');
  const sidebar = document.getElementById('sidebar');
  const outlineList = document.getElementById('outlineList');
  const outlineEmpty = document.getElementById('outlineEmpty');

  const searchBar = document.getElementById('searchBar');
  const searchInput = document.getElementById('searchInput');
  const searchStatus = document.getElementById('searchStatus');

  const zoomLabel = document.getElementById('zoomLabel');
  const darkToggleBtn = document.getElementById('darkToggle');
  const languageToggleBtn = document.getElementById('languageToggle');

  const infoModal = document.getElementById('infoModal');
  const infoWords = document.getElementById('infoWords');
  const infoChars = document.getElementById('infoChars');
  const infoLines = document.getElementById('infoLines');
  const infoTokens = document.getElementById('infoTokens');
  const modalVersion = document.getElementById('modalVersion');
  const infoNewsList = document.getElementById('infoNewsList');

  let appVersion = '';

  // Resumen corto de las últimas versiones, mostrado en el modal de
  // información (columna derecha, "Novedades"/"What's new"). El texto vive
  // en src/i18n/strings.js (claves "changelog.X.Y.Z"); mantenerlo en sync
  // con CHANGELOG.md en la raíz del proyecto, que tiene el detalle completo.
  const CHANGELOG = [
    { version: '2.6.1', textKey: 'changelog.2.6.1' },
    { version: '2.6.0', textKey: 'changelog.2.6.0' },
    { version: '2.5.1', textKey: 'changelog.2.5.1' },
    { version: '2.5.0', textKey: 'changelog.2.5.0' },
    { version: '2.4.0', textKey: 'changelog.2.4.0' },
    { version: '2.3.1', textKey: 'changelog.2.3.1' },
    { version: '2.3.0', textKey: 'changelog.2.3.0' },
    { version: '2.2.0', textKey: 'changelog.2.2.0' },
    { version: '2.1.0', textKey: 'changelog.2.1.0' },
    { version: '2.0.0', textKey: 'changelog.2.0.0' },
    { version: '1.0.0', textKey: 'changelog.1.0.0' }
  ];

  const skinsModal = document.getElementById('skinsModal');
  const skinGrid = document.getElementById('skinGrid');
  const customAccent = document.getElementById('customAccent');
  const customDark = document.getElementById('customDark');
  const customBg = document.getElementById('customBg');
  const customDisplayFont = document.getElementById('customDisplayFont');
  const customBodyFont = document.getElementById('customBodyFont');

  // ---------- skins (presets de color + tipografía) ----------
  // Nada de esto está fijo en el CSS: cada skin es un conjunto de variables
  // CSS que se aplican en tiempo real sobre <html>, así que cualquier
  // combinación (incluida "Personalizado"/"Custom") reemplaza al manual de
  // marca VDC sin tocar código. Ver docs/DESIGN-SYSTEM.md. label/hint se
  // resuelven vía i18n (labelKey/hintKey), no como texto fijo.
  const SKINS = {
    vdc: {
      labelKey: 'skins.vdc.label',
      hintKey: 'skins.vdc.hint',
      accent: '#C0392B', dark: '#222222', mid: '#4A4A4A', light: '#888888',
      rule: '#DEDEDE', bg: '#F4F3F1', white: '#FFFFFF',
      fontDisplay: "'Bebas Neue', 'Segoe UI Semibold', Arial, sans-serif",
      fontCondensed: "'Barlow Condensed', 'Segoe UI Semibold', Arial, sans-serif",
      fontBody: "'Barlow', 'Segoe UI', Arial, sans-serif",
      fontMono: "'Cascadia Code', 'Consolas', 'SFMono-Regular', Menlo, monospace"
    },
    generic: {
      labelKey: 'skins.generic.label',
      hintKey: 'skins.generic.hint',
      accent: '#5B5B5B', dark: '#2B2B2B', mid: '#5F5F5F', light: '#9A9A9A',
      rule: '#DDDDDD', bg: '#F2F2F2', white: '#FFFFFF',
      fontDisplay: "'Segoe UI', Arial, sans-serif",
      fontCondensed: "'Segoe UI', Arial, sans-serif",
      fontBody: "'Segoe UI', Arial, sans-serif",
      fontMono: "'Consolas', 'Courier New', monospace"
    },
    ocean: {
      labelKey: 'skins.ocean.label',
      hintKey: 'skins.ocean.hint',
      accent: '#1F6F8B', dark: '#1B2733', mid: '#455A6B', light: '#8CA0AC',
      rule: '#D8E2E8', bg: '#EFF4F6', white: '#FFFFFF',
      fontDisplay: "Georgia, 'Times New Roman', serif",
      fontCondensed: "'Segoe UI', Arial, sans-serif",
      fontBody: "'Segoe UI', Arial, sans-serif",
      fontMono: "'Consolas', monospace"
    },
    forest: {
      labelKey: 'skins.forest.label',
      hintKey: 'skins.forest.hint',
      accent: '#2E6B4F', dark: '#20291F', mid: '#4B5A47', light: '#889284',
      rule: '#DCE3D8', bg: '#F1F4EF', white: '#FFFFFF',
      fontDisplay: "'Bebas Neue', 'Segoe UI Semibold', Arial, sans-serif",
      fontCondensed: "'Barlow Condensed', 'Segoe UI Semibold', Arial, sans-serif",
      fontBody: "'Barlow', 'Segoe UI', Arial, sans-serif",
      fontMono: "'Consolas', monospace"
    }
  };

  let currentSkin = null; // { id, ...propiedades del skin activo }

  function applySkin(skin) {
    const root = document.documentElement.style;
    root.setProperty('--red', skin.accent);
    root.setProperty('--dark', skin.dark);
    root.setProperty('--mid', skin.mid);
    root.setProperty('--light', skin.light);
    root.setProperty('--rule', skin.rule);
    root.setProperty('--bg', skin.bg);
    root.setProperty('--white', skin.white);
    root.setProperty('--font-display', skin.fontDisplay);
    root.setProperty('--font-condensed', skin.fontCondensed);
    root.setProperty('--font-body', skin.fontBody);
    root.setProperty('--font-mono', skin.fontMono);
    currentSkin = skin;
  }

  function saveSkinPreference(id, skin) {
    localStorage.setItem('mdk.skinId', id);
    if (id === 'custom') localStorage.setItem('mdk.customSkin', JSON.stringify(skin));
  }

  function loadSkinPreference() {
    const savedId = localStorage.getItem('mdk.skinId');
    if (savedId === 'custom') {
      const raw = localStorage.getItem('mdk.customSkin');
      if (raw) {
        try {
          const custom = JSON.parse(raw);
          applySkin(custom);
          return 'custom';
        } catch (e) { /* JSON corrupto: sigue al valor por defecto */ }
      }
    }
    if (savedId && SKINS[savedId]) {
      applySkin(SKINS[savedId]);
      return savedId;
    }
    applySkin(SKINS.vdc);
    return 'vdc';
  }

  let activeSkinId = 'vdc';

  function renderSkinGrid() {
    skinGrid.innerHTML = '';
    Object.keys(SKINS).forEach((id) => {
      const skin = SKINS[id];
      const btn = document.createElement('button');
      btn.className = 'skin-swatch' + (id === activeSkinId ? ' is-active' : '');
      btn.type = 'button';

      const dot = document.createElement('span');
      dot.className = 'skin-swatch-dot';
      dot.style.background = skin.accent;

      const label = document.createElement('span');
      label.className = 'skin-swatch-label';
      const small = document.createElement('small');
      small.textContent = t(skin.hintKey);
      label.textContent = t(skin.labelKey) + ' ';
      label.appendChild(small);

      btn.appendChild(dot);
      btn.appendChild(label);
      btn.addEventListener('click', () => {
        activeSkinId = id;
        applySkin(skin);
        saveSkinPreference(id, skin);
        populateCustomFields(skin);
        renderSkinGrid();
      });
      skinGrid.appendChild(btn);
    });
  }

  function populateCustomFields(skin) {
    customAccent.value = skin.accent;
    customDark.value = skin.dark;
    customBg.value = skin.bg;
    customDisplayFont.value = skin.fontDisplay;
    customBodyFont.value = skin.fontBody;
  }

  function showSkinsModal() {
    renderSkinGrid();
    populateCustomFields(currentSkin);
    skinsModal.hidden = false;
  }

  function hideSkinsModal() { skinsModal.hidden = true; }

  function applyCustomSkin() {
    // Deriva mid/light/rule automáticamente a partir del color de texto y
    // fondo elegidos, para no obligar al usuario a escoger siete colores.
    const dark = customDark.value;
    const bg = customBg.value;
    const custom = {
      labelKey: 'skins.custom.label',
      hintKey: 'skins.custom.hint',
      accent: customAccent.value,
      dark,
      mid: mixHex(dark, '#808080', 0.35),
      light: mixHex(dark, '#FFFFFF', 0.55),
      rule: mixHex(bg, '#000000', 0.12),
      bg,
      white: '#FFFFFF',
      fontDisplay: customDisplayFont.value,
      fontCondensed: customBodyFont.value,
      fontBody: customBodyFont.value,
      fontMono: "'Consolas', 'Courier New', monospace"
    };
    activeSkinId = 'custom';
    applySkin(custom);
    saveSkinPreference('custom', custom);
    renderSkinGrid();
  }

  function mixHex(hexA, hexB, weightB) {
    const a = hexToRgb(hexA);
    const b = hexToRgb(hexB);
    const mix = (x, y) => Math.round(x + (y - x) * weightB);
    return rgbToHex(mix(a.r, b.r), mix(a.g, b.g), mix(a.b, b.b));
  }

  function hexToRgb(hex) {
    const clean = hex.replace('#', '');
    const num = parseInt(clean.length === 3
      ? clean.split('').map((c) => c + c).join('')
      : clean, 16);
    return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
  }

  function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('');
  }

  // ---------- idioma: selector en la interfaz ----------

  function applyLanguage(lang) {
    currentLang = lang;
    applyStaticTranslations();
    renderTabs();
    updateTitleAndStatus();
    if (sidebarVisible) updateOutline();
    if (!skinsModal.hidden) renderSkinGrid();
    if (!infoModal.hidden) { renderChangelog(); }
    if (modalVersion && appVersion) modalVersion.textContent = t('info.versionLabel') + ' ' + appVersion;
  }

  function toggleLanguage() {
    const next = currentLang === 'es' ? 'en' : 'es';
    if (window.mdk && window.mdk.setLanguage) window.mdk.setLanguage(next);
    applyLanguage(next); // aplica de inmediato en esta ventana sin esperar el IPC de vuelta
  }

  if (window.mdk && window.mdk.onLanguageChanged) {
    window.mdk.onLanguageChanged((lang) => applyLanguage(lang));
  }

  // ---------- estado global de la app ----------

  // Tres modos exclusivos: 'editor', 'preview' o 'split' (los dos a la vez).
  // Un solo botón por modo, un solo clic para pasar de cualquiera a
  // cualquiera — más simple que dos botones independientes (ver
  // DECISIONS.md sobre por qué se cambió).
  let viewMode = localStorage.getItem('mdk.viewMode') || 'editor';
  if (['editor', 'preview', 'split'].indexOf(viewMode) === -1) viewMode = 'editor';
  let splitWidth = parseInt(localStorage.getItem('mdk.splitWidth'), 10) || null;
  let sidebarVisible = false;
  let searchVisible = false;
  let darkMode = localStorage.getItem('mdk.darkMode') === '1';
  let zoomPx = parseInt(localStorage.getItem('mdk.zoomPx'), 10) || 16;

  // ---------- modelo de documentos (pestañas) ----------

  let documents = []; // { id, filePath, content, isDirty }
  let activeId = null;
  let nextId = 1;

  function createDocument(content = '', filePath = null) {
    const doc = { id: nextId++, filePath, content, isDirty: false };
    documents.push(doc);
    return doc;
  }

  function getActiveDoc() {
    return documents.find((d) => d.id === activeId) || null;
  }

  function saveEditorIntoActiveDoc() {
    const doc = getActiveDoc();
    if (doc) doc.content = editor.value;
  }

  function fileBaseName(filePath) {
    return filePath ? filePath.split(/[\\/]/).pop() : t('status.untitled');
  }

  function renderTabs() {
    tabsList.innerHTML = '';
    documents.forEach((doc) => {
      const tab = document.createElement('div');
      tab.className = 'tab' + (doc.id === activeId ? ' is-active' : '');

      const name = document.createElement('span');
      name.className = 'tab-name';
      name.textContent = (doc.isDirty ? '● ' : '') + fileBaseName(doc.filePath);

      const closeBtn = document.createElement('button');
      closeBtn.className = 'tab-close';
      closeBtn.title = t('tabbar.closeTabTitle');
      closeBtn.textContent = '×';
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeDocument(doc.id);
      });

      tab.appendChild(name);
      tab.appendChild(closeBtn);
      tab.addEventListener('click', () => switchToDocument(doc.id));
      tabsList.appendChild(tab);
    });
  }

  function switchToDocument(id) {
    if (id === activeId) return;
    saveEditorIntoActiveDoc();
    activeId = id;
    const doc = getActiveDoc();
    editor.value = doc ? doc.content : '';
    renderTabs();
    refreshAll();
  }

  function doNewTab() {
    saveEditorIntoActiveDoc();
    const doc = createDocument();
    activeId = doc.id;
    editor.value = '';
    renderTabs();
    refreshAll();
    if (viewMode === 'editor' || viewMode === 'split') editor.focus();
  }

  function closeDocument(id) {
    const idx = documents.findIndex((d) => d.id === id);
    if (idx === -1) return;
    const doc = documents[idx];
    if (doc.id === activeId) saveEditorIntoActiveDoc();

    if (doc.isDirty) {
      const name = fileBaseName(doc.filePath);
      const ok = window.confirm(t('confirm.closeTabDirty', { name }));
      if (!ok) return;
    }

    documents.splice(idx, 1);
    if (documents.length === 0) {
      const fresh = createDocument();
      activeId = fresh.id;
    } else if (doc.id === activeId) {
      const next = documents[Math.max(0, idx - 1)] || documents[0];
      activeId = next.id;
    }
    editor.value = getActiveDoc().content;
    renderTabs();
    refreshAll();
    syncDirtyToMain();
  }

  // ---------- helpers: selección de líneas y formato ----------

  function getSelectedLineRange() {
    const value = editor.value;
    let start = editor.selectionStart;
    let end = editor.selectionEnd;

    while (start > 0 && value[start - 1] !== '\n') start--;
    while (end < value.length && value[end] !== '\n') end++;

    return { start, end, text: value.slice(start, end) };
  }

  function replaceRange(start, end, newText) {
    const value = editor.value;
    editor.value = value.slice(0, start) + newText + value.slice(end);
    editor.selectionStart = start;
    editor.selectionEnd = start + newText.length;
    editor.focus();
    onEditorChanged();
  }

  function toggleHeading(level) {
    const { start, end, text } = getSelectedLineRange();
    const prefix = level > 0 ? '#'.repeat(level) + ' ' : '';
    const lines = text.split('\n').map((line) => {
      const stripped = line.replace(/^\s*#{1,6}\s+/, '');
      if (level === 0) return stripped;
      const currentLevelMatch = line.match(/^\s*(#{1,6})\s+/);
      const alreadyThisLevel = currentLevelMatch && currentLevelMatch[1].length === level;
      return alreadyThisLevel ? stripped : prefix + stripped;
    });
    replaceRange(start, end, lines.join('\n'));
  }

  function toggleLinePrefix(markerRegex, marker) {
    const { start, end, text } = getSelectedLineRange();
    const lines = text.split('\n');
    const allPrefixed = lines.every((l) => markerRegex.test(l) || l.trim() === '');
    const result = lines.map((line) => {
      if (line.trim() === '') return line;
      if (allPrefixed) return line.replace(markerRegex, '');
      return markerRegex.test(line) ? line : marker + line;
    });
    replaceRange(start, end, result.join('\n'));
  }

  function toggleWrap(marker) {
    let start = editor.selectionStart;
    let end = editor.selectionEnd;
    const value = editor.value;
    if (start === end) {
      const insert = marker + marker;
      replaceRange(start, end, insert);
      editor.selectionStart = start + marker.length;
      editor.selectionEnd = start + marker.length;
      return;
    }
    const selected = value.slice(start, end);
    const before = value.slice(Math.max(0, start - marker.length), start);
    const after = value.slice(end, end + marker.length);
    if (before === marker && after === marker) {
      replaceRange(start - marker.length, end + marker.length, selected);
    } else if (selected.startsWith(marker) && selected.endsWith(marker) && selected.length >= marker.length * 2) {
      replaceRange(start, end, selected.slice(marker.length, selected.length - marker.length));
    } else {
      replaceRange(start, end, marker + selected + marker);
    }
  }

  function insertLink() {
    let start = editor.selectionStart;
    let end = editor.selectionEnd;
    const selected = editor.value.slice(start, end) || t('link.defaultText');
    replaceRange(start, end, `[${selected}](https://)`);
  }

  // ---------- vista: editor / vista previa / dividida ----------

  function applySplitWidth() {
    if (viewMode === 'split' && splitWidth) {
      editorPane.style.flex = '0 0 ' + splitWidth + 'px';
    } else {
      editorPane.style.flex = '';
    }
  }

  function setViewMode(mode) {
    viewMode = mode;
    const showEditor = mode === 'editor' || mode === 'split';
    const showPreview = mode === 'preview' || mode === 'split';
    editorPane.hidden = !showEditor;
    previewPane.hidden = !showPreview;
    paneDivider.hidden = mode !== 'split';
    document.querySelector('[data-action="view-editor"]').classList.toggle('is-active', mode === 'editor');
    document.querySelector('[data-action="view-preview"]').classList.toggle('is-active', mode === 'preview');
    document.querySelector('[data-action="view-split"]').classList.toggle('is-active', mode === 'split');
    applySplitWidth();
    if (showPreview) updatePreview();
    if (showEditor) editor.focus();
    localStorage.setItem('mdk.viewMode', mode);
  }

  // Garantiza que el editor esté visible sin perder la vista previa si ya
  // estaba encendida (usado por buscar, saltar a un encabezado, etc.).
  function ensureEditorVisible() {
    if (viewMode === 'preview') setViewMode('split');
  }

  // Arrastrar la línea divisoria entre Editor y Vista previa (solo activa en
  // modo 'split'). El ancho se guarda en localStorage y se restaura entre
  // sesiones.
  function initPaneDivider() {
    let dragging = false;

    paneDivider.addEventListener('mousedown', (e) => {
      if (viewMode !== 'split') return;
      dragging = true;
      paneDivider.classList.add('is-dragging');
      document.body.style.cursor = 'col-resize';
      e.preventDefault();
    });

    window.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      const rect = workspace.getBoundingClientRect();
      const sidebarWidth = sidebarVisible ? sidebar.offsetWidth : 0;
      const minPane = 240;
      let newWidth = e.clientX - rect.left - sidebarWidth;
      const maxWidth = rect.width - sidebarWidth - minPane - paneDivider.offsetWidth;
      newWidth = Math.max(minPane, Math.min(maxWidth, newWidth));
      splitWidth = newWidth;
      editorPane.style.flex = '0 0 ' + newWidth + 'px';
    });

    window.addEventListener('mouseup', () => {
      if (!dragging) return;
      dragging = false;
      paneDivider.classList.remove('is-dragging');
      document.body.style.cursor = '';
      if (splitWidth) localStorage.setItem('mdk.splitWidth', String(splitWidth));
    });
  }

  function updatePreview() {
    if (viewMode !== 'preview' && viewMode !== 'split') return;
    preview.innerHTML = window.MDKMarkdown.render(editor.value);
  }

  // ---------- índice / estructura del documento ----------

  function toggleSidebar(force) {
    sidebarVisible = typeof force === 'boolean' ? force : !sidebarVisible;
    sidebar.hidden = !sidebarVisible;
    document.getElementById('sidebarToggle').classList.toggle('is-active', sidebarVisible);
    localStorage.setItem('mdk.sidebarVisible', sidebarVisible ? '1' : '0');
    if (sidebarVisible) updateOutline();
  }

  function updateOutline() {
    if (!sidebarVisible) return;
    const lines = editor.value.split('\n');
    outlineList.innerHTML = '';
    let has = false;
    lines.forEach((line, idx) => {
      const m = line.match(/^(#{1,6})\s+(.*)$/);
      if (!m) return;
      has = true;
      const level = m[1].length;
      const item = document.createElement('div');
      item.className = `outline-item outline-h${level}`;
      item.textContent = m[2].trim();
      item.title = m[2].trim();
      item.addEventListener('click', () => jumpToLine(idx));
      outlineList.appendChild(item);
    });
    outlineEmpty.hidden = has;
  }

  function jumpToLine(lineIndex) {
    ensureEditorVisible();
    const lines = editor.value.split('\n');
    let pos = 0;
    for (let i = 0; i < lineIndex; i++) pos += lines[i].length + 1;
    const lineLength = lines[lineIndex] ? lines[lineIndex].length : 0;
    editor.focus();
    editor.selectionStart = pos;
    editor.selectionEnd = pos + lineLength;
    const lineHeight = parseFloat(getComputedStyle(editor).lineHeight) || 20;
    editor.scrollTop = Math.max(0, lineIndex * lineHeight - editor.clientHeight / 2);
  }

  // ---------- búsqueda ----------

  function toggleSearch(force) {
    searchVisible = typeof force === 'boolean' ? force : !searchVisible;
    searchBar.hidden = !searchVisible;
    if (searchVisible) {
      searchInput.focus();
      searchInput.select();
    } else {
      editor.focus();
    }
  }

  function findNext(direction) {
    const term = searchInput.value;
    if (!term) { searchStatus.textContent = ''; return; }
    const text = editor.value;
    const lowerText = text.toLowerCase();
    const lowerTerm = term.toLowerCase();
    const totalMatches = lowerText.split(lowerTerm).length - 1;

    if (totalMatches === 0) {
      searchStatus.textContent = t('search.noResults');
      return;
    }

    let idx;
    if (direction >= 0) {
      idx = lowerText.indexOf(lowerTerm, editor.selectionEnd);
      if (idx === -1) idx = lowerText.indexOf(lowerTerm, 0);
    } else {
      const searchFrom = Math.max(0, editor.selectionStart - 1);
      idx = lowerText.lastIndexOf(lowerTerm, searchFrom - 1);
      if (idx === -1) idx = lowerText.lastIndexOf(lowerTerm);
    }
    if (idx === -1) return;

    ensureEditorVisible();
    editor.focus();
    editor.selectionStart = idx;
    editor.selectionEnd = idx + term.length;
    const linesBefore = text.slice(0, idx).split('\n').length - 1;
    const lineHeight = parseFloat(getComputedStyle(editor).lineHeight) || 20;
    editor.scrollTop = Math.max(0, linesBefore * lineHeight - editor.clientHeight / 2);
    const matchWord = totalMatches === 1 ? t('search.matchSingular') : t('search.matchPlural');
    searchStatus.textContent = `${totalMatches} ${matchWord}`;
  }

  // ---------- zoom ----------

  function applyZoom() {
    editor.style.fontSize = zoomPx + 'px';
    preview.style.fontSize = Math.round(zoomPx * 0.94) + 'px';
    zoomLabel.textContent = zoomPx + 'px';
    localStorage.setItem('mdk.zoomPx', String(zoomPx));
  }

  function zoomIn() { zoomPx = Math.min(28, zoomPx + 1); applyZoom(); }
  function zoomOut() { zoomPx = Math.max(10, zoomPx - 1); applyZoom(); }

  // ---------- modo oscuro ----------

  function applyDarkMode() {
    document.body.classList.toggle('dark-mode', darkMode);
    darkToggleBtn.classList.toggle('is-active', darkMode);
    darkToggleBtn.textContent = darkMode ? '☀' : '☾';
    localStorage.setItem('mdk.darkMode', darkMode ? '1' : '0');
  }

  function toggleDarkMode() { darkMode = !darkMode; applyDarkMode(); }

  // ---------- modal de información ----------

  function computeStats() {
    const text = editor.value;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const chars = text.length;
    const lines = text.length ? text.split('\n').length : 0;
    const tokens = Math.round(chars / 4);
    return { words, chars, lines, tokens };
  }

  function renderChangelog() {
    infoNewsList.innerHTML = '';
    CHANGELOG.forEach((entry) => {
      const item = document.createElement('div');
      item.className = 'info-news-item';

      const version = document.createElement('span');
      version.className = 'info-news-version';
      version.textContent = 'v' + entry.version;

      const text = document.createElement('span');
      text.className = 'info-news-text';
      text.textContent = t(entry.textKey);

      item.appendChild(version);
      item.appendChild(text);
      infoNewsList.appendChild(item);
    });
  }

  const numberLocale = { es: 'es-CO', en: 'en-US' };

  function showInfoModal() {
    const { words, chars, lines, tokens } = computeStats();
    const locale = numberLocale[currentLang] || 'en-US';
    infoWords.textContent = words.toLocaleString(locale);
    infoChars.textContent = chars.toLocaleString(locale);
    infoLines.textContent = lines.toLocaleString(locale);
    infoTokens.textContent = '~' + tokens.toLocaleString(locale);
    renderChangelog();
    infoModal.hidden = false;
  }

  function hideInfoModal() { infoModal.hidden = true; }

  // ---------- action dispatch ----------

  function runAction(action) {
    switch (action) {
      case 'h1': toggleHeading(1); break;
      case 'h2': toggleHeading(2); break;
      case 'h3': toggleHeading(3); break;
      case 'p': toggleHeading(0); break;
      case 'bold': toggleWrap('**'); break;
      case 'italic': toggleWrap('*'); break;
      case 'code': toggleWrap('`'); break;
      case 'list': toggleLinePrefix(/^\s*[-*+]\s+/, '- '); break;
      case 'quote': toggleLinePrefix(/^\s*>\s?/, '> '); break;
      case 'link': insertLink(); break;
      case 'view-editor': setViewMode('editor'); break;
      case 'view-preview': setViewMode('preview'); break;
      case 'view-split': setViewMode('split'); break;
      case 'new-tab': doNewTab(); break;
      case 'close-tab': closeDocument(activeId); break;
      case 'open': doOpen(); break;
      case 'save': doSave(false); break;
      case 'save-as': doSave(true); break;
      case 'export-pdf': doExportPdf(); break;
      case 'print': doPrintNative(); break;
      case 'toggle-sidebar': toggleSidebar(); break;
      case 'toggle-search': toggleSearch(); break;
      case 'search-next': findNext(1); break;
      case 'search-prev': findNext(-1); break;
      case 'search-close': toggleSearch(false); break;
      case 'zoom-in': zoomIn(); break;
      case 'zoom-out': zoomOut(); break;
      case 'toggle-dark': toggleDarkMode(); break;
      case 'toggle-language': toggleLanguage(); break;
      case 'show-info': showInfoModal(); break;
      case 'hide-info': hideInfoModal(); break;
      case 'show-skins': showSkinsModal(); break;
      case 'hide-skins': hideSkinsModal(); break;
      case 'reset-skin': {
        activeSkinId = 'vdc';
        applySkin(SKINS.vdc);
        saveSkinPreference('vdc');
        renderSkinGrid();
        populateCustomFields(SKINS.vdc);
        break;
      }
      case 'apply-custom-skin': applyCustomSkin(); break;
      default: break;
    }
  }

  document.querySelectorAll('[data-action]').forEach((btn) => {
    btn.addEventListener('click', () => runAction(btn.dataset.action));
  });

  if (window.mdk && window.mdk.onMenuAction) {
    window.mdk.onMenuAction(runAction);
  }

  infoModal.addEventListener('click', (e) => {
    if (e.target === infoModal) hideInfoModal();
  });

  skinsModal.addEventListener('click', (e) => {
    if (e.target === skinsModal) hideSkinsModal();
  });

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      findNext(e.shiftKey ? -1 : 1);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      toggleSearch(false);
    }
  });

  // Nota: todos los atajos con Ctrl/Cmd (encabezados, negrita, zoom, buscar,
  // pestañas, modo oscuro, índice…) se manejan una sola vez, vía los
  // aceleradores del menú nativo en main.js -> IPC 'menu-action' -> runAction().
  // No se duplican aquí para evitar que una misma pulsación dispare la acción
  // dos veces (p. ej. aplicar y deshacer negrita en el mismo golpe de tecla).

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!infoModal.hidden) hideInfoModal();
    if (!skinsModal.hidden) hideSkinsModal();
  });

  // ---------- estado, título y contadores ----------

  function updateTitleAndStatus() {
    const doc = getActiveDoc();
    const name = fileBaseName(doc ? doc.filePath : null);
    const dirtyMark = doc && doc.isDirty ? '● ' : '';
    const title = `${dirtyMark}${name} · MDK`;
    if (window.mdk && window.mdk.setTitle) window.mdk.setTitle(title);

    statusPath.textContent = doc && doc.filePath ? doc.filePath : t('status.untitled');
    const words = editor.value.trim() ? editor.value.trim().split(/\s+/).length : 0;
    const lineCount = editor.value.length ? editor.value.split('\n').length : 0;
    statusCounts.textContent = t('status.wordsAndLines', { words, lines: lineCount });
    statusSaved.textContent = doc && doc.isDirty ? t('status.unsaved') : t('status.saved');
    statusSaved.classList.toggle('is-dirty', !!(doc && doc.isDirty));
  }

  function syncDirtyToMain() {
    const anyDirty = documents.some((d) => d.isDirty);
    if (window.mdk && window.mdk.setDirty) window.mdk.setDirty(anyDirty);
  }

  function refreshAll() {
    updateTitleAndStatus();
    updatePreview();
    updateOutline();
  }

  function onEditorChanged() {
    const doc = getActiveDoc();
    if (doc) {
      doc.content = editor.value;
      doc.isDirty = true;
    }
    renderTabs();
    refreshAll();
    syncDirtyToMain();
  }

  editor.addEventListener('input', onEditorChanged);

  // ---------- operaciones de archivo ----------

  // Carga contenido ya leído (de un diálogo, de doble clic en un .md, o de
  // arrastrar un archivo a la ventana) en una pestaña: reutiliza la pestaña
  // activa si está vacía y sin título, si no, abre una nueva.
  function loadFileIntoWorkspace(filePath, content) {
    saveEditorIntoActiveDoc();
    const active = getActiveDoc();
    let doc;
    if (active && !active.filePath && !active.isDirty && active.content === '') {
      doc = active;
      doc.filePath = filePath;
      doc.content = content;
      doc.isDirty = false;
    } else {
      doc = createDocument(content, filePath);
    }
    activeId = doc.id;
    editor.value = doc.content;
    renderTabs();
    refreshAll();
    syncDirtyToMain();
  }

  async function doOpen() {
    const result = await window.mdk.openFile();
    if (result.cancelled) return;
    loadFileIntoWorkspace(result.filePath, result.content);
  }

  // Abre un archivo a partir de su ruta en disco (arrastrar y soltar, o un
  // .md abierto por asociación/doble clic mientras MDK ya está corriendo).
  async function openExternalPath(filePath) {
    if (!window.mdk || !window.mdk.openPath) return;
    const result = await window.mdk.openPath(filePath);
    if (result.cancelled) return;
    loadFileIntoWorkspace(result.filePath, result.content);
  }

  async function doSave(saveAs) {
    saveEditorIntoActiveDoc();
    const doc = getActiveDoc();
    if (!doc) return false;
    const result = await window.mdk.saveFile(doc.content, doc.filePath, saveAs);
    if (result.cancelled) return false;
    doc.filePath = result.filePath;
    doc.isDirty = false;
    renderTabs();
    updateTitleAndStatus();
    syncDirtyToMain();
    return true;
  }

  // ---------- exportar PDF / imprimir ----------

  function buildStandaloneHtml() {
    // El PDF/impresión hereda el skin activo en pantalla (colores y fuentes),
    // en vez de un estilo fijo: así "Genérico"/"Generic", "Océano"/"Ocean" o
    // un skin personalizado se ven igual en el documento exportado. Ver
    // DESIGN-SYSTEM.md.
    const skin = currentSkin || SKINS.vdc;
    const bodyHtml = window.MDKMarkdown.render(editor.value);
    return `<!DOCTYPE html>
<html lang="${currentLang}"><head><meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:ital,wght@0,400;0,500;0,600;1,300&family=Barlow+Condensed:wght@300;400;600;700&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; }
  html, body { max-width: 100%; overflow-x: hidden; }
  body {
    margin: 0; padding: 22mm 20mm;
    font-family: ${skin.fontBody}; font-weight: 300; font-size: 11pt;
    line-height: 1.7; color: ${skin.mid};
    overflow-wrap: break-word;
  }
  h1,h2,h3,h4 { font-family: ${skin.fontDisplay}; color: ${skin.dark}; margin: 18px 0 8px; }
  h1 { font-size: 24pt; border-bottom: 2px solid ${skin.accent}; padding-bottom: 6px; }
  h2 { font-size: 18pt; }
  h3 { font-size: 13pt; font-family: ${skin.fontCondensed}; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: ${skin.accent}; }
  h1:first-child, h2:first-child, h3:first-child { margin-top: 0; }
  p { margin: 0 0 12px; text-align: justify; }
  strong { color: ${skin.dark}; font-weight: 600; }
  code { font-family: ${skin.fontMono}; font-size: 9.5pt; background: ${skin.bg}; border: 1px solid ${skin.rule}; border-radius: 3px; padding: 1px 5px; overflow-wrap: break-word; word-break: break-word; }
  pre { background: ${skin.dark}; color: ${skin.bg}; padding: 12px 14px; border-radius: 4px; overflow-x: hidden; white-space: pre-wrap; word-break: break-word; }
  pre code { background: none; border: none; color: inherit; padding: 0; white-space: inherit; }
  blockquote { margin: 0 0 14px; padding: 2px 0 2px 14px; border-left: 3px solid ${skin.accent}; color: ${skin.light}; font-style: italic; }
  ul, ol { margin: 0 0 14px; padding-left: 22px; }
  li { margin-bottom: 4px; }
  a { color: ${skin.accent}; text-decoration: none; }
  hr { border: none; height: 1px; background: ${skin.rule}; margin: 20px 0; }
  table { border-collapse: collapse; width: 100%; table-layout: fixed; margin: 0 0 14px; font-size: 10pt; }
  th, td { border: 1px solid ${skin.rule}; padding: 6px 10px; text-align: left; word-break: break-word; overflow-wrap: break-word; }
  th { font-family: ${skin.fontCondensed}; font-weight: 700; background: ${skin.bg}; }
</style></head>
<body>${bodyHtml}</body></html>`;
  }

  async function doExportPdf() {
    const doc = getActiveDoc();
    const html = buildStandaloneHtml();
    const result = await window.mdk.exportPdf(html, doc && doc.filePath ? fileBaseName(doc.filePath) : t('dialog.defaultFileName'));
    if (!result.cancelled) {
      statusSaved.textContent = t('status.pdfExported');
      setTimeout(updateTitleAndStatus, 2500);
    }
  }

  async function doPrintNative() {
    const html = buildStandaloneHtml();
    await window.mdk.printNative(html);
  }

  // ---------- inicio ----------

  applyStaticTranslations();

  const firstDoc = createDocument();
  activeId = firstDoc.id;
  renderTabs();

  sidebarVisible = localStorage.getItem('mdk.sidebarVisible') === '1';
  sidebar.hidden = !sidebarVisible;
  document.getElementById('sidebarToggle').classList.toggle('is-active', sidebarVisible);

  setViewMode(viewMode);
  initPaneDivider();

  activeSkinId = loadSkinPreference();
  applyDarkMode();
  applyZoom();
  updateTitleAndStatus();
  updatePreview();
  updateOutline();

  // Abrir un .md por asociación de archivos (doble clic) o desde una segunda
  // instancia de la app (ya corriendo): el proceso principal ya leyó el
  // contenido y lo empuja aquí por IPC — ver main.js.
  if (window.mdk && window.mdk.onOpenFile) {
    window.mdk.onOpenFile((payload) => {
      if (payload && payload.filePath) loadFileIntoWorkspace(payload.filePath, payload.content);
    });
  }

  // Arrastrar y soltar un .md/.txt sobre la ventana: sin esto, Chromium
  // navega la ventana entera al archivo soltado (una pantalla en blanco/negra
  // fuera de la interfaz) en vez de abrirlo como documento.
  window.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
  });
  window.addEventListener('drop', (e) => {
    e.preventDefault();
    const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (!file || !file.path) return;
    const ext = (file.name || '').split('.').pop().toLowerCase();
    if (['md', 'markdown', 'txt'].includes(ext)) openExternalPath(file.path);
  });

  if (window.mdk && window.mdk.getAppVersion) {
    window.mdk.getAppVersion().then((v) => {
      if (v) {
        appVersion = v;
        modalVersion.textContent = t('info.versionLabel') + ' ' + v;
      }
    });
  }
})();
