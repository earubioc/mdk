# MDK — editor de Markdown

*[Read this in English](./README.md)*

[![License: MIT](https://img.shields.io/badge/license-MIT-brightgreen.svg)](./LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows-0078D6.svg)](#descargar)

**Editor de Markdown simple y sin fricción para Windows — sin publicidad, sin funciones
pagas, sin cuenta.** Abre y edita `.md`/`.txt`, convierte líneas seleccionadas en
encabezados y estructura Markdown con un clic, y exporta o imprime directo a un PDF bien
formateado. Interfaz totalmente personalizable por skins (incluye la identidad visual de
VDC Process Lab por defecto, o pásate a un skin genérico o personalizado), disponible en
español e inglés (detecta el idioma del sistema).

Gratis y de código abierto (MIT) porque la mayoría de editores de Markdown que existen
esconden el formato básico detrás de publicidad o un plan pago — MDK no.

Ver [`CHANGELOG.md`](./CHANGELOG.md) para el historial de versiones.

## Descargar

Ir a [Releases](../../releases) y descargar el último `.exe`:

- **`MDK Setup X.X.X.exe`**: instalador con asistente (accesos directos en
  Escritorio/Inicio). Recomendado para la mayoría de usuarios.
- **`MDK-portable.exe`**: se ejecuta directo, sin instalar nada.

## Requisitos

- Node.js 18+ y npm (solo para desarrollo y empaquetado, no para usar la app ya compilada)
- Windows 10/11 de 64 bits

## Desarrollo

```bash
npm install
npm start
```

Esto abre la app en una ventana Electron sobre el código en `src/`.

## Generar el ejecutable de Windows

```bash
npm run dist              # genera portable + instalador NSIS
npm run dist:portable     # solo .exe portable (no requiere instalación)
npm run dist:installer    # solo instalador NSIS (con acceso directo en Escritorio/Inicio)
```

Los artefactos quedan en `release/`. Para instalar en otro computador solo hace falta
compartir el `.exe` final (`MDK Setup X.X.X.exe` o `MDK-portable.exe`); el resto de
archivos que deja `release/` (`win-unpacked/`, `.yml`, `.blockmap`) son soporte interno
del build. Ver [`manual_para_dummies.md`](./manual_para_dummies.md) para el paso a paso
sin tecnicismos. Si `electron-builder` falla con un error de "symbolic link" de
`winCodeSign`, revisa que `build.win.signAndEditExecutable` esté en `false` dentro de
`package.json`.

Cada push a `main` corre una validación automática (GitHub Actions, `.github/workflows/ci.yml`).
Cada tag `vX.Y.Z` compila el instalador y el portable y los publica como GitHub Release
(`.github/workflows/release.yml`).

## Estructura

```
MDK/
├── main.js               # proceso principal de Electron: ventana, menú, diálogos de archivo, exportación a PDF, idioma
├── preload.js             # puente seguro (contextBridge) entre main y renderer
├── src/
│   ├── index.html          # tabbar, buscador, toolbar de formato, sidebar, panes, modales
│   ├── style.css           # estilos de la app + variables de skin
│   ├── renderer.js         # documentos/pestañas, formato, skins, idioma, búsqueda, zoom, PDF
│   ├── markdown.js         # conversor Markdown → HTML propio, sin dependencias
│   └── i18n/strings.js     # diccionario español/inglés compartido entre main y renderer
├── .github/workflows/      # CI (validación) y Release (build + publicación en GitHub)
├── package.json           # scripts y configuración de electron-builder
├── LICENSE                 # MIT
├── CHANGELOG.md            # historial de versiones
└── manual_para_dummies.md  # guía sin tecnicismos (build, instalación, asociar .md)
```

## Uso

- **Idioma**: español/inglés, detecta el idioma del sistema al primer arranque; se puede
  cambiar en cualquier momento desde el botón ES/EN o el menú "Idioma", sin reiniciar
- **Pestañas**: varios documentos abiertos a la vez — nueva pestaña (Ctrl+N), cerrar
  (Ctrl+W)
- **Archivo**: Abrir (Ctrl+O), Guardar (Ctrl+S), Guardar como (Ctrl+Shift+S)
- **Formato**: selecciona una o varias líneas y pulsa H1/H2/H3 en la barra (o Ctrl+1/2/3)
  para convertirlas en encabezado (`#`, `##`, `###`); Ctrl+0 vuelve a texto normal.
  Negrita (Ctrl+B), cursiva (Ctrl+I), código en línea (Ctrl+E), lista (Ctrl+L), cita
  (Ctrl+Shift+Q)
- **Editor / Vista previa**: modos exclusivos (Ctrl+Shift+E / Ctrl+Shift+V)
- **Índice del documento**: botón ☰ muestra/oculta la estructura de encabezados (Ctrl+\);
  clic en un ítem salta a esa línea
- **Buscar**: Ctrl+F, siguiente/anterior dentro del buscador
- **Zoom**: botones `− 16px +` en la barra (Ctrl+= / Ctrl+-)
- **Modo oscuro**: botón ☾ (Ctrl+Shift+D)
- **Skins**: botón 🎨 — VDC Process Lab, Genérico, Océano, Bosque, o personalizado
  (colores y tipografía propios)
- **Información del documento**: botón ⓘ — palabras, caracteres, líneas, tokens
  estimados, y novedades de la app
- **Exportar a PDF**: botón "Exportar PDF" o Ctrl+P — guarda un `.pdf` con el skin activo
- **Imprimir**: Ctrl+Shift+P abre el diálogo de impresión nativo de Windows

## Licencia

MIT — ver [`LICENSE`](./LICENSE). Uso, copia, modificación y redistribución libres,
incluso comercial, con la única condición de conservar el aviso de copyright.
