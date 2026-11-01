package com.vdcprocesslab.mdk;

import android.app.Activity;
import android.os.Bundle;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import org.json.JSONObject;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import android.view.Gravity;
import android.view.ViewGroup;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.TextView;

/**
 * Vista previa de HTML (Pro). Corre en su propio WebView, SIN el puente del editor ni acceso a
 * archivos: el HTML/JS que se previsualiza (p. ej. generado por una IA) no puede tocar la app.
 */
public class PreviewActivity extends Activity {
    // Se pasan por memoria: un intent no soporta textos grandes.
    static String pendingKind = "html";   // html | svg | react
    static String pendingName = "";
    static String pendingCode = "";

    /** Página que se carga en el WebView de la vista previa, según el tipo de archivo. */
    private String buildPage() {
        switch (pendingKind) {
            case "svg":
                return "<!doctype html><html><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">"
                        + "<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#fff}"
                        + "svg{max-width:100vw;max-height:100vh;height:auto}</style></head><body>" + pendingCode + "</body></html>";
            case "react":
                try (InputStream in = getAssets().open("preview/runner.html")) {
                    byte[] b = new byte[in.available()];
                    int n = 0;
                    while (n < b.length) { int r = in.read(b, n, b.length - n); if (r < 0) break; n += r; }
                    String runner = new String(b, 0, n, StandardCharsets.UTF_8);
                    return runner.replace("/*__SRC__*/null", JSONObject.quote(pendingCode))
                            .replace("/*__NAME__*/\"App.tsx\"", JSONObject.quote(pendingName.isEmpty() ? "App.tsx" : pendingName));
                } catch (Exception e) {
                    return "<p>" + e.getMessage() + "</p>";
                }
            default:
                return pendingCode;
        }
    }

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(0xFF222222);

        WebView web = new WebView(this);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        web.setWebViewClient(new WebViewClient() {
            // Sirve las librerías incluidas en la app (React y Babel) a la página de vista previa, sin internet.
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                if ("preview.local".equals(request.getUrl().getHost())
                        && request.getUrl().getPath() != null && request.getUrl().getPath().startsWith("/lib/")) {
                    try {
                        String file = request.getUrl().getPath().substring("/lib/".length());
                        return new WebResourceResponse("application/javascript", "UTF-8", getAssets().open("preview/lib/" + file));
                    } catch (Exception e) {
                        return null;
                    }
                }
                return null;
            }
        });
        web.loadDataWithBaseURL("https://preview.local/", buildPage(), "text/html", "UTF-8", null);

        TextView close = new TextView(this);
        close.setText("✕");
        close.setTextColor(0xFFFFFFFF);
        close.setTextSize(20);
        close.setGravity(Gravity.CENTER);
        close.setBackgroundColor(0xB3222222);
        close.setOnClickListener(v -> finish());

        FrameLayout.LayoutParams wp = new FrameLayout.LayoutParams(-1, -1);
        FrameLayout.LayoutParams cp = new FrameLayout.LayoutParams(132, 132, Gravity.TOP | Gravity.END);
        cp.setMargins(0, 24, 24, 0);
        root.addView(web, wp);
        root.addView(close, cp);
        setContentView(root);

        root.setOnApplyWindowInsetsListener((v, insets) -> {
            if (android.os.Build.VERSION.SDK_INT >= 30) {
                android.graphics.Insets b = insets.getInsets(android.view.WindowInsets.Type.systemBars());
                v.setPadding(b.left, b.top, b.right, b.bottom);
                return android.view.WindowInsets.CONSUMED;
            }
            v.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(),
                    insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom());
            return insets.consumeSystemWindowInsets();
        });
    }
}
