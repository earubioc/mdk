# MDK: Markdown editor

*[Leer en español](./README.es.md)*

[![License: MIT](https://img.shields.io/badge/license-MIT-brightgreen.svg)](./LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows-0078D6.svg)](#download)
[![Release](https://img.shields.io/github/v/release/earubioc/mdk?label=release)](../../releases/latest)

**A clean, no-nonsense Markdown editor for Windows: no ads, no paywalled features, no
account required.** Open and edit `.md`/`.txt`, turn selected lines into headings and
Markdown structure with one click, and export or print straight to a properly formatted
PDF. Fully skinnable interface (ships with the VDC Process Lab identity as the default,
or go fully generic/custom), available in Spanish and English.

Free and open source (MIT) because most Markdown editors out there bury basic formatting
behind ads or a paid tier. MDK doesn't.

See [`CHANGELOG.md`](./CHANGELOG.md) for the version history.

## Download

Go to [Releases](../../releases) and download the latest `.exe`:

- **`MDK Setup X.X.X.exe`**: wizard-based installer (Desktop/Start Menu shortcuts).
  Recommended for most users.
- **`MDK-portable.exe`**: runs directly, nothing to install.

## Requirements

- Node.js 18+ and npm (only needed for development/packaging, not to run the compiled app)
- Windows 10/11, 64-bit

## Development

```bash
npm install
npm start
```

This opens the app in an Electron window over the code in `src/`.

## Building the Windows executable

```bash
npm run dist              # builds portable + NSIS installer
npm run dist:portable     # portable .exe only (no install needed)
npm run dist:installer    # NSIS installer only (Desktop/Start Menu shortcut)
```

The artifacts land in `release/`. To install on another machine you only need to share
the final `.exe` (`MDK Setup X.X.X.exe` or `MDK-portable.exe`); everything else `release/`
leaves behind (`win-unpacked/`, `.yml`, `.blockmap`) is internal build support. See
[`manual_para_dummies.md`](./manual_para_dummies.md) for a no-jargon walkthrough (Spanish).
If `electron-builder` fails with a `winCodeSign` "symbolic link" error, make sure
`build.win.signAndEditExecutable` is `false` in `package.json`.

Every push to `main` runs an automatic validation (GitHub Actions,
`.github/workflows/ci.yml`). Every `vX.Y.Z` tag builds the installer and the portable
executable and publishes them as a GitHub Release (`.github/workflows/release.yml`).

## Structure

```
MDK/
├── main.js               # Electron main process: window, menu, file dialogs, PDF export, language
├── preload.js             # secure bridge (contextBridge) between main and renderer
├── src/
│   ├── index.html          # tabbar, search bar, formatting toolbar, sidebar, panes, modals
│   ├── style.css           # app styles + skin variables
│   ├── renderer.js         # documents/tabs, formatting, skins, language, search, zoom, PDF
│   ├── markdown.js         # dependency-free Markdown → HTML converter
│   └── i18n/strings.js     # Spanish/English dictionary shared between main and renderer
├── .github/workflows/      # CI (validation) and Release (build + publish to GitHub)
├── package.json           # scripts and electron-builder configuration
├── LICENSE                 # MIT
├── CHANGELOG.md            # version history
└── manual_para_dummies.md  # no-jargon guide (build, install, associate .md), Spanish
```

## Usage

- **Language**: Spanish/English, auto-detects the system language on first launch; switch
  anytime from the ES/EN button or the "Language" menu, no restart needed
- **Tabs**: multiple documents open at once: new tab (Ctrl+N), close (Ctrl+W)
- **File**: Open (Ctrl+O), Save (Ctrl+S), Save as (Ctrl+Shift+S)
- **Formatting**: select one or more lines and press H1/H2/H3 in the toolbar (or
  Ctrl+1/2/3) to turn them into a heading (`#`, `##`, `###`); Ctrl+0 reverts to plain text.
  Bold (Ctrl+B), italic (Ctrl+I), inline code (Ctrl+E), list (Ctrl+L), quote (Ctrl+Shift+Q)
- **Editor / Preview**: exclusive modes (Ctrl+Shift+E / Ctrl+Shift+V)
- **Document outline**: ☰ button shows/hides the heading structure (Ctrl+\); clicking an
  item jumps to that line
- **Search**: Ctrl+F, next/previous within the search bar
- **Zoom**: `− 16px +` buttons in the toolbar (Ctrl+= / Ctrl+-)
- **Dark mode**: ☾ button (Ctrl+Shift+D)
- **Skins**: 🎨 button: VDC Process Lab, Generic, Ocean, Forest, or a custom skin (your
  own colors and typography)
- **Document info**: ⓘ button: words, characters, lines, estimated tokens, and what's new
- **Export to PDF**: "Export PDF" button or Ctrl+P: saves a `.pdf` with the active skin
- **Print**: Ctrl+Shift+P opens the native Windows print dialog

## License

MIT, see [`LICENSE`](./LICENSE). Free to use, copy, modify, and redistribute, including
commercially, with the sole condition of keeping the copyright notice.
