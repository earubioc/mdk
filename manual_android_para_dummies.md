# Manual para dummies: MD Kraft en Android (de cero a la Play Store)

Guía sin tecnicismos para tener **MD Kraft Markdown Editor** publicada en Google Play:
**gratis y sin publicidad** para Markdown y texto, con una compra única de **MD Kraft Pro
(US$ 2,99)** que desbloquea los demás formatos y la vista previa de HTML. Asume que tienes
una cuenta de desarrollador de Google Play **sin ninguna app subida**.

> **Importante:** Google cambia pantallas, nombres de botones y requisitos con frecuencia.
> Los pasos de este manual son el camino general; donde dice **(verifica)** compara con lo
> que te muestre la consola en ese momento. Los plazos y números (14 días, 12 testers,
> nivel de API) son los vigentes cuando se escribió el manual.

---

## 0. El mapa completo (léelo una vez)

Una sola cuenta de Google hace todo: **Play Console** (play.google.com/console) publica la
app y cobra los US$ 2,99. No hay anuncios, así que **no necesitas AdMob**.

El orden recomendado (no lo cambies, cada paso depende del anterior):

1. Crear la **llave de firma** y guardar los **secretos** en GitHub (parte 4).
2. **Compilar** el instalador en GitHub (parte 5) y probarlo en tu teléfono (parte 6).
3. Crear la app en **Play Console**, llenar los formularios y subir el `.aab` (parte 7).
4. **Prueba cerrada de 14 días** con 12 personas (parte 8; solo si tu cuenta es personal y
   nueva, **verifica** en tu consola).
5. Publicar en **producción** (parte 9).

(La parte 3 ya no existe: era AdMob. Se deja el número para no confundir.)

Tiempo realista: unas 2 horas de trabajo tuyo, más 14 días de espera de la prueba cerrada
y unos días de revisión de Google.

---

## 1. Qué es gratis y qué es Pro

**Gratis para siempre y sin publicidad:**
- Abrir, editar y guardar archivos **Markdown (`.md`, `.markdown`) y texto (`.txt`)**.
- Todas las herramientas de escritura, vista previa, tablas, fórmulas, índice, buscador,
  pestañas, archivos recientes, modo oscuro, skins y **exportar a PDF**.

**MD Kraft Pro, compra única de US$ 2,99 (sin suscripción):**
- Abrir, editar y guardar **HTML, CSS, JavaScript, TypeScript, JSON, XML, YAML, CSV, Python,
  Java, C/C++, SQL, Shell, LaTeX, logs** y cualquier otro archivo de texto o código.
- **Vista previa real** (botón ▶ Vista previa) de **HTML, SVG y componentes de React
  (`.tsx` / `.jsx`)**: muestra la página o el componente como se vería en un navegador, con
  su JavaScript. Pensada para revisar al instante lo que genera una IA. Corre en una
  ventana aparte, **aislada del editor** (el código que previsualizas no puede tocar tus
  archivos ni la app). Para React la app incluye React y un compilador de JSX/TypeScript,
  así que funciona sin internet; si el componente importa otras librerías (por ejemplo
  `recharts`), la vista previa lo avisa. Si hay internet, también carga Tailwind CSS.
- A futuro: colores de sintaxis, números de línea y buscar y reemplazar.

Cómo se aplica: si alguien intenta abrir o guardar un formato Pro sin haberlo desbloqueado,
sale un aviso con el precio y el botón **Desbloquear**. La compra la recuerda Google Play
(también si reinstala o cambia de teléfono). Si Google hace un reembolso, Pro se desactiva.

Cambiar el precio o qué es Pro: el precio se fija en Play Console (parte 7.4); qué formatos
son gratis está en `MainActivity.java` (`isFree`).

---

## 2. Antes de empezar, ten a la mano

- Tu cuenta de Google (la de la cuenta de desarrollador de Play).
- Una **tarjeta o cuenta bancaria** y tu **documento de identidad** (para pagos e
  impuestos).
