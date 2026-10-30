# Manual para dummies: MD Kraft en Android (de cero a la Play Store, con anuncios)

Guía sin tecnicismos para tener **MD Kraft Markdown Editor** publicada en Google Play,
con anuncios de AdMob y la compra de **US$ 1,99 para quitarlos**. Asume que tienes una
cuenta de desarrollador de Google Play **sin ninguna app subida** y que no has abierto
AdMob.

> **Importante:** Google cambia pantallas, nombres de botones y requisitos con frecuencia.
> Los pasos de este manual son el camino general; donde dice **(verifica)** compara con lo
> que te muestre la consola en ese momento. Los plazos y números (14 días, 12 testers,
> nivel de API) son los vigentes cuando se escribió el manual.

---

## 0. El mapa completo (léelo una vez)

Hay **dos cuentas de Google distintas** que se conectan al final:

| Cuenta | Para qué sirve | Dónde |
|---|---|---|
| **AdMob** | Cobra por los anuncios que ven tus usuarios | admob.google.com |
| **Play Console** | Publica la app y cobra los US$ 1,99 | play.google.com/console |

El orden recomendado (no lo cambies, cada paso depende del anterior):

1. Abrir AdMob y crear los **3 identificadores** de la app (parte 3).
2. Crear la **llave de firma** y guardar los **secretos** en GitHub (parte 4).
3. **Compilar** el instalador en GitHub (parte 5) y probarlo en tu teléfono (parte 6).
4. Crear la app en **Play Console**, llenar los formularios y subir el `.aab` (parte 7).
5. **Prueba cerrada de 14 días** con 12 personas (parte 8; solo si tu cuenta es personal y
   nueva, **verifica** en tu consola).
6. Publicar en **producción** con los anuncios reales (parte 9).
7. **Enlazar** AdMob con la app ya publicada (parte 10).

Tiempo realista: unas 3 horas de trabajo tuyo, más 14 días de espera de la prueba cerrada
y unos días de revisión de Google.

---

## 1. Cómo se ve la publicidad en MD Kraft

Hay dos tipos de anuncio:

- **Banner**: una franja pequeña fija en la parte de abajo de la pantalla. Normalmente es
  una imagen; casi nunca video.
- **Intersticial**: ocupa **toda la pantalla** y puede ser un **video**. Tiene un botón de
  cerrar (aparece a los pocos segundos). Es el que pediste "cada 5 documentos".

Reglas con las que quedó programado (en `Monetization.java`, constantes
`INTERSTITIAL_EVERY` y `INTERSTITIAL_COOLDOWN_MS`; se cambian en una línea):

- Cuenta un documento cada vez que **abres un archivo o creas una pestaña nueva**.
- Al llegar al **5.º** documento, se muestra el intersticial (si ya cargó).
- Nunca aparece en los **primeros 3 minutos** de abrir la app, ni antes de 3 minutos desde
  el anterior.
- **Nunca** aparece mientras escribes: solo en el momento de abrir/crear un documento.
- Si el usuario compra **Quitar anuncios**, desaparecen el banner y los intersticiales
  para siempre (también si reinstala, porque Google Play recuerda la compra).
- En Europa, Reino Unido y Suiza, la primera vez sale un aviso de **consentimiento**
  (obligatorio por ley) y aparece un botón 🔒 para cambiarlo después.

Más anuncios = más ingresos pero más usuarios que desinstalan. Empieza con 1 de cada 5 y
ajusta con datos.

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

## 3. AdMob: abrir la cuenta y crear los identificadores

### 3.1 Crear la cuenta

1. Entra a **admob.google.com** con tu cuenta de Google.
2. Elige tu **país**, **zona horaria** y **moneda de pago**. ⚠️ Estos tres **no se pueden
   cambiar después**. Moneda recomendada: **USD**.
3. Acepta los términos. Listo: ya tienes cuenta.

### 3.2 Registrar la app

1. Menú **Aplicaciones → Agregar aplicación**.
2. Plataforma: **Android**.
3. "¿Tu app aparece en Google Play?": **No** (todavía no está publicada; se enlaza en la
   parte 10).
4. Nombre: **MD Kraft**.
5. Pulsa **Agregar**. AdMob te muestra el **ID de la app**. Es así:
   `ca-app-pub-1234567890123456~1234567890` (tiene una **tilde `~`**).
   **Cópialo** en un bloc de notas: es el secreto `MDK_ADMOB_APP_ID`.

