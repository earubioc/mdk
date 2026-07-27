# Manual para dummies: MDK

Guía sin tecnicismos para generar el programa y usarlo en Windows. No necesitas saber
programar para seguir estos pasos, solo copiar y pegar comandos.

---

## Parte 1: requisito único, instalar Node.js

Antes de nada, necesitas tener **Node.js** instalado en tu computador con Windows (es el
programa que permite construir MDK). Si no lo tienes:

1. Ve a [nodejs.org](https://nodejs.org)
2. Descarga la versión "LTS" (la recomendada)
3. Instálala con las opciones por defecto (siguiente, siguiente, siguiente...)

Para comprobar que quedó instalado, abre **PowerShell** (búscalo en el menú Inicio) y
escribe:

```
node -v
npm -v
```

Si te muestra dos números de versión (por ejemplo `v22.19.0`), ya está listo.

---

## Parte 2: preparar la carpeta del proyecto

Abre PowerShell y entra a la carpeta del proyecto:

```
cd D:\IA_WORK\MDK
```

Instala las piezas que necesita el proyecto (esto se hace **una sola vez**, o cada vez que
el código cambie):

```
npm install
```

Este paso puede tardar unos minutos la primera vez porque descarga Electron (el motor que
usa MDK). Si en algún momento este paso falla con errores raros, la solución casi siempre
es borrar todo y empezar de nuevo:

```
Remove-Item -Recurse -Force node_modules
Remove-Item -Force package-lock.json -ErrorAction SilentlyContinue
npm install
```

## Parte 3: probar la app sin generar el .exe todavía

Para simplemente abrir MDK y ver que funciona, sin crear ningún instalador:

```
npm start
```

Se abrirá la ventana del editor. Ciérrala normalmente cuando termines de probar.

---

## Parte 4: generar el(los) ejecutable(s) de Windows

Con la carpeta preparada (Parte 2 ya hecha), corre uno de estos comandos según lo que
quieras generar:

```
npm run dist              # genera LAS DOS versiones: portable + instalador
npm run dist:portable     # genera SOLO la versión portable (un único .exe)
npm run dist:installer    # genera SOLO el instalador (con asistente de instalación)
```

Este proceso también puede tardar varios minutos. Cuando termine sin errores, los
archivos generados quedan dentro de una carpeta nueva llamada `release/`, por ejemplo:

```
D:\IA_WORK\MDK\release\MDK-portable.exe      (versión portable)
D:\IA_WORK\MDK\release\MDK Setup 1.0.0.exe   (instalador)
```

(el nombre exacto del instalador puede variar un poco según la versión).

### Qué hay dentro de `release/` y qué compartir con otra persona

Además del `.exe` que buscas, `release/` queda con más cosas que **no necesitas
compartir ni tocar**:

| Dentro de `release/` | Qué es | ¿Se comparte? |
|---|---|---|
| `MDK Setup X.X.X.exe` | El instalador: un solo archivo, lo abre quien lo va a instalar | ✅ Sí, es el único archivo que necesita la otra persona |
| `MDK-portable.exe` (si generaste la versión portable) | El programa completo en un solo archivo, sin instalar | ✅ Sí, si preferiste esta opción en vez del instalador |
| `MDK Setup X.X.X.exe.blockmap` | Metadata para actualizaciones automáticas (no la usamos) | ❌ No hace falta |
| `builder-debug.yml` / `builder-effective-config.yaml` | Registros internos de cómo se armó el build | ❌ No hace falta |
| `win-unpacked/` | La app "desarmada" en carpeta (código + `MDK.exe` + todas las `.dll`/`.pak` que necesita): es un paso intermedio que usa electron-builder para construir tanto el portable como el instalador, **no es la versión portable** | ❌ No la compartas: sin instalador ni empaquetado, solo sirve completa y en esa misma carpeta; si quieres algo "portable" de verdad, genera `MDK-portable.exe` con `npm run dist:portable` |

En resumen: **para instalar en otro computador, comparte solo el archivo `MDK Setup
X.X.X.exe`** (o `MDK-portable.exe` si es lo que generaste). Todo lo demás dentro de
`release/` es soporte interno del proceso de build.

### Si ves una lluvia de errores que hablan de "symbolic link"

Es un problema conocido: Windows, por defecto, no deja crear cierto tipo de enlace
interno que usa una de las herramientas de empaquetado. Ya está corregido en la
configuración del proyecto, pero si de todas formas te aparece, la solución más rápida es
correr PowerShell **"como Administrador"** (clic derecho sobre el ícono de PowerShell →
"Ejecutar como administrador") y repetir el comando `npm run dist...` ahí. Como alternativa,
puedes activar el "Modo de desarrollador" de Windows en Configuración → Privacidad y
seguridad → Para desarrolladores.

### ¿Cuál elegir: portable o instalador?

| | Portable | Instalador |
|---|---|---|
| ¿Qué es? | Un solo archivo `.exe` que se ejecuta directo, sin instalar nada | Un asistente que copia el programa a tu computador de forma permanente |
| ¿Dónde vive? | Donde tú lo pongas (Escritorio, USB, cualquier carpeta) | Se instala en una carpeta fija del sistema |
| ¿Aparece en el menú Inicio? | No, a menos que tú crees un acceso directo | Sí, automáticamente |
| ¿Se puede mover de carpeta después? | Sí, pero si lo asociaste a archivos `.md` (ver Parte 6), tendrás que rehacer esa asociación | No hace falta moverlo, ya queda instalado |
| Recomendado si... | Quieres probarlo rápido, o llevarlo en un USB | Lo vas a usar todos los días desde este mismo computador | 

Si no estás seguro, usa el **instalador**: es la opción más parecida a "instalar un
programa normal" en Windows.

---

## Parte 5: "instalar" MDK en Windows

### Opción A: con el instalador (`MDK Setup ....exe`)

1. Haz doble clic sobre el archivo `MDK Setup ....exe` dentro de `release/`
2. Windows puede mostrar una advertencia de "Editor desconocido": es normal en apps sin
   firma digital comercial; haz clic en "Más información" → "Ejecutar de todas formas"
3. Sigue el asistente: puedes elegir la carpeta de instalación (o dejar la que viene por
   defecto) y si quieres accesos directos en Escritorio y menú Inicio
4. Al terminar, abre MDK desde el Escritorio o buscando "MDK" en el menú Inicio

### Opción B: con la versión portable (`MDK-portable.exe`)

1. Copia `MDK-portable.exe` a la carpeta donde quieras tenerlo (por ejemplo
   `D:\Programas\MDK\`)
2. Haz doble clic para abrirlo, no requiere instalación
3. Si quieres un acceso directo en el Escritorio: clic derecho sobre el archivo →
   "Enviar a" → "Escritorio (crear acceso directo)"

---

## Parte 6: asociar archivos `.md` a MDK (para abrirlos con doble clic)

Por defecto, Windows no sabe qué programa usar cuando haces doble clic en un archivo
`.md`. Puedes decirle que use MDK con cualquiera de estos dos métodos:

### Método rápido (recomendado)

1. Busca cualquier archivo `.md` en el explorador de archivos
2. Haz **clic derecho** sobre él → **"Abrir con"** → **"Elegir otra aplicación"**
3. Si MDK no aparece en la lista, haz clic en **"Más aplicaciones"** y luego, al final,
   en **"Buscar otra aplicación en este equipo"**
4. Navega hasta donde quedó el ejecutable:
   - Si instalaste con el asistente: normalmente en
     `C:\Users\TU_USUARIO\AppData\Local\Programs\MDK\MDK.exe`
   - Si usas la versión portable: donde tú la hayas copiado, por ejemplo
     `D:\Programas\MDK\MDK-portable.exe`
5. Selecciónalo y **marca la casilla "Usar siempre esta aplicación para abrir archivos .md"**
6. Haz clic en **Aceptar**

Desde ahora, cualquier doble clic sobre un archivo `.md` abrirá MDK automáticamente.

### Método por Configuración de Windows (alternativa)

1. Abre **Configuración** (⊞ Win + I)
2. Ve a **Aplicaciones** → **Aplicaciones predeterminadas**
3. Baja hasta **"Establecer un valor predeterminado según el tipo de archivo"** (o busca
   directamente `.md` en el buscador de esa pantalla)
4. Busca la extensión `.md` y elige **MDK** como programa predeterminado

### Nota importante sobre la versión portable

Si usaste la versión **portable** y luego mueves el archivo `.exe` a otra carpeta,
Windows "olvida" la asociación (porque apuntaba a la ubicación anterior) y tendrás que
repetir el Método rápido señalando la nueva ubicación. Con el **instalador** esto no pasa,
porque el programa queda en un lugar fijo.

---

## Resumen ultra rápido

```
cd D:\IA_WORK\MDK
npm install
npm run dist
```

Espera a que termine → entra a la carpeta `release/` → instala o copia el `.exe` que
prefieras → asocia `.md` con él (Parte 6) → listo, ya tienes tu editor Markdown con
identidad VDC Process Lab funcionando como cualquier otro programa de Windows.