- Un **teléfono Android** para probar.
- **12 personas con cuenta Gmail** y Android (amigos, familia, colegas) para la prueba
  cerrada.
- La dirección de tu **política de privacidad**:
  `https://earubioc.github.io/mdk/privacidad.html`
  (ya incluye la sección de Android; se publica cuando este cambio esté en la rama `main`).
- Java 17 instalado (solo para crear la llave de firma). Si no lo tienes: descarga
  "Temurin JDK 17" desde adoptium.net e instálalo con las opciones por defecto.

---

## 3. (Eliminada) AdMob

MD Kraft ya no usa anuncios, así que **no necesitas cuenta de AdMob** para esta app. Si la
abriste, no pasa nada: puedes reutilizarla para tus juegos u otras apps. Dos recordatorios
por si la usas más adelante: deja **sin marcar** la casilla "Ofertas para socios" al crear
bloques de anuncios, y **jamás hagas clic en tus propios anuncios reales** (cierran la
cuenta). Los secretos `MDK_ADMOB_*` que hayas creado en GitHub ya no se usan; puedes
borrarlos.

---

## 4. Llave de firma y secretos en GitHub

### 4.1 Crear la llave de firma (una sola vez en la vida)

Android exige que cada app esté firmada con una llave. Se crea en tu computador con una
herramienta de Java llamada `keytool`.

**a) Instala Java (si PowerShell dice "el término 'keytool' no se reconoce")**

1. Abre **PowerShell** y escribe:

   ```
   winget install EclipseAdoptium.Temurin.17.JDK
   ```

   (Si `winget` tampoco existe, descarga "Temurin 17 (LTS) JDK, Windows x64, .msi" desde
   adoptium.net y ábrelo; en el instalador activa la opción **"Set JAVA_HOME variable"** y
   **"Add to PATH"**.)
2. **Cierra PowerShell y ábrelo de nuevo** (si no, no ve el programa recién instalado).
3. Comprueba: `keytool -help`. Si muestra una lista de opciones, ya está.

   Atajo: si tienes **Android Studio** instalado, ya trae `keytool`; úsalo con su ruta
   completa: `& "C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe" -help`.

**b) Crea la llave, en una carpeta SEGURA (no en la del proyecto)**

1. Crea una carpeta fuera del proyecto y entra a ella:

   ```
   mkdir $HOME\llaves-android
   cd $HOME\llaves-android
   ```

   ⚠️ **No la crees dentro de `D:\IA_WORK\MDK`**: es la carpeta del código y un archivo
   `.jks` ahí corre el riesgo de subirse a GitHub (el proyecto ya lo ignora, pero no
   conviene arriesgarlo).
2. Escribe (todo en una línea):

   ```
   keytool -genkeypair -v -keystore mdkraft-upload.jks -alias mdkraft -keyalg RSA -keysize 2048 -validity 10000
   ```

3. Te pregunta una **contraseña** (invéntala larga y anótala; al escribirla **no se ve
   nada en pantalla**, es normal), tu nombre, organización, ciudad, etc. (puedes poner
   VDC Process Lab, Bogotá, CO), y confirmar con `yes`. Al final pregunta la contraseña de
   la llave: pulsa Enter para usar la **misma**.
4. Se crea el archivo `mdkraft-upload.jks` en esa carpeta.

> ⚠️ **Haz copia de seguridad ya** del `.jks` y de las contraseñas (USB + gestor de
> contraseñas). **Nunca lo subas al repositorio.** Si lo pierdes, Google puede restablecer
> la llave de subida contactando a soporte, pero es un trámite largo.

### 4.2 Convertir la llave a texto

GitHub solo guarda texto. En PowerShell:

```
[Convert]::ToBase64String([IO.File]::ReadAllBytes("$HOME\llaves-android\mdkraft-upload.jks")) | Set-Clipboard
```

Eso copia el texto al portapapeles (se pega en el siguiente paso).

### 4.3 Guardar los secretos en GitHub

1. Abre `github.com/earubioc/mdk` → **Settings → Secrets and variables → Actions → New
   repository secret**.