### 3.3 Crear los dos bloques de anuncios

Dentro de la app en AdMob: **Bloques de anuncios → Agregar bloque de anuncios**.

> **Casilla "Ofertas para socios" / "Utilizo esta unidad para ofertas en tiempo real en otra
> plataforma de mediación": déjala SIN marcar** en los dos bloques. Es solo para quien usa una
> mediación que no es AdMob; si la marcas, la unidad no puede usar las campañas de AdMob ni
> la demanda de Google (o sea, no ganarías con ella) y **no se puede cambiar después**.

**Bloque 1: banner**
1. Formato: **Banner**.
2. Nombre: `mdkraft_banner`.
3. **Crear bloque**. Copia el ID: `ca-app-pub-1234567890123456/1111111111`
   (tiene una **barra `/`**). Es el secreto `MDK_ADMOB_BANNER_ID`.

**Bloque 2: intersticial**
1. Formato: **Intersticial**.
2. Tipo de anuncio: deja **Imagen y video** (así salen videos).
3. Nombre: `mdkraft_interstitial`.
4. **Crear bloque**. Copia el ID. Es el secreto `MDK_ADMOB_INTERSTITIAL_ID`.

Anota los **tres** IDs. No los pierdas ni los pegues en el código: van como secretos.

### 3.4 Datos de pago e impuestos

1. Menú **Pagos → Información de pago**: nombre, dirección y forma de cobro.
2. Cuando tus ganancias lleguen a **US$ 10**, Google envía por **correo postal** un **PIN**
   de verificación de dirección; hay que ingresarlo en AdMob. Es lento (semanas): ten
   presente que la dirección debe ser real y correcta.
3. **Información fiscal**: AdMob te pide un formulario de impuestos (para quien no vive en
   EE. UU. es el equivalente al W-8BEN). Sigue el asistente.
4. El pago se hace cuando acumulas **US$ 100** (umbral por defecto, **verifica**).

### 3.5 Mensaje de consentimiento (obligatorio para Europa)

1. Menú **Privacidad y mensajería**.
2. Abre **Europa (RGPD)** → **Crear mensaje**.
3. Elige tu app **MD Kraft** y deja las opciones recomendadas (consentimiento con
   opciones de administrar). Idioma(s): español e inglés.
4. **Publicar**. Sin este mensaje publicado, en Europa no se mostrarán anuncios.

### 3.6 Reglas de oro de AdMob

- **Jamás hagas clic en tus propios anuncios reales** ni pidas a otros que lo hagan:
  Google te **cierra la cuenta** y no la recupera.
- Para probar usa solo los anuncios **de prueba** (los que trae la app por defecto: dicen
  *Test Ad*).
- Al principio los anuncios reales pueden salir pocos o en blanco hasta que la app esté
  publicada y aprobada. Es normal.

---

## 4. Llave de firma y secretos en GitHub

### 4.1 Crear la llave de firma (una sola vez en la vida)

Android exige que cada app esté firmada con una llave. Se crea en tu computador.

1. Abre **PowerShell** y escribe (todo en una línea):

   ```
   keytool -genkeypair -v -keystore mdkraft-upload.jks -alias mdkraft -keyalg RSA -keysize 2048 -validity 10000
   ```

2. Te pregunta una **contraseña** (invéntala larga y anótala), tu nombre, organización,
   ciudad, etc. (puedes poner VDC Process Lab, Bogotá, CO), y confirmar con `yes`. Al final
   pregunta la contraseña de la llave: pulsa Enter para usar la **misma**.
3. Se crea el archivo `mdkraft-upload.jks` en la carpeta donde estás.

> ⚠️ **Haz copia de seguridad ya** del `.jks` y de las contraseñas (USB + gestor de
> contraseñas). **Nunca lo subas al repositorio.** Si lo pierdes, Google puede restablecer
> la llave de subida contactando a soporte, pero es un trámite largo.

### 4.2 Convertir la llave a texto

GitHub solo guarda texto. En PowerShell:

```
[Convert]::ToBase64String([IO.File]::ReadAllBytes("mdkraft-upload.jks")) | Set-Clipboard
```

Eso copia el texto al portapapeles (se pega en el siguiente paso).

### 4.3 Guardar los secretos en GitHub

