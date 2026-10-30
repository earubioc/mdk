package com.vdcprocesslab.mdk;

import android.app.Activity;
import android.content.Context;
import android.content.SharedPreferences;
import android.view.ViewGroup;

import com.android.billingclient.api.AcknowledgePurchaseParams;
import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.PendingPurchasesParams;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.QueryProductDetailsParams;
import com.android.billingclient.api.QueryPurchasesParams;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.AdSize;
import com.google.android.gms.ads.AdView;
import com.google.android.gms.ads.MobileAds;

import java.util.Collections;
import java.util.List;

/**
 * Anuncios (banner de AdMob) y compra única «Quitar anuncios» (Google Play Billing).
 * Si el producto ya fue comprado el banner no se carga ni se muestra.
 */
class Monetization {
    interface Listener {
        /** adsRemoved: ya compró; price: precio localizado de Play (o null si aún no se conoce). */
        void onState(boolean adsRemoved, String price);
    }

    private final Activity activity;
    private final ViewGroup adContainer;
    private final Listener listener;
    private final SharedPreferences prefs;
    private BillingClient billing;
    private ProductDetails details;
    private AdView adView;
    private boolean adsRemoved;

    Monetization(Activity activity, ViewGroup adContainer, Listener listener) {
        this.activity = activity;
        this.adContainer = adContainer;
        this.listener = listener;
        this.prefs = activity.getSharedPreferences("mdk", Context.MODE_PRIVATE);
        // Caché local: el banner no parpadea al abrir si ya compró (Play lo confirma después).
        this.adsRemoved = prefs.getBoolean("adsRemoved", false);
    }

    void start() {
        if (!adsRemoved) showBanner();
        notifyState();

        billing = BillingClient.newBuilder(activity)
                .setListener((result, purchases) -> {
                    if (result.getResponseCode() == BillingClient.BillingResponseCode.OK && purchases != null) {
                        handle(purchases);
                    }
                })
                .enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build())
                .build();
        billing.startConnection(new BillingClientStateListener() {
            @Override
            public void onBillingSetupFinished(BillingResult result) {
                if (result.getResponseCode() != BillingClient.BillingResponseCode.OK) return;
                queryOwned();
                queryDetails();
            }

            @Override
            public void onBillingServiceDisconnected() { }
        });
    }

    void buy() {
        if (details == null || billing == null) return;
        BillingFlowParams params = BillingFlowParams.newBuilder()
                .setProductDetailsParamsList(Collections.singletonList(
                        BillingFlowParams.ProductDetailsParams.newBuilder().setProductDetails(details).build()))
                .build();
        billing.launchBillingFlow(activity, params);
    }

    void pause() { if (adView != null) adView.pause(); }

    void resume() {
        if (adView != null) adView.resume();
        if (billing != null && billing.isReady()) queryOwned();   // p. ej. compra pendiente que se completó
    }

    void destroy() {
        if (adView != null) adView.destroy();
        if (billing != null) billing.endConnection();
    }

    // ---- anuncios ----

    private void showBanner() {
        MobileAds.initialize(activity, status -> { });
        adView = new AdView(activity);
        adView.setAdUnitId(BuildConfig.ADMOB_BANNER_ID);
        float widthDp = activity.getResources().getDisplayMetrics().widthPixels
                / activity.getResources().getDisplayMetrics().density;
        adView.setAdSize(AdSize.getCurrentOrientationAnchoredAdaptiveBannerAdSize(activity, (int) widthDp));
        adContainer.addView(adView);
        adView.loadAd(new AdRequest.Builder().build());
    }

    private void hideBanner() {
        if (adView == null) return;
        adContainer.removeView(adView);
        adView.destroy();
        adView = null;
    }

    // ---- compra ----

    private void queryOwned() {
        billing.queryPurchasesAsync(
                QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.INAPP).build(),
                (result, purchases) -> {
                    if (result.getResponseCode() == BillingClient.BillingResponseCode.OK) handle(purchases);
                });
    }

    private void queryDetails() {
        QueryProductDetailsParams params = QueryProductDetailsParams.newBuilder()
                .setProductList(Collections.singletonList(
                        QueryProductDetailsParams.Product.newBuilder()
                                .setProductId(BuildConfig.REMOVE_ADS_PRODUCT_ID)
                                .setProductType(BillingClient.ProductType.INAPP)
                                .build()))
                .build();
        billing.queryProductDetailsAsync(params, (result, list) -> {
            if (result.getResponseCode() == BillingClient.BillingResponseCode.OK && !list.isEmpty()) {
                details = list.get(0);
                notifyState();
            }
        });
    }

    private void handle(List<Purchase> purchases) {
        boolean owned = false;
        for (Purchase p : purchases) {
            if (!p.getProducts().contains(BuildConfig.REMOVE_ADS_PRODUCT_ID)) continue;
            if (p.getPurchaseState() != Purchase.PurchaseState.PURCHASED) continue;
            owned = true;
            if (!p.isAcknowledged()) {   // Play reembolsa a los 3 días si no se confirma
                billing.acknowledgePurchase(
                        AcknowledgePurchaseParams.newBuilder().setPurchaseToken(p.getPurchaseToken()).build(),
                        r -> { });
            }
        }
        // Solo se concede, nunca se revoca por una consulta vacía: un fallo de red no debe devolver los anuncios.
        if (owned && !adsRemoved) {
            adsRemoved = true;
            prefs.edit().putBoolean("adsRemoved", true).apply();
            activity.runOnUiThread(() -> { hideBanner(); notifyState(); });
        }
    }

    void notifyState() {
        String price = null;
        if (details != null && details.getOneTimePurchaseOfferDetails() != null) {
            price = details.getOneTimePurchaseOfferDetails().getFormattedPrice();
        }
        listener.onState(adsRemoved, price);
    }
}