2. Crea estos 4 secretos (nombre exacto; en "Secret" va el valor):

| Nombre | Valor |
|---|---|
| `MDK_KEYSTORE_BASE64` | el texto que copiaste en 4.2 |
| `MDK_KEYSTORE_PASSWORD` | la contraseña del paso 4.1 |
| `MDK_KEY_ALIAS` | `mdkraft` |
| `MDK_KEY_PASSWORD` | la misma contraseña (o la de la llave si la separaste) |

> **Compilación de pruebas vs. de producción (automático):** las compilaciones de pruebas
> (PRs y ejecuciones normales) traen un botoncito extra **🧪 Pro OFF/ON** en la fila de
> arriba que simula Pro encendido o apagado, para que pruebes los dos estados sin pagar. Las
> de **producción** (al subir una etiqueta `vX.Y.Z`, o ejecutando a mano **Run workflow
> marcando `release`**) no lo traen. Sube a Google Play solo compilaciones de producción.

---

## 5. Compilar la app (GitHub lo hace por ti)

La app se compila en la nube de GitHub: no instalas Android Studio.

1. En GitHub, el cambio de Android debe estar en la rama `main` (mediante *Pull request →
   Merge*). Pídeme que lo prepare si aún no está.
2. Ve a la pestaña **Actions → Android → Run workflow** (botón a la derecha; deja
   **`release` sin marcar** para una versión de pruebas) → **Run workflow**. También se ejecuta solo en cada cambio de Android.
3. Espera unos 5–10 minutos hasta ver la marca verde ✅. Si sale ❌ roja, copia el
   mensaje de error y envíamelo.
4. Entra a esa ejecución y baja a **Artifacts → MDKraft** (descarga un `.zip`). Dentro hay:
   - `MDKraft.apk`: el instalador para **probar en tu teléfono**.
   - `MDKraft.aab`: el archivo que **se sube a Google Play** (Play ya no acepta `.apk`
     para apps nuevas).

Cada ejecución sube sola el "número de versión" interno (`versionCode`), que Google exige
distinto en cada subida.

---

## 6. Probar en tu teléfono

1. Pasa `MDKraft.apk` al teléfono (cable, Drive, correo).
2. Ábrelo. Android pedirá permiso para **instalar apps de esta fuente**: acéptalo solo
   para esta instalación.
3. Revisa esta lista:
   - [ ] Abre, escribe y la vista previa funciona.
   - [ ] Al abrir la app aparece la **pantalla de inicio con recientes**; tocar uno lo abre.
   - [ ] **Abrir** un archivo `.md` y **guardar** (botón 💾) y **guardar como**.
   - [ ] **Exportar PDF** abre el diálogo de impresión → "Guardar como PDF".
   - [ ] El **zoom** son dos botoncitos translúcidos (A+ / A−) abajo a la derecha del documento.
   - [ ] Con **🧪 Pro OFF**: abrir un `.html` o `.py` muestra el aviso de Pro; «Guardar como»
         marca los formatos Pro con 🔒. Los botones **🔓 Pro** y **🧪** están arriba.
   - [ ] Con **🧪 Pro ON**: se abren y guardan HTML y código; en un `.html`, `.svg`, `.tsx`
         o `.jsx` aparece el botón **▶ Vista previa** y muestra el resultado en una ventana
         aparte (✕ para volver).
4. Para probar el **cobro real** necesitas la versión instalada **desde Google Play**
   (parte 7.5), no el APK: el botón 🔓 Pro solo puede comprar si Play lo instaló.

---

## 7. Play Console: crear la app y llenar los formularios

### 7.0 Antes de todo (una vez)

- **Verificación de la cuenta**: Play Console puede pedirte verificar identidad, un
  teléfono y un dispositivo Android. Complétalo (**verifica** lo que te pida).
- **Perfil de pagos / comerciante**: necesario para poder **cobrar** los US$ 2,99. En la
  consola, busca el aviso para **configurar el perfil de pagos** (nombre, dirección,
  datos bancarios, impuestos). Hazlo antes de la parte 7.4.

