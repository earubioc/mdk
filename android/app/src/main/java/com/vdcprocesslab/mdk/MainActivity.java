package com.vdcprocesslab.mdk;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageInfo;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.provider.OpenableColumns;
import android.view.WindowInsets;
import android.widget.LinearLayout;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

/**
 * MDK para Android: la misma interfaz web de escritorio (src/) dentro de un WebView.
 * Esta clase implementa el equivalente de main.js + preload.js: selector de archivos
 * del sistema (SAF), guardado, diálogo de cambios sin guardar e impresión / PDF.
 * El lado JS del puente está en src/overlay/android-bridge.js.
 */
public class MainActivity extends Activity {
    private static final int REQ_OPEN = 1, REQ_SAVE = 2;

    private WebView web;
    private boolean pageReady = false;
    private String pendingOpen = null;      // archivo recibido por intent antes de cargar la página
    private int pendingCallId = -1;         // llamada JS esperando el resultado del selector
    private String pendingSaveContent = null;
    private String pendingSaveName = null;
    private static final int MAX_RECENTS = 20;
    // Formatos de «Guardar como»: etiqueta, extensión, tipo MIME. Con octet-stream Android no
    // le agrega otra extensión al nombre; solo los tipos que conoce se declaran con su MIME.
    private static final String[][] FORMATS = {
            {"Markdown", "md", "application/octet-stream"}, {"Texto", "txt", "text/plain"},
            {"HTML", "html", "text/html"}, {"CSS", "css", "application/octet-stream"},
            {"JavaScript", "js", "application/octet-stream"}, {"TypeScript", "ts", "application/octet-stream"},
            {"JSON", "json", "application/json"}, {"XML", "xml", "text/xml"},
            {"YAML", "yaml", "application/octet-stream"}, {"CSV", "csv", "text/csv"},
            {"Python", "py", "application/octet-stream"}, {"Java", "java", "application/octet-stream"},
            {"C / C++", "c", "application/octet-stream"}, {"SQL", "sql", "application/octet-stream"},
            {"Shell", "sh", "application/octet-stream"}, {"SVG", "svg", "application/octet-stream"}, {"React (TSX)", "tsx", "application/octet-stream"},
            {"React (JSX)", "jsx", "application/octet-stream"}, {"LaTeX", "tex", "application/octet-stream"},
            {"Log", "log", "text/plain"}
    };

    private SharedPreferences prefs;
    private ProUnlock pro;
    private String proState = "false,null,false,false"; // último estado enviado a JS (se reenvía al cargar la página)
    private WebView printView;              // referencia viva mientras el sistema imprime