1. Abre `github.com/earubioc/mdk` → **Settings → Secrets and variables → Actions → New
   repository secret**.
2. Crea estos 7 secretos (nombre exacto; en "Secret" va el valor):

| Nombre | Valor |
|---|---|
| `MDK_KEYSTORE_BASE64` | el texto que copiaste en 4.2 |
| `MDK_KEYSTORE_PASSWORD` | la contraseña del paso 4.1 |
| `MDK_KEY_ALIAS` | `mdkraft` |
| `MDK_KEY_PASSWORD` | la misma contraseña (o la de la llave si la separaste) |
| `MDK_ADMOB_APP_ID` | el ID con `~` (parte 3.2) |
| `MDK_ADMOB_BANNER_ID` | el ID del banner (parte 3.3) |
| `MDK_ADMOB_INTERSTITIAL_ID` | el ID del intersticial (parte 3.3) |

> **Truco de seguridad:** mientras no estés en producción (partes 6 a 8), **no crees** los
> tres secretos `MDK_ADMOB_*`. Sin ellos, la app usa anuncios **de prueba** y nadie puede
> dañar tu cuenta de AdMob por error. Los creas justo antes de la parte 9.

---

## 5. Compilar la app (GitHub lo hace por ti)

La app se compila en la nube de GitHub: no instalas Android Studio.

1. En GitHub, el cambio de Android debe estar en la rama `main` (mediante *Pull request →
   Merge*). Pídeme que lo prepare si aún no está.
2. Ve a la pestaña **Actions → Android → Run workflow** (botón a la derecha) → **Run
   workflow**. También se ejecuta solo en cada cambio de Android.
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
   - [ ] **Abrir** un archivo `.md` y **guardar** (botón 💾) y **guardar como**.
   - [ ] **Exportar PDF** abre el diálogo de impresión → "Guardar como PDF".
   - [ ] Abajo se ve un banner con la etiqueta **Test Ad**.
   - [ ] Abre/crea **5 documentos** (esperando 3 minutos desde que abriste la app):
         aparece un anuncio a pantalla completa (de prueba).
   - [ ] Aparece el botón **🚫** (el precio sale cuando el producto exista en Play,
         parte 7.4; antes de eso es normal que muestre solo "Ads" y no abra la compra).
4. Para pruebas de la compra real necesitas la versión instalada **desde Google Play**
   (parte 7.5), no el APK.

---

## 7. Play Console: crear la app y llenar los formularios

### 7.0 Antes de todo (una vez)

- **Verificación de la cuenta**: Play Console puede pedirte verificar identidad, un
  teléfono y un dispositivo Android. Complétalo (**verifica** lo que te pida).
- **Perfil de pagos / comerciante**: necesario para poder **cobrar** los US$ 1,99. En la
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

**Anuncios:** responde **Sí, mi app contiene anuncios**.

**Clasificación de contenido:** completa el cuestionario (correo, categoría
**Utilidad/Productividad**). Responde **No** a todo lo de violencia, sexo, drogas, juego,
etc. Resultado esperado: apta para todos.

**Público objetivo:** marca **18 años o más**. (Si marcas menores de 13 entras a la
política de "Familias", con reglas de anuncios mucho más estrictas.)

**Seguridad de los datos (Data safety):** es el formulario más delicado. Respuestas
recomendadas (**verifica** cada pantalla; si dudas, busca en el Centro de ayuda de AdMob
"Data disclosure guidance" y copia esa tabla):
- ¿Recopila o comparte datos? **Sí**.
- Datos que se recopilan (los recopila el SDK de anuncios de Google):
  - **Ubicación aproximada**: recopilada y compartida; finalidad **Publicidad o
    marketing**; **no** es opcional.
  - **Identificadores de dispositivo u otros** (ID de publicidad): recopilado y
    compartido; finalidad **Publicidad o marketing**.
  - **Información y rendimiento de la app** (diagnósticos): recopilada; finalidad
    **Análisis / Publicidad**.
- **No** se recopilan: nombre, correo, archivos, fotos, contactos, **tus documentos**.
  (Los documentos nunca salen del teléfono.)
- Compras: las procesa Google Play; tú no recibes datos de pago, **no** se declaran.
- ¿Datos cifrados en tránsito? **Sí**.
- ¿Pueden pedir que se borren? Marca que **no recopilas datos tuyos** más allá del SDK de
  Google; la política de privacidad explica cómo restablecer el ID de publicidad.

