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
import android.view.ViewGroup;
import android.view.WindowInsets;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

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
    private Monetization monetization;
    private String adsState = "false,null,false"; // último estado enviado a JS (se reenvía al cargar la página)
    private WebView printView;              // referencia viva mientras el sistema imprime

    // Las rutas que ve el renderer son nombres de archivo; aquí se resuelven a su Uri.
    private final Map<String, Uri> files = new HashMap<>();

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        web = new WebView(this);
        FrameLayout adBar = new FrameLayout(this);
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.addView(web, new LinearLayout.LayoutParams(-1, 0, 1f));
        root.addView(adBar, new LinearLayout.LayoutParams(-1, ViewGroup.LayoutParams.WRAP_CONTENT));
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

        monetization = new Monetization(this, adBar, (removed, price, privacy) -> {
            adsState = removed + "," + (price == null ? "null" : JSONObject.quote(price)) + "," + privacy;
            if (pageReady) js("window.__mdkAds(" + adsState + ")");
        });
        monetization.start();

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
                js("window.__mdkAds(" + adsState + ")");
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

    @Override protected void onPause() { monetization.pause(); super.onPause(); }
    @Override protected void onResume() { super.onResume(); monetization.resume(); }
    @Override protected void onDestroy() { monetization.destroy(); super.onDestroy(); }

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
        String key = name;
        for (int n = 2; files.containsKey(key) && !files.get(key).equals(uri); n++) key = n + "/" + name;
        files.put(key, uri);
        JSONObject o = new JSONObject().put("cancelled", false).put("filePath", key);
        if (withContent) o.put("content", readText(uri));
        return o;
    }

    private String displayName(Uri uri) {
        try (Cursor c = getContentResolver().query(uri, new String[]{OpenableColumns.DISPLAY_NAME}, null, null, null)) {
            if (c != null && c.moveToFirst() && c.getString(0) != null) return c.getString(0);
        } catch (Exception ignored) { }
        String seg = uri.getLastPathSegment();
        return seg == null ? "document.md" : seg.substring(seg.lastIndexOf('/') + 1);
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
                        Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
            } catch (Exception ignored) { }
            if (req == REQ_OPEN) {
                resolve(id, fileJson(uri, true));
            } else {
                writeText(uri, pendingSaveContent);
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

    // ---- Puente JS (equivalente de preload.js) ----

    private class Bridge {
        private final SharedPreferences prefs = getSharedPreferences("mdk", Context.MODE_PRIVATE);

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
                        .setType("*/*");
                startActivityForResult(i, REQ_OPEN);
            });
        }

        @JavascriptInterface
        public void saveFile(int id, String content, String filePath, boolean saveAs, String suggestedName) {
            runOnUiThread(() -> {
                Uri target = (saveAs || filePath == null || filePath.isEmpty()) ? null : files.get(filePath);
                try {
                    if (target != null) {
                        writeText(target, content);
                        resolve(id, new JSONObject().put("cancelled", false).put("filePath", filePath));
                        return;
                    }
                    pendingCallId = id;
                    pendingSaveContent = content;
                    Intent i = new Intent(Intent.ACTION_CREATE_DOCUMENT)
                            .addCategory(Intent.CATEGORY_OPENABLE)
                            .setType("text/markdown")
                            .putExtra(Intent.EXTRA_TITLE, suggestedName);
                    startActivityForResult(i, REQ_SAVE);
                } catch (Exception e) {
                    resolve(id, error(e));
                }
            });
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
        public void documentOpened() {
            runOnUiThread(monetization::onDocumentOpened);
        }

        @JavascriptInterface
        public void privacyOptions() {
            runOnUiThread(monetization::showPrivacyOptions);
        }

        @JavascriptInterface
        public void buyRemoveAds() {
            runOnUiThread(monetization::buy);
        }

        @JavascriptInterface
        public void quit() {
            runOnUiThread(MainActivity.this::finish);
        }
    }
}