### 7.1 Crear la app

1. **Play Console → Todas las apps → Crear app**.
2. Nombre: **MD Kraft Markdown Editor**.
3. Idioma predeterminado: **Español (Latinoamérica)**.
4. **App** (no juego). **Gratuita** (⚠️ no se puede cambiar de gratis a pago después; las
   compras dentro de la app sí están permitidas).
5. Marca las dos declaraciones (políticas y leyes de exportación) y **Crear app**.

### 7.2 Los formularios obligatorios ("Configura tu app" en el Panel)

Haz cada tarea que aparece en la lista del Panel:

**Política de privacidad:** pega `https://earubioc.github.io/mdk/privacidad.html`.

**Acceso a la app:** "Todas las funciones están disponibles sin acceso especial".

**Anuncios:** responde **No, mi app no contiene anuncios**.

**Clasificación de contenido:** completa el cuestionario (correo, categoría
**Utilidad/Productividad**). Responde **No** a todo lo de violencia, sexo, drogas, juego,
etc. Resultado esperado: apta para todos.

**Público objetivo:** marca **18 años o más** (si marcas menores de 13 entras a la política
de "Familias", con reglas mucho más estrictas).

**Seguridad de los datos (Data safety):** al no haber anuncios ni analítica, es simple
(**verifica** cada pantalla):
- ¿Recopila o comparte datos del usuario? **No**.
- Las compras las procesa Google Play; tú no recibes datos de pago, **no** se declaran.
- Tus documentos nunca salen del teléfono.
- ¿Datos cifrados en tránsito? No aplica, o **Sí**.

**ID de publicidad (Advertising ID):** declara **No, la app no usa ID de publicidad**.

**Categoría y contacto:** categoría **Productividad**; correo `earubioc@vdcprocesslab.com`;
sitio web `https://earubioc.github.io/mdk/`.

### 7.3 Ficha de la tienda (lo que ve el público)

**Principal → Ficha de Play Store → Ficha principal**. Textos para copiar y pegar:

**Nombre (máx. 30):** `MD Kraft Markdown Editor`

**Descripción breve (máx. 80):**
`Editor de Markdown simple y sin anuncios. Pro: HTML, código y vista previa.`

**Descripción completa (español):**

```
MD Kraft es un editor de Markdown simple y sin fricción.

• Abre y edita archivos .md, .markdown y .txt — gratis para siempre, sin anuncios
• Convierte líneas en encabezados, listas, citas y negrita con un toque
• Vista previa en vivo, o editor y vista previa lado a lado
• Varias pestañas, índice del documento, buscador y archivos recientes
• Modo matemático: fórmulas LaTeX en línea y en bloque
• Exporta a PDF o imprime con el diálogo de Android
• Modo oscuro, zoom y skins personalizables
• Español e inglés

MD KRAFT PRO (compra única, sin suscripción)
• Abre, edita y guarda HTML, CSS, JavaScript, JSON, Python y otros formatos de texto y código
• Vista previa real de páginas HTML, SVG y componentes React (.tsx): revisa al instante lo que genera una IA

Tus documentos se quedan en tu dispositivo: MD Kraft no los envía a ningún servidor.
```

**Descripción completa (inglés, para añadir como idioma):**

```
MD Kraft is a simple, no-friction Markdown editor.

• Open and edit .md, .markdown and .txt files — free forever, no ads
• Turn lines into headings, lists, quotes and bold with one tap
• Live preview, or editor and preview side by side
• Multiple tabs, document outline, search and recent files
• Math mode: inline and block LaTeX formulas
• Export to PDF or print with the Android dialog
• Dark mode, zoom and customizable skins
• Spanish and English

MD KRAFT PRO (one-time purchase, no subscription)
• Open, edit and save HTML, CSS, JavaScript, JSON, Python and other text and code formats
• Real preview of HTML pages, SVG and React components (.tsx): instantly check what an AI generates

Your documents stay on your device: MD Kraft never sends them to any server.
```

