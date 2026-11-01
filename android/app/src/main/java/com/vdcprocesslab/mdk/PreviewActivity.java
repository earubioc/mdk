package com.vdcprocesslab.mdk;

import android.app.Activity;
import android.os.Bundle;
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
    static String pendingHtml = "";   // se pasa por memoria: un intent no soporta HTML grande

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
        web.setWebViewClient(new WebViewClient());
        web.loadDataWithBaseURL("https://preview.invalid/", pendingHtml, "text/html", "UTF-8", null);

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
