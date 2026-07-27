/**
 * Diccionario de textos de MDK (español / inglés).
 *
 * Un solo archivo, requerible tanto desde `main.js` (menú nativo, diálogos)
 * como desde `preload.js` (que lo expone al renderer vía contextBridge como
 * `window.mdkStrings`). Así no hay dos copias de los mismos textos que se
 * puedan desincronizar entre el proceso principal y la interfaz.
 *
 * Convención de claves: espacio de nombres por punto, ej. "menu.file.save".
 * Si agregas un texto nuevo en la app, agrégalo aquí en los DOS idiomas.
 */

const es = {
  // ---- Menú nativo (main.js) ----
  'menu.file': 'Archivo',
  'menu.file.newTab': 'Nueva pestaña',
  'menu.file.open': 'Abrir…',
  'menu.file.save': 'Guardar',
  'menu.file.saveAs': 'Guardar como…',
  'menu.file.closeTab': 'Cerrar pestaña',
  'menu.file.exportPdf': 'Exportar a PDF…',
  'menu.file.print': 'Imprimir…',
  'menu.file.quit': 'Salir',

  'menu.edit': 'Editar',
  'menu.edit.undo': 'Deshacer',
  'menu.edit.redo': 'Rehacer',
  'menu.edit.cut': 'Cortar',
  'menu.edit.copy': 'Copiar',
  'menu.edit.paste': 'Pegar',
  'menu.edit.selectAll': 'Seleccionar todo',
  'menu.edit.find': 'Buscar…',

  'menu.format': 'Formato',
  'menu.format.h1': 'Encabezado 1 (#)',
  'menu.format.h2': 'Encabezado 2 (##)',
  'menu.format.h3': 'Encabezado 3 (###)',
  'menu.format.p': 'Texto normal',
  'menu.format.bold': 'Negrita',
  'menu.format.italic': 'Cursiva',
  'menu.format.code': 'Código en línea',
  'menu.format.list': 'Lista con viñetas',
  'menu.format.quote': 'Cita',

  'menu.view': 'Ver',
  'menu.view.editMode': 'Modo edición',
  'menu.view.preview': 'Vista previa',
  'menu.view.toggleSidebar': 'Mostrar/ocultar índice',
  'menu.view.darkMode': 'Modo oscuro',
  'menu.view.zoomIn': 'Acercar',
  'menu.view.zoomOut': 'Alejar',
  'menu.view.docInfo': 'Información del documento',
  'menu.view.reload': 'Recargar',
  'menu.view.devTools': 'Herramientas de desarrollo',
  'menu.view.fullscreen': 'Pantalla completa',

  'menu.language': 'Idioma',
  'menu.language.es': 'Español',
  'menu.language.en': 'English',

  // ---- Diálogos nativos (main.js) ----
  'dialog.closeTitle': 'Cambios sin guardar',
  'dialog.closeMessage': 'Hay documentos con cambios sin guardar. Si sales ahora, se perderán.',
  'dialog.cancel': 'Cancelar',
  'dialog.exitWithoutSaving': 'Salir sin guardar',

  'dialog.openTitle': 'Abrir archivo',
  'dialog.filterMarkdownText': 'Markdown / Texto',
  'dialog.filterAllFiles': 'Todos los archivos',
  'dialog.openErrorTitle': 'Error al abrir',

  'dialog.saveAsTitle': 'Guardar como',
  'dialog.filterMarkdown': 'Markdown',
  'dialog.filterPlainText': 'Texto plano',
  'dialog.saveErrorTitle': 'Error al guardar',
  'dialog.defaultFileName': 'documento.md',

  'dialog.exportPdfTitle': 'Exportar a PDF',
  'dialog.filterPdf': 'PDF',
  'dialog.pdfErrorTitle': 'Error al exportar PDF',
  'dialog.defaultPdfBaseName': 'documento',

  // ---- Barra de pestañas (tooltips) ----
  'tabbar.sidebarToggleTitle': 'Mostrar/ocultar índice (Ctrl+\\)',
  'tabbar.newTabTitle': 'Nueva pestaña (Ctrl+N)',
  'tabbar.openTitle': 'Abrir… (Ctrl+O)',
  'tabbar.searchTitle': 'Buscar (Ctrl+F)',
  'tabbar.zoomOutTitle': 'Alejar (Ctrl+-)',
  'tabbar.zoomInTitle': 'Acercar (Ctrl+=)',
  'tabbar.darkTitle': 'Modo oscuro (Ctrl+Shift+D)',
  'tabbar.skinsTitle': 'Personalizar interfaz (skins)',
  'tabbar.infoTitle': 'Información del documento',
  'tabbar.languageTitle': 'Idioma / Language',
  'tabbar.closeTabTitle': 'Cerrar pestaña',

  // ---- Buscador ----
  'search.placeholder': 'Buscar en el documento…',
  'search.prevTitle': 'Anterior',
  'search.nextTitle': 'Siguiente',
  'search.closeTitle': 'Cerrar (Esc)',
  'search.noResults': 'Sin resultados',
  'search.matchSingular': 'coincidencia',
  'search.matchPlural': 'coincidencias',

  // ---- Barra de formato ----
  'toolbar.h1Title': 'Encabezado 1 (Ctrl+1)',
  'toolbar.h2Title': 'Encabezado 2 (Ctrl+2)',
  'toolbar.h3Title': 'Encabezado 3 (Ctrl+3)',
  'toolbar.pTitle': 'Texto normal (Ctrl+0)',
  'toolbar.boldTitle': 'Negrita (Ctrl+B)',
  'toolbar.boldGlyph': 'N',
  'toolbar.italicTitle': 'Cursiva (Ctrl+I)',
  'toolbar.italicGlyph': 'K',
  'toolbar.codeTitle': 'Código en línea (Ctrl+E)',
  'toolbar.listTitle': 'Lista con viñetas (Ctrl+L)',
  'toolbar.quoteTitle': 'Cita (Ctrl+Shift+Q)',
  'toolbar.linkTitle': 'Enlace',
  'toolbar.editorBtn': 'Editor',
  'toolbar.editorTitle': 'Modo edición (Ctrl+Shift+E)',
  'toolbar.previewBtn': 'Vista previa',
  'toolbar.previewTitle': 'Vista previa (Ctrl+Shift+V)',
  'toolbar.exportPdfBtn': 'Exportar PDF',
  'toolbar.exportPdfTitle': 'Exportar a PDF (Ctrl+P)',

  // ---- Índice del documento ----
  'sidebar.title': 'Índice del documento',
  'sidebar.empty': 'Este documento no tiene encabezados todavía.',

  // ---- Editor ----
  'editor.placeholder': 'Escribe tu documento en Markdown…\n\n# Título\n## Subtítulo\n\nSelecciona una línea y pulsa H1 / H2 / H3 en la barra superior, o usa Ctrl+1, Ctrl+2, Ctrl+3.',
  'link.defaultText': 'texto del enlace',

  // ---- Barra de estado ----
  'status.untitled': 'Sin título',
  'status.wordsAndLines': '{words} palabras · {lines} líneas',
  'status.saved': 'Guardado',
  'status.unsaved': 'Sin guardar',
  'status.pdfExported': 'PDF exportado',

  // ---- Confirmaciones ----
  'confirm.closeTabDirty': '"{name}" tiene cambios sin guardar. ¿Cerrar de todas formas?',

  // ---- Modal de información ----
  'info.versionLabel': 'Versión',
  'info.subtitle': 'Editor de Markdown simple',
  'info.statsTitle': 'Estadísticas del documento',
  'info.words': 'Palabras',
  'info.chars': 'Caracteres',
  'info.lines': 'Líneas',
  'info.tokens': 'Tokens (est.)',
  'info.devTitle': 'Desarrollador',
  'info.newsTitle': 'Novedades',
  'info.footerRights': 'Todos los derechos reservados.',
  'info.closeTitle': 'Cerrar',

  'changelog.2.4.0': 'Ícono propio (marcador + de VDC Process Lab) en el .exe, el instalador y la ventana de la app — ya no aparece como "Electron" al asociar archivos .md.',
  'changelog.2.3.1': 'Corrección: los botones e interfaz podían mostrar claves de texto en vez de la traducción (por ejemplo "toolbar.previewBtn") en el ejecutable compilado.',
  'changelog.2.3.0': 'Interfaz en español e inglés (detecta el sistema, selector manual), licencia MIT y compilación/publicación automática en GitHub.',
  'changelog.2.2.0': 'Panel de información con estadísticas, desarrollador y novedades en columnas.',
  'changelog.2.1.0': 'Skins: paleta y tipografía personalizables (VDC, Genérico, Océano, Bosque o tu combinación).',
  'changelog.2.0.0': 'Pestañas, índice del documento, buscador, zoom y modo oscuro.',
  'changelog.1.0.0': 'Primera versión: editor Markdown con formato por línea y exportación a PDF.',

  // ---- Modal de skins ----
  'skins.modalTitle': 'Personalizar interfaz',
  'skins.modalSubtitle': 'Elige un skin o arma tu propia combinación de colores y tipografía.',
  'skins.customSectionTitle': 'Personalizado',
  'skins.fieldAccent': 'Color de acento',
  'skins.fieldText': 'Color de texto',
  'skins.fieldBg': 'Color de fondo',
  'skins.fieldDisplayFont': 'Fuente de títulos',
  'skins.fieldBodyFont': 'Fuente de cuerpo',
  'skins.resetBtn': 'Restablecer a VDC',
  'skins.applyBtn': 'Aplicar personalizado',
  'skins.closeTitle': 'Cerrar',

  'skins.vdc.label': 'VDC Process Lab',
  'skins.vdc.hint': 'Rojo + negro, Bebas Neue',
  'skins.generic.label': 'Genérico',
  'skins.generic.hint': 'Gris, Segoe UI, sin marca',
  'skins.ocean.label': 'Océano',
  'skins.ocean.hint': 'Azul, tipografía clásica',
  'skins.forest.label': 'Bosque',
  'skins.forest.hint': 'Verde, Barlow',
  'skins.custom.label': 'Personalizado',
  'skins.custom.hint': 'Tu combinación'
};