**Imágenes obligatorias:**

| Pieza | Medida | Nota |
|---|---|---|
| Ícono | 512 × 512 px, PNG | el logo "+" de MDK sobre fondo sólido |
| Gráfico de funciones | 1024 × 500 px, PNG/JPG | banner con el nombre y el "+" |
| Capturas de teléfono | mínimo 2 (hasta 8), proporción 9:16 | haz capturas reales de la app instalada |

Las capturas del sitio (`site/img/`) son de Windows: **no sirven**; toma las tuyas desde
el teléfono (Power + bajar volumen). Si quieres, pídeme que genere el ícono de 512 px y el
gráfico de funciones.

### 7.4 Crear la compra "MD Kraft Pro"

⚠️ Play solo te deja crear productos **después de subir una primera versión** de la app
(parte 7.5). Hazlo justo después.

1. **Monetizar → Productos → Productos integrados en la app → Crear producto**.
2. **ID del producto:** `pro` (exactamente así, minúsculas; **no se puede cambiar** luego,
   y debe coincidir con el código).
3. Nombre: `MD Kraft Pro`. Descripción: `Abre, edita y guarda HTML, CSS, JavaScript, JSON,
   Python y otros formatos, y previsualiza HTML, SVG y componentes React. Pago único.`
4. **Precio:** US$ **2,99**. Google convierte el precio a las otras monedas (puedes
   editarlos por país).
5. **Activar** el producto (estado *Activo*). Es un producto **único, no consumible**: se
   compra una sola vez.

### 7.5 Subir la app a la prueba interna

La **prueba interna** es la más rápida (sin revisión larga) y sirve para probar el cobro.

1. **Prueba y lanzamiento → Pruebas → Prueba interna → Crear versión**.
2. En "Firma de apps de Play" acepta **continuar** (Google guarda la llave maestra; tu
   `.jks` queda como llave de **subida**).
3. Sube **`MDKraft.aab`** (de la parte 5).
4. Nombre de la versión (automático) y notas: "Primera versión".
5. **Guardar → Revisar versión → Iniciar lanzamiento a prueba interna**.
6. En la pestaña **Testers** crea una lista con **tu correo Gmail** y copia el **enlace de
   participación**. Ábrelo en tu teléfono, acepta y **instala desde Play**.
7. Ve a **Configuración (de toda la cuenta) → Pruebas de licencia** y agrega tu Gmail: así
   puedes "comprar" `pro` **sin que te cobren**.
8. Prueba: abre un `.html` → aviso de Pro → **Desbloquear** → aparece la hoja de compra de
   Google Play con el precio **US$ 2,99** → compra de prueba → se desbloquean los formatos
   y el botón 🔓 Pro se oculta.

Si el botón 🔓 no abre la compra: revisa que el producto esté **Activo**, que instalaste
desde el enlace de la prueba (no el APK) y que tu cuenta está en *Pruebas de licencia*. A
veces tarda hasta unas horas en propagarse.

---

## 8. Prueba cerrada de 14 días (cuentas personales nuevas)

Si tu cuenta de desarrollador es **personal** y se creó **después de noviembre de 2023**,
Google exige, antes de poder publicar en producción, una **prueba cerrada con al menos 12
testers** que permanezcan **14 días seguidos**. (**Verifica** en *Panel → "Publicar tu
app"*: si no aparece este requisito, sáltate esta parte. Las cuentas de **organización**
verificadas normalmente no lo necesitan.)

1. **Pruebas → Prueba cerrada → Crear pista** (o usar la que existe) → **Crear versión** →
   sube el **mismo `.aab`** (o uno nuevo; el `versionCode` debe ser mayor al anterior,
   y se sube solo en cada compilación de GitHub).
2. **Testers:** crea una lista con **12 o más correos Gmail** (tú puedes sumar más para
   asegurar: si alguno sale, ya no llegas a 12). Copia el enlace de participación y
   envíaselo.
3. Cada tester debe **abrir el enlace, aceptar y descargar la app**, y **mantenerla
   instalada 14 días seguidos**. Pídeles que la abran de vez en cuando.
