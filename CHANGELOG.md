# Historial de cambios — MDK

Ver también: [CLAUDE.md](CLAUDE.md) · [docs/FEATURES.md](docs/FEATURES.md) · [docs/DECISIONS.md](docs/DECISIONS.md)

Este archivo es la fuente de verdad de "qué cambió y cuándo". Las últimas entradas
también se muestran resumidas dentro de la app (botón ⓘ → "Novedades"). Al agregar una
entrada nueva aquí, actualiza también el arreglo `CHANGELOG` en `src/renderer.js` para que
la app muestre lo mismo.

## 2.4.0

- Ícono propio: marcador `+` de VDC Process Lab (rojo `#C0392B` sobre fondo `#222222`),
  aplicado al `.exe`, al instalador/desinstalador NSIS y a la ventana de la app en tiempo
  de ejecución (`build/icon.ico`, 256×256 multi-resolución). Antes MDK usaba el ícono
  genérico de Electron y Windows lo mostraba como "Electron" (por ejemplo al asociar
  archivos `.md` desde Configuración → Aplicaciones predeterminadas).
- Para poder grabar el ícono y el nombre correcto en el `.exe`, se reactivó el paso interno
  de `electron-builder` que estaba desactivado desde la 2.1.1 (`signAndEditExecutable`).
  Esto significa que compilar (`npm run dist`) ahora requiere tener activado el "Modo de
  programador" de Windows, o correr la terminal como Administrador — ver
  `docs/BUILD-AND-RUN.md`.

## 2.3.1

- Corregido bug crítico: en el ejecutable compilado, toda la interfaz mostraba las claves
  de traducción en vez del texto (por ejemplo el botón "Vista previa" aparecía como
  `toolbar.previewBtn`). Causa: `preload.js` necesitaba `require()` para cargar el
  diccionario `src/i18n/strings.js`, pero desde Electron 20 los procesos de preload corren
  en modo `sandbox` por defecto, que bloquea el `require()` de archivos propios del
  proyecto (solo permite un puñado de módulos de Node/Electron). Al fallar esa línea, todo
  el script de preload se detenía silenciosamente — lo que también podía afectar abrir y
  guardar archivos, no solo el idioma. Se corrigió agregando `sandbox: false` a la
  configuración de la ventana en `main.js` (junto con `contextIsolation: true` y
  `nodeIntegration: false`, que ya estaban activos — sigue siendo la configuración segura
  recomendada por Electron).

## 2.3.0

- Interfaz en español e inglés: detecta el idioma del sistema al primer arranque, se puede
  cambiar en cualquier momento (menú "Idioma" o botón ES/EN) sin reiniciar la app, y la
  elección queda guardada.
- Licencia MIT: el repositorio ahora es abierto y reutilizable por cualquiera.
- Compilación y publicación automática: cada push valida el código (GitHub Actions, CI), y
  cada tag `vX.Y.Z` genera el instalador y el portable y los publica como GitHub Release.

## 2.2.0

- Panel de información rediseñado: estadísticas a la izquierda, desarrollador/sitio web y
  novedades a la derecha, en vez de todo apilado en una sola columna.
- Se eliminó el carácter `—` (raya larga) de toda la interfaz visible.
- La versión mostrada en la app ahora se lee de `package.json` en tiempo real (vía
  `app.getVersion()`), en vez de estar escrita a mano en el HTML.

## 2.1.1

- Corregido `npm run dist:installer`: el build se detenía silenciosamente sin generar el
  `.exe` por un paso interno de firma de recursos que no necesitábamos
  (`signAndEditExecutable: false`).

## 2.1.0

- Sistema de skins: paleta y tipografía ya no están fijas en el CSS. Selector con VDC
  Process Lab, Genérico (gris, sin marca), Océano, Bosque, y modo personalizado
  (color de acento/texto/fondo + fuente de títulos/cuerpo).
- El PDF exportado ahora hereda el skin activo en pantalla.

## 2.0.1

- Corregido bug: el modal de información quedaba visible desde el arranque y bloqueaba
  toda la interfaz (conflicto entre el atributo `hidden` y una regla CSS `display: flex`).

## 2.0.0

- Rediseño mayor de la interfaz: pestañas para varios documentos abiertos a la vez, panel
  de índice/estructura del documento (botón ☰), buscador con siguiente/anterior, controles
  de zoom, modo oscuro y modal de información con estadísticas del documento.
- Simplificados los atajos de teclado a un solo camino (menú nativo) para evitar dobles
  ejecuciones.

## 1.1.0

- Modos "Editor" y "Vista previa" ahora son exclusivos (uno a la vez) en vez de un panel
  dividido.
- Corregido desbordamiento horizontal en bloques de código dentro de la vista previa y el
  PDF exportado.
- Primera versión de `manual_para_dummies.md`.

## 1.0.0

- Primera versión funcional: editor de Markdown para Windows (Electron), identidad visual
  VDC Process Lab, formato por selección de línea (encabezados, listas, citas, negrita,
  cursiva, código, enlaces), vista previa y exportación/impresión a PDF.