const en = {
  // ---- Native menu (main.js) ----
  'menu.file': 'File',
  'menu.file.newTab': 'New Tab',
  'menu.file.open': 'Open…',
  'menu.file.save': 'Save',
  'menu.file.saveAs': 'Save As…',
  'menu.file.closeTab': 'Close Tab',
  'menu.file.exportPdf': 'Export to PDF…',
  'menu.file.print': 'Print…',
  'menu.file.quit': 'Quit',

  'menu.edit': 'Edit',
  'menu.edit.undo': 'Undo',
  'menu.edit.redo': 'Redo',
  'menu.edit.cut': 'Cut',
  'menu.edit.copy': 'Copy',
  'menu.edit.paste': 'Paste',
  'menu.edit.selectAll': 'Select All',
  'menu.edit.find': 'Find…',

  'menu.format': 'Format',
  'menu.format.h1': 'Heading 1 (#)',
  'menu.format.h2': 'Heading 2 (##)',
  'menu.format.h3': 'Heading 3 (###)',
  'menu.format.p': 'Normal Text',
  'menu.format.bold': 'Bold',
  'menu.format.italic': 'Italic',
  'menu.format.code': 'Inline Code',
  'menu.format.list': 'Bulleted List',
  'menu.format.quote': 'Quote',

  'menu.view': 'View',
  'menu.view.editMode': 'Edit Mode',
  'menu.view.preview': 'Preview',
  'menu.view.toggleSidebar': 'Show/Hide Outline',
  'menu.view.darkMode': 'Dark Mode',
  'menu.view.zoomIn': 'Zoom In',
  'menu.view.zoomOut': 'Zoom Out',
  'menu.view.docInfo': 'Document Info',
  'menu.view.reload': 'Reload',
  'menu.view.devTools': 'Developer Tools',
  'menu.view.fullscreen': 'Full Screen',

  'menu.language': 'Language',
  'menu.language.es': 'Español',
  'menu.language.en': 'English',

  // ---- Native dialogs (main.js) ----
  'dialog.closeTitle': 'Unsaved changes',
  'dialog.closeMessage': 'There are documents with unsaved changes. If you exit now, they will be lost.',
  'dialog.cancel': 'Cancel',
  'dialog.exitWithoutSaving': 'Exit without saving',

  'dialog.openTitle': 'Open file',
  'dialog.filterMarkdownText': 'Markdown / Text',
  'dialog.filterAllFiles': 'All files',
  'dialog.openErrorTitle': 'Error opening file',

  'dialog.saveAsTitle': 'Save as',
  'dialog.filterMarkdown': 'Markdown',
  'dialog.filterPlainText': 'Plain text',
  'dialog.saveErrorTitle': 'Error saving file',
  'dialog.defaultFileName': 'document.md',

  'dialog.exportPdfTitle': 'Export to PDF',
  'dialog.filterPdf': 'PDF',
  'dialog.pdfErrorTitle': 'Error exporting PDF',
  'dialog.defaultPdfBaseName': 'document',

  // ---- Tab bar (tooltips) ----
  'tabbar.sidebarToggleTitle': 'Show/hide outline (Ctrl+\\)',
  'tabbar.newTabTitle': 'New tab (Ctrl+N)',
  'tabbar.openTitle': 'Open… (Ctrl+O)',
  'tabbar.searchTitle': 'Find (Ctrl+F)',
  'tabbar.zoomOutTitle': 'Zoom out (Ctrl+-)',
  'tabbar.zoomInTitle': 'Zoom in (Ctrl+=)',
  'tabbar.darkTitle': 'Dark mode (Ctrl+Shift+D)',
  'tabbar.skinsTitle': 'Customize interface (skins)',
  'tabbar.infoTitle': 'Document information',
  'tabbar.languageTitle': 'Idioma / Language',
  'tabbar.closeTabTitle': 'Close tab',

  // ---- Search ----
  'search.placeholder': 'Search in the document…',
  'search.prevTitle': 'Previous',
  'search.nextTitle': 'Next',
  'search.closeTitle': 'Close (Esc)',
  'search.noResults': 'No results',
  'search.matchSingular': 'match',
  'search.matchPlural': 'matches',

  // ---- Format toolbar ----
  'toolbar.h1Title': 'Heading 1 (Ctrl+1)',
  'toolbar.h2Title': 'Heading 2 (Ctrl+2)',
  'toolbar.h3Title': 'Heading 3 (Ctrl+3)',
  'toolbar.pTitle': 'Normal text (Ctrl+0)',
  'toolbar.boldTitle': 'Bold (Ctrl+B)',
  'toolbar.boldGlyph': 'B',
  'toolbar.italicTitle': 'Italic (Ctrl+I)',
  'toolbar.italicGlyph': 'I',
  'toolbar.codeTitle': 'Inline code (Ctrl+E)',
  'toolbar.listTitle': 'Bulleted list (Ctrl+L)',
  'toolbar.quoteTitle': 'Quote (Ctrl+Shift+Q)',
  'toolbar.linkTitle': 'Link',
  'toolbar.editorBtn': 'Editor',
  'toolbar.editorTitle': 'Edit mode (Ctrl+Shift+E)',
  'toolbar.previewBtn': 'Preview',
  'toolbar.previewTitle': 'Preview (Ctrl+Shift+V)',
  'toolbar.exportPdfBtn': 'Export PDF',
  'toolbar.exportPdfTitle': 'Export to PDF (Ctrl+P)',

  // ---- Document outline ----
  'sidebar.title': 'Document outline',
  'sidebar.empty': 'This document has no headings yet.',

  // ---- Editor ----
  'editor.placeholder': 'Write your document in Markdown…\n\n# Title\n## Subtitle\n\nSelect a line and click H1 / H2 / H3 in the top bar, or use Ctrl+1, Ctrl+2, Ctrl+3.',
  'link.defaultText': 'link text',

  // ---- Status bar ----
  'status.untitled': 'Untitled',
  'status.wordsAndLines': '{words} words · {lines} lines',
  'status.saved': 'Saved',
  'status.unsaved': 'Unsaved',
  'status.pdfExported': 'PDF exported',

  // ---- Confirmations ----
  'confirm.closeTabDirty': '"{name}" has unsaved changes. Close anyway?',

  // ---- Info modal ----
  'info.versionLabel': 'Version',
  'info.subtitle': 'Simple Markdown editor',
  'info.statsTitle': 'Document statistics',
  'info.words': 'Words',
  'info.chars': 'Characters',
  'info.lines': 'Lines',
  'info.tokens': 'Tokens (est.)',
  'info.devTitle': 'Developer',
  'info.newsTitle': "What's new",
  'info.footerRights': 'All rights reserved.',
  'info.closeTitle': 'Close',

  'changelog.2.4.0': 'Custom icon (VDC Process Lab + mark) on the .exe, the installer, and the app window — no longer shows up as "Electron" when associating .md files.',
  'changelog.2.3.1': 'Fix: buttons and interface text could show raw translation keys (e.g. "toolbar.previewBtn") instead of the translated text in the compiled executable.',
  'changelog.2.3.0': 'Spanish and English interface (auto-detects the system, manual switch), MIT license, and automatic build/release on GitHub.',
  'changelog.2.2.0': 'Info panel with stats, developer info and what’s new, laid out in columns.',
  'changelog.2.1.0': 'Skins: customizable palette and typography (VDC, Generic, Ocean, Forest, or your own combination).',
  'changelog.2.0.0': 'Tabs, document outline, search, zoom and dark mode.',
  'changelog.1.0.0': 'First release: Markdown editor with line-based formatting and PDF export.',

  // ---- Skins modal ----
  'skins.modalTitle': 'Customize interface',
  'skins.modalSubtitle': 'Choose a skin or build your own color and typography combination.',
  'skins.customSectionTitle': 'Custom',
  'skins.fieldAccent': 'Accent color',
  'skins.fieldText': 'Text color',
  'skins.fieldBg': 'Background color',
  'skins.fieldDisplayFont': 'Heading font',
  'skins.fieldBodyFont': 'Body font',
  'skins.resetBtn': 'Reset to VDC',
  'skins.applyBtn': 'Apply custom',
  'skins.closeTitle': 'Close',

  'skins.vdc.label': 'VDC Process Lab',
  'skins.vdc.hint': 'Red + black, Bebas Neue',
  'skins.generic.label': 'Generic',
  'skins.generic.hint': 'Gray, Segoe UI, no branding',
  'skins.ocean.label': 'Ocean',
  'skins.ocean.hint': 'Blue, classic typography',
  'skins.forest.label': 'Forest',
  'skins.forest.hint': 'Green, Barlow',
  'skins.custom.label': 'Custom',
  'skins.custom.hint': 'Your combination'
};

module.exports = { es, en };