**ID de publicidad (Advertising ID):** declara **Sí, la app usa ID de publicidad**,
finalidad **Publicidad o marketing**.

**Categoría y contacto:** categoría **Productividad**; correo `earubioc@vdcprocesslab.com`;
sitio web `https://earubioc.github.io/mdk/`.

### 7.3 Ficha de la tienda (lo que ve el público)

**Principal → Ficha de Play Store → Ficha principal**. Textos para copiar y pegar:

**Nombre (máx. 30):** `MD Kraft Markdown Editor`

**Descripción breve (máx. 80):**
`Editor de Markdown simple: abre .md, da formato con un clic y exporta a PDF.`

**Descripción completa (español):**

```
MD Kraft es un editor de Markdown simple y sin fricción.

• Abre y edita archivos .md, .markdown y .txt
• Convierte líneas en encabezados, listas, citas y negrita con un toque
• Vista previa en vivo, o editor y vista previa lado a lado
• Varias pestañas, índice del documento y buscador
• Modo matemático: fórmulas LaTeX en línea y en bloque
• Vista "Hoja" y tamaño de página: Carta, Oficio, A4, A5...
• Exporta a PDF o imprime con el diálogo de Android
• Modo oscuro, zoom y skins personalizables
• Español e inglés

Tus documentos se quedan en tu dispositivo: MD Kraft no los envía a ningún servidor.

La app es gratuita con anuncios. Con una compra única puedes quitar todos los anuncios.
```

**Descripción completa (inglés, para añadir como idioma):**

