# El WebView llama a estos métodos por nombre desde JavaScript: no se pueden renombrar.
-keepattributes JavascriptInterface
-keepclassmembers class com.vdcprocesslab.mdk.MainActivity$Bridge {
    @android.webkit.JavascriptInterface <methods>;
}
