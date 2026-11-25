; Personalización del instalador NSIS de MDK (electron-builder la incluye vía package.json > build.nsis.include).
; Agrega "Markdown" al submenú Nuevo del clic derecho del Explorador (crea un .md vacío).
; Se escribe en SHCTX: HKCU si la instalación es por usuario, HKLM si es para todos.
; Windows 11 muestra estas entradas de "Nuevo" desde el registro clásico (ShellNew).
; Esto NO aplica al paquete de Microsoft Store (el registro está virtualizado ahí).

!macro customInstall
  ; Si .md aún no tiene programa por defecto, se le asigna un ProgID propio abriendo con MDK.
  ; Si ya tiene uno (otro editor), se respeta: no se toca la asociación del usuario.
  ReadRegStr $0 SHCTX "Software\Classes\.md" ""
  StrCmp $0 "" 0 +6
    WriteRegStr SHCTX "Software\Classes\.md" "" "MDK.Markdown"
    WriteRegStr SHCTX "Software\Classes\MDK.Markdown" "" "Markdown"
    WriteRegStr SHCTX "Software\Classes\MDK.Markdown\DefaultIcon" "" "$INSTDIR\${APP_EXECUTABLE_FILENAME},0"
    WriteRegStr SHCTX "Software\Classes\MDK.Markdown\shell\open\command" "" '"$INSTDIR\${APP_EXECUTABLE_FILENAME}" "%1"'
    WriteRegStr SHCTX "Software\Classes\.md" "MDKManaged" "1"

  WriteRegStr SHCTX "Software\Classes\.md\ShellNew" "NullFile" ""
  WriteRegStr SHCTX "Software\Classes\.md\ShellNew" "ItemName" "Documento Markdown"
  WriteRegStr SHCTX "Software\Classes\.md\ShellNew" "MenuText" "Markdown (MDK)"
  WriteRegStr SHCTX "Software\Classes\.md\ShellNew" "IconPath" "$INSTDIR\${APP_EXECUTABLE_FILENAME},0"
  System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0, p 0, p 0)'
!macroend

!macro customUnInstall
  DeleteRegKey SHCTX "Software\Classes\.md\ShellNew"
  ; Solo se retira lo que puso este instalador (si .md era nuestro).
  ReadRegStr $0 SHCTX "Software\Classes\.md" "MDKManaged"
  StrCmp $0 "1" 0 +4
    DeleteRegKey SHCTX "Software\Classes\MDK.Markdown"
    DeleteRegValue SHCTX "Software\Classes\.md" ""
    DeleteRegValue SHCTX "Software\Classes\.md" "MDKManaged"
  System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0, p 0, p 0)'
!macroend