```
MD Kraft is a simple, no-friction Markdown editor.

• Open and edit .md, .markdown and .txt files
• Turn lines into headings, lists, quotes and bold with one tap
• Live preview, or editor and preview side by side
• Multiple tabs, document outline and search
• Math mode: inline and block LaTeX formulas
• "Sheet" view and page size: Letter, Legal, A4, A5...
• Export to PDF or print with the Android dialog
• Dark mode, zoom and customizable skins
• Spanish and English

Your documents stay on your device: MD Kraft never sends them to any server.

The app is free with ads. A one-time purchase removes all ads.
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

### 7.4 Crear la compra "Quitar anuncios"

⚠️ Play solo te deja crear productos **después de subir una primera versión** de la app
(parte 7.5). Hazlo justo después.

1. **Monetizar → Productos → Productos integrados en la app → Crear producto**.
2. **ID del producto:** `remove_ads` (exactamente así, minúsculas; **no se puede cambiar**
   luego, y debe coincidir con el código).
3. Nombre: `Quitar anuncios`. Descripción: `Elimina todos los anuncios de MD Kraft para
   siempre.`
4. **Precio:** US$ **1,99**. Google convierte el precio a las otras monedas (puedes
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
   puedes "comprar" `remove_ads` **sin que te cobren**.
8. Prueba: pulsa 🚫 → aparece la hoja de compra de Google Play con el precio **US$ 1,99**
   → compra de prueba → el banner y los anuncios desaparecen y el botón 🚫 se oculta.

Si el botón 🚫 no sale: revisa que el producto esté **Activo**, que instalaste desde el
enlace de la prueba (no el APK) y que tu cuenta está en *Pruebas de licencia*. A veces
tarda hasta unas horas en propagarse.

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
4. Usa esta fase con los **anuncios de prueba** (sin secretos `MDK_ADMOB_*`): así tus
   testers no pueden dañar tu cuenta de AdMob tocando anuncios reales.
5. Pasados los 14 días, en el Panel aparece **"Solicitar acceso a producción"**: responde
   el cuestionario (cómo reclutaste testers, qué comentarios recibiste, qué cambiaste).
   Google responde en unos 7 días.

---

## 9. Publicar en producción (con anuncios reales)

1. **Ahora sí** crea los 3 secretos `MDK_ADMOB_*` en GitHub (parte 4.3).
2. Vuelve a ejecutar **Actions → Android → Run workflow** (parte 5) y baja el nuevo
   **`MDKraft.aab`** (trae los IDs reales y un `versionCode` mayor).
3. **Producción → Crear versión** → sube ese `.aab` → notas de la versión → **Guardar →
   Revisar → Iniciar lanzamiento a producción**.
4. Países: elige **todos** (o los que quieras) en **Producción → Países/regiones**.
5. Google revisa la app: la **primera** revisión puede tardar de 1 a 7 días (a veces más).
   Te llega un correo cuando se aprueba o si hay algo que corregir.

**No uses tu teléfono para hacer clic en tus anuncios reales** (ver 3.6). Para seguir
probando, usa un APK compilado sin los secretos `MDK_ADMOB_*`.

### Si Google rechaza la app

Los motivos más comunes y cómo arreglarlos:
- **"Versión de API objetivo" demasiado baja:** Google sube cada año el mínimo; el
  proyecto está en `targetSdk 36`. Si tu consola exige uno mayor, avísame y lo subo.
- **Política de privacidad:** la URL debe abrir sin error (hay que haber fusionado el
  cambio a `main` para que GitHub Pages la publique).
- **Seguridad de los datos / ID de publicidad** incompletos: revisa la parte 7.2.
- **Anuncios:** si dijiste "no contiene anuncios" y los hay, te rechazan.

---

## 10. Después de publicar

1. **Enlazar AdMob con la app publicada:** AdMob → **Aplicaciones → MD Kraft →
   Configuración de la app → Detalles de la tienda → Agregar** y busca *MD Kraft Markdown
   Editor*. Sin enlazar, los anuncios reales rinden poco.
2. **app-ads.txt (recomendado):** AdMob te indica una línea parecida a
   `google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0` que debe publicarse en la
   raíz del **sitio web** que pusiste en la ficha. GitHub Pages de proyecto
   (`earubioc.github.io/mdk`) **no** permite archivos en la raíz del dominio; necesitarás un
   dominio propio (por ejemplo vdcprocesslab.com). Es opcional: sin él los anuncios salen,
   pero con menos demanda.
3. **Ingresos:**
   - Anuncios: AdMob → Informes. Tarda en subir; con pocos usuarios son centavos.
   - Compras: Play Console → Informes financieros. Google se queda el **15 %** de las
     primeras US$ 1.000.000 al año (**verifica**), así que de cada US$ 1,99 quedan
     alrededor de US$ 1,69, antes de impuestos locales.

### Publicar una versión nueva

1. En `package.json` sube `"version"` (por ejemplo `3.0.1`) y agrega la nota en
   `CHANGELOG.md`.
2. Fusiona a `main`, ejecuta el workflow **Android** y baja el `.aab`.
3. Play Console → **Producción → Crear versión** → sube el `.aab` → lanzar.

---

## 11. Problemas frecuentes

| Síntoma | Causa probable y solución |
|---|---|
| El workflow sale en rojo | Copia el error de **Actions** y envíamelo; casi siempre es un detalle de configuración. |
| Banner en blanco | En pruebas: sin internet. En producción: app aún no aprobada/enlazada; espera unos días. |
| No salen intersticiales | Faltan los 5 documentos, o no han pasado 3 minutos desde abrir la app, o aún no cargó el anuncio. |
| El botón 🚫 no aparece | Producto `remove_ads` inactivo, instalaste el APK en vez del enlace de Play, o falta tu correo en *Pruebas de licencia*. |
| Pagué y siguen los anuncios | Cierra y abre la app; Google tarda unos segundos en confirmar. Si es una compra pendiente, se aplica al completarse. |
| "Se requiere la llave de firma" | Falta algún secreto `MDK_KEYSTORE_*` o están mal escritos. |
| AdMob dice "Requiere atención" | Falta completar pagos, impuestos o el mensaje de consentimiento (parte 3.4 y 3.5). |

---

## 12. Lista final (marca todo antes de publicar)

- [ ] AdMob: cuenta, app, 2 bloques, pagos/impuestos, mensaje de consentimiento publicado.
- [ ] GitHub: los 7 secretos creados (los `MDK_ADMOB_*` solo para producción).
- [ ] Llave `.jks` y contraseñas **respaldadas** fuera del computador.
- [ ] Probado en teléfono: abrir, guardar, PDF, banner, intersticial, compra de prueba.
- [ ] Play Console: política de privacidad, anuncios = Sí, clasificación, público 18+,
      seguridad de datos, ID de publicidad, ficha con ícono, gráfico y capturas.
- [ ] Producto `remove_ads` activo a US$ 1,99.
- [ ] Prueba cerrada de 14 días con 12 testers (si aplica).
- [ ] `.aab` de producción compilado **con** los IDs reales.
- [ ] Después de publicar: enlazar AdMob con la tienda.