4. Puedes usar una compilación de pruebas (con el botón 🧪) para que los testers prueben
   también los formatos Pro sin pagar; para producción sube una compilación `release`.
5. Pasados los 14 días, en el Panel aparece **"Solicitar acceso a producción"**: responde
   el cuestionario (cómo reclutaste testers, qué comentarios recibiste, qué cambiaste).
   Google responde en unos 7 días.

---

## 9. Publicar en producción

1. Ejecuta **Actions → Android → Run workflow** **marcando `release`** (parte 5) y baja el
   nuevo **`MDKraft.aab`** (compilación de producción, sin el botón 🧪, con un
   `versionCode` mayor).
2. **Producción → Crear versión** → sube ese `.aab` → notas de la versión → **Guardar →
   Revisar → Iniciar lanzamiento a producción**.
3. Países: elige **todos** (o los que quieras) en **Producción → Países/regiones**.
4. Google revisa la app: la **primera** revisión puede tardar de 1 a 7 días (a veces más).
   Te llega un correo cuando se aprueba o si hay algo que corregir.

### Si Google rechaza la app

Los motivos más comunes y cómo arreglarlos:
- **"Versión de API objetivo" demasiado baja:** Google sube cada año el mínimo; el
  proyecto está en `targetSdk 36`. Si tu consola exige uno mayor, avísame y lo subo.
- **Política de privacidad:** la URL debe abrir sin error (hay que haber fusionado el
  cambio a `main` para que GitHub Pages la publique).
- **Seguridad de los datos / ID de publicidad:** deben decir que **no** hay anuncios ni
  recopilación de datos (parte 7.2).
- **Compras:** el producto `pro` debe existir y estar **Activo**.

---

## 10. Después de publicar

**Ingresos:** Play Console → Informes financieros. Google se queda el **15 %** de las
primeras US$ 1.000.000 al año (**verifica**), así que de cada US$ 2,99 quedan alrededor de
US$ 2,54, antes de impuestos locales.

**Promoción:** la página web de MDK (earubioc.github.io/mdk) puede anunciar también la
versión de Android con el mismo mensaje: *gratis, sin publicidad y para siempre en Markdown
y texto; Pro opcional para código y vista previa de HTML*.

### Publicar una versión nueva

1. En `package.json` sube `"version"` (por ejemplo `3.0.1`) y agrega la nota en
   `CHANGELOG.md`.
2. Fusiona a `main`, ejecuta el workflow **Android** marcando `release` y baja el `.aab`.
3. Play Console → **Producción → Crear versión** → sube el `.aab` → lanzar.

---

## 11. Problemas frecuentes

| Síntoma | Causa probable y solución |
|---|---|
| El workflow sale en rojo | Copia el error de **Actions** y envíamelo; casi siempre es un detalle de configuración. |
| El botón 🔓 Pro no abre la compra | Producto `pro` inactivo, instalaste el APK en vez del enlace de Play, o falta tu correo en *Pruebas de licencia*. |
| Pagué y sigue bloqueado | Cierra y abre la app; Google tarda unos segundos en confirmar. Si es una compra pendiente, se aplica al completarse. |
| "Se requiere la llave de firma" | Falta algún secreto `MDK_KEYSTORE_*` o están mal escritos. |

---

## 12. Lista final (marca todo antes de publicar)

- [ ] GitHub: los 4 secretos de firma creados.
- [ ] Llave `.jks` y contraseñas **respaldadas** fuera del computador.
- [ ] Probado en teléfono: abrir, guardar, PDF, zoom, aviso de Pro, ▶ Vista previa.
- [ ] Play Console: política de privacidad, anuncios = No, clasificación, público 18+,
      seguridad de datos = no recopila, ficha con ícono, gráfico y capturas.
- [ ] Producto `pro` activo a US$ 2,99.
- [ ] Prueba cerrada de 14 días con 12 testers (si aplica).
- [ ] `.aab` de producción compilado con `release` marcado.