    // Las rutas que ve el renderer son nombres de archivo; aquí se resuelven a su Uri.
    private final Map<String, Uri> files = new HashMap<>();

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        prefs = getSharedPreferences("mdk", Context.MODE_PRIVATE);
        web = new WebView(this);
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.addView(web, new LinearLayout.LayoutParams(-1, 0, 1f));
        // targetSdk 35+ dibuja a pantalla completa: se reservan las barras del sistema y el teclado.
        root.setBackgroundColor(0xFF222222);
        root.setOnApplyWindowInsetsListener((v, insets) -> {
            if (Build.VERSION.SDK_INT >= 30) {
                android.graphics.Insets b = insets.getInsets(WindowInsets.Type.systemBars()
                        | WindowInsets.Type.displayCutout() | WindowInsets.Type.ime());
                v.setPadding(b.left, b.top, b.right, b.bottom);
                return WindowInsets.CONSUMED;
            }
            v.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(),
                    insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom());
            return insets.consumeSystemWindowInsets();
        });
        setContentView(root);

        pro = new ProUnlock(this, (unlocked, price, testBuild, testOn) -> {
            proState = unlocked + "," + (price == null ? "null" : JSONObject.quote(price)) + "," + testBuild + "," + testOn;
            if (pageReady) js("window.__mdkPro(" + proState + ")");
        });
        pro.start();

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(true);
        s.setAllowFileAccessFromFileURLs(false);
        s.setAllowUniversalAccessFromFileURLs(false);
        s.setSupportZoom(false);

        web.addJavascriptInterface(new Bridge(), "AndroidMdk");
        web.setWebViewClient(new WebViewClient() {
            // Los enlaces del documento se abren fuera: el WebView nunca sale de la app.
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri u = request.getUrl();
                if (!"file".equals(u.getScheme())) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW, u)); } catch (Exception ignored) { }
                }
                return true;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                pageReady = true;
                js("window.__mdkPro(" + proState + ")");
                if (pendingOpen != null) { js("window.__mdkOpenFile(" + pendingOpen + ")"); pendingOpen = null; }
            }
        });
        web.loadUrl("file:///android_asset/index.html");
        handleViewIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        handleViewIntent(intent);
    }

    @Override
    public void onBackPressed() {
        if (pageReady) js("window.__mdkBack()"); else finish();
    }

        @Override protected void onResume() { super.onResume(); pro.resume(); }
    @Override protected void onDestroy() { pro.destroy(); super.onDestroy(); }

    private void js(String code) {
        web.post(() -> web.evaluateJavascript(code, null));
    }

    private void resolve(int id, JSONObject value) {
        js("window.__mdkResolve(" + id + "," + value + ")");
    }

    // ---- Archivos ----

    private void handleViewIntent(Intent intent) {
        if (intent == null || !Intent.ACTION_VIEW.equals(intent.getAction()) || intent.getData() == null) return;
        try {
            String payload = fileJson(intent.getData(), true).toString();
            if (pageReady) js("window.__mdkOpenFile(" + payload + ")"); else pendingOpen = payload;
        } catch (Exception ignored) { }
    }

    private JSONObject fileJson(Uri uri, boolean withContent) throws Exception {
        String name = displayName(uri);
        if (withContent && !isFree(name) && !pro.isPro()) {   // formato Pro sin desbloquear
            askPro();
            return new JSONObject().put("cancelled", true).put("proRequired", true);
        }
        String key = name;
        for (int n = 2; files.containsKey(key) && !files.get(key).equals(uri); n++) key = n + "/" + name;
        files.put(key, uri);
        JSONObject o = new JSONObject().put("cancelled", false).put("filePath", key);
        if (withContent) {
            String content = readText(uri);
            o.put("content", content);
            touchRecent(uri, name, content);
        }
        return o;
    }

    private String displayName(Uri uri) {
        try (Cursor c = getContentResolver().query(uri, new String[]{OpenableColumns.DISPLAY_NAME}, null, null, null)) {
            if (c != null && c.moveToFirst() && c.getString(0) != null) return c.getString(0);
        } catch (Exception ignored) { }
        String seg = uri.getLastPathSegment();
        return seg == null ? "document.md" : seg.substring(seg.lastIndexOf('/') + 1);
    }

    // ---- MD Kraft Pro: Markdown y texto son gratis; el resto de formatos requiere Pro ----

    private boolean es() {
        String l = prefs.getString("language", null);
        if (l == null) l = Locale.getDefault().getLanguage();
        return "es".equals(l);
    }

    private String t(String es, String en) { return es() ? es : en; }

    private static boolean isFree(String name) {
        int dot = name.lastIndexOf('.');
        if (dot < 0) return true;
        String ext = name.substring(dot + 1).toLowerCase(Locale.ROOT);
        return ext.equals("md") || ext.equals("markdown") || ext.equals("txt");
    }

    private void askPro() {
        runOnUiThread(() -> {
            String price = pro.price() != null ? pro.price() : "US$ 2.99";
            new AlertDialog.Builder(this)
                    .setTitle("MD Kraft Pro")
                    .setMessage(t(
                            "Abrir, editar y guardar HTML, CSS, JavaScript, JSON, Python y otros formatos —y previsualizar páginas HTML— es parte de MD Kraft Pro.\n\nPago único de " + price + ", sin suscripción.\n\nMarkdown (.md) y texto (.txt) son gratis para siempre.",
                            "Opening, editing and saving HTML, CSS, JavaScript, JSON, Python and other formats —and previewing HTML pages— is part of MD Kraft Pro.\n\nOne-time payment of " + price + ", no subscription.\n\nMarkdown (.md) and text (.txt) are free forever."))
                    .setPositiveButton(t("Desbloquear", "Unlock"), (d, w) -> pro.buy())
                    .setNegativeButton(t("Ahora no", "Not now"), null)
                    .show();
        });
    }

    // ---- Archivos recientes (pantalla de inicio) ----

    private JSONArray readRecents() {
        try { return new JSONArray(prefs.getString("recents", "[]")); }
        catch (Exception e) { return new JSONArray(); }
    }

    private String snippet(String content) {
        if (content == null) return "";
        for (String line : content.split("\n")) {
            String t = line.replaceFirst("^[#>\\-*+\\s`|]+", "").trim();
            if (!t.isEmpty()) return t.length() > 90 ? t.substring(0, 90) : t;
        }
        return "";
    }

    private void touchRecent(Uri uri, String name, String content) {
        try {
            String key = uri.toString();
            JSONArray list = new JSONArray();
            list.put(new JSONObject().put("uri", key).put("name", name)
                    .put("time", System.currentTimeMillis()).put("snippet", snippet(content)));
            JSONArray old = readRecents();
            for (int i = 0; i < old.length() && list.length() < MAX_RECENTS; i++) {
                JSONObject o = old.getJSONObject(i);
                if (!key.equals(o.optString("uri"))) list.put(o);
            }
            prefs.edit().putString("recents", list.toString()).apply();
        } catch (Exception ignored) { }
    }

    private void removeRecent(String uri) {
        try {
            JSONArray list = new JSONArray(), old = readRecents();
            for (int i = 0; i < old.length(); i++) {
                JSONObject o = old.getJSONObject(i);
                if (!uri.equals(o.optString("uri"))) list.put(o);
            }
            prefs.edit().putString("recents", list.toString()).apply();
        } catch (Exception ignored) { }
    }

    private static String baseName(String path) {
        return path.substring(path.lastIndexOf('/') + 1);
    }

    private static int persistFlags() {
        return Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION
                | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION;
    }

    private String readText(Uri uri) throws Exception {
        try (InputStream in = getContentResolver().openInputStream(uri)) {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            byte[] buf = new byte[16384];
            for (int n; (n = in.read(buf)) > 0; ) out.write(buf, 0, n);
            return new String(out.toByteArray(), StandardCharsets.UTF_8);
        }
    }

    private void writeText(Uri uri, String content) throws Exception {
        try (OutputStream out = getContentResolver().openOutputStream(uri, "wt")) {
            out.write(content.getBytes(StandardCharsets.UTF_8));
        }
    }

    @Override
    protected void onActivityResult(int req, int result, Intent data) {
        if (req != REQ_OPEN && req != REQ_SAVE) { super.onActivityResult(req, result, data); return; }
        int id = pendingCallId;
        pendingCallId = -1;
        try {
            if (result != RESULT_OK || data == null || data.getData() == null) {
                resolve(id, new JSONObject().put("cancelled", true));
                return;
            }
            Uri uri = data.getData();
            try {
                getContentResolver().takePersistableUriPermission(uri,
                        data.getFlags() & (Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION));
            } catch (Exception ignored) { }
            if (req == REQ_OPEN) {
                resolve(id, fileJson(uri, true));
            } else {
                writeText(uri, pendingSaveContent);
                touchRecent(uri, displayName(uri), pendingSaveContent);
                resolve(id, fileJson(uri, false));
            }
        } catch (Exception e) {
            resolve(id, error(e));
        }
    }

    private JSONObject ok() {
        try { return new JSONObject().put("cancelled", false); }
        catch (Exception x) { return new JSONObject(); }
    }

    private JSONObject error(Exception e) {
        try { return new JSONObject().put("cancelled", true).put("error", String.valueOf(e.getMessage())); }
        catch (Exception x) { return new JSONObject(); }
    }

    /** «Guardar como»: el usuario elige el formato (extensión) y luego el selector del sistema la carpeta. */
    private void chooseFormatAndSave(int id, String content, String name, String title) {
        int dot = name.lastIndexOf('.');
        String base = dot > 0 ? name.substring(0, dot) : name;
        String ext = dot > 0 ? name.substring(dot + 1).toLowerCase(Locale.ROOT) : "md";
        // La extensión actual va primero (si es una de las conocidas).
        java.util.List<String[]> list = new java.util.ArrayList<>();
        for (String[] f : FORMATS) if (f[1].equals(ext)) list.add(f);
        for (String[] f : FORMATS) if (!f[1].equals(ext)) list.add(f);
        String[] labels = new String[list.size()];
        for (int i = 0; i < labels.length; i++) {
            String[] f = list.get(i);
            labels[i] = f[0] + "  (." + f[1] + ")" + (isFree("x." + f[1]) || pro.isPro() ? "" : "  🔒 Pro");
        }
        new AlertDialog.Builder(this)
                .setTitle(title)
                .setItems(labels, (d, which) -> {
                    String[] f = list.get(which);
                    if (!isFree("x." + f[1]) && !pro.isPro()) {
                        askPro();
                        try { resolve(id, new JSONObject().put("cancelled", true)); } catch (Exception ignored) { }
                        return;
                    }
                    pendingCallId = id;
                    pendingSaveContent = content;
                    startActivityForResult(new Intent(Intent.ACTION_CREATE_DOCUMENT)
                            .addCategory(Intent.CATEGORY_OPENABLE)
                            .addFlags(persistFlags())
                            .setType(f[2])
                            .putExtra(Intent.EXTRA_TITLE, base + "." + f[1]), REQ_SAVE);
                })
                .setOnCancelListener(d -> {
                    try { resolve(id, new JSONObject().put("cancelled", true)); } catch (Exception ignored) { }
                })
                .show();
    }

    // ---- Puente JS (equivalente de preload.js) ----

    private class Bridge {
        @JavascriptInterface
        public String getLanguage() {
            String saved = prefs.getString("language", null);
            if (saved != null) return saved;
            return Locale.getDefault().getLanguage().equals("es") ? "es" : "en";
        }

        @JavascriptInterface
        public void setLanguage(String lang) {
            prefs.edit().putString("language", lang).apply();
        }

        @JavascriptInterface
        public String getVersion() {
            try {
                PackageInfo p = getPackageManager().getPackageInfo(getPackageName(), 0);
                return p.versionName;
            } catch (Exception e) { return ""; }
        }

        @JavascriptInterface
        public void openFile(int id) {
            runOnUiThread(() -> {
                pendingCallId = id;
                Intent i = new Intent(Intent.ACTION_OPEN_DOCUMENT)
                        .addCategory(Intent.CATEGORY_OPENABLE)
                        .addFlags(persistFlags())
                        .setType("*/*");
                startActivityForResult(i, REQ_OPEN);
            });
        }

        @JavascriptInterface
        public void saveFile(int id, String content, String filePath, boolean saveAs, String suggestedName, String dialogTitle) {
            runOnUiThread(() -> {
                Uri target = (saveAs || filePath == null || filePath.isEmpty()) ? null : files.get(filePath);
                try {
                    if (target != null) {
                        writeText(target, content);
                        touchRecent(target, baseName(filePath), content);
                        resolve(id, new JSONObject().put("cancelled", false).put("filePath", filePath));
                        return;
                    }
                    String name = (filePath == null || filePath.isEmpty()) ? suggestedName : baseName(filePath);
                    chooseFormatAndSave(id, content, name, dialogTitle);
                } catch (Exception e) {
                    resolve(id, error(e));
                }
            });
        }

        @JavascriptInterface
        public String getRecents() {
            return prefs.getString("recents", "[]");
        }

        @JavascriptInterface
        public void openRecent(int id, String uri) {
            runOnUiThread(() -> {
                try {
                    resolve(id, fileJson(Uri.parse(uri), true));
                } catch (Exception e) {   // archivo movido, borrado o sin permiso: se quita de la lista
                    removeRecent(uri);
                    resolve(id, error(e));
                }
            });
        }

        @JavascriptInterface
        public void removeRecent(String uri) {
            MainActivity.this.removeRecent(uri);
        }

        /** labels = [titulo, mensaje, guardar, no guardar, cancelar]; responde 'save' | 'discard' | 'cancel'. */
        @JavascriptInterface
        public void confirmCloseTab(int id, String title, String message, String save, String discard, String cancel) {
            runOnUiThread(() -> new AlertDialog.Builder(MainActivity.this)
                    .setTitle(title).setMessage(message)
                    .setPositiveButton(save, (d, w) -> js("window.__mdkResolve(" + id + ",'save')"))
                    .setNegativeButton(discard, (d, w) -> js("window.__mdkResolve(" + id + ",'discard')"))
                    .setNeutralButton(cancel, (d, w) -> js("window.__mdkResolve(" + id + ",'cancel')"))
                    .setOnCancelListener(d -> js("window.__mdkResolve(" + id + ",'cancel')"))
                    .show());
        }

        /** Exportar a PDF e imprimir usan el mismo diálogo del sistema (incluye «Guardar como PDF»). */
        @JavascriptInterface
        public void print(int id, String html, String jobName, double widthMm, double heightMm) {
            runOnUiThread(() -> {
                printView = new WebView(MainActivity.this);
                printView.setWebViewClient(new WebViewClient() {
                    @Override
                    public void onPageFinished(WebView view, String url) {
                        PrintAttributes.Builder b = new PrintAttributes.Builder()
                                .setMinMargins(PrintAttributes.Margins.NO_MARGINS);
                        if (widthMm > 50 && heightMm > 50) {
                            int w = (int) Math.round(Math.min(widthMm, heightMm) / 25.4 * 1000);
                            int h = (int) Math.round(Math.max(widthMm, heightMm) / 25.4 * 1000);
                            PrintAttributes.MediaSize size = new PrintAttributes.MediaSize("mdk", "MDK", w, h);
                            b.setMediaSize(widthMm > heightMm ? size.asLandscape() : size);
                        }
                        PrintDocumentAdapter adapter = view.createPrintDocumentAdapter(jobName);
                        ((PrintManager) getSystemService(Context.PRINT_SERVICE)).print(jobName, adapter, b.build());
                        resolve(id, ok());
                    }
                });
                printView.loadDataWithBaseURL(null, html, "text/html", "UTF-8", null);
            });
        }

        @JavascriptInterface
        public void buyPro() {
            runOnUiThread(pro::buy);
        }

        @JavascriptInterface
        public void toggleProTest() {
            runOnUiThread(pro::toggleTest);
        }

        /** Vista previa (html | svg | react) en una ventana aparte, sin este puente (solo Pro). */
        @JavascriptInterface
        public void preview(String kind, String name, String code) {
            runOnUiThread(() -> {
                if (!pro.isPro()) { askPro(); return; }
                PreviewActivity.pendingKind = kind;
                PreviewActivity.pendingName = name;
                PreviewActivity.pendingCode = code;
                startActivity(new Intent(MainActivity.this, PreviewActivity.class));
            });
        }

        @JavascriptInterface
        public void quit() {
            runOnUiThread(MainActivity.this::finish);
        }
    }
}
