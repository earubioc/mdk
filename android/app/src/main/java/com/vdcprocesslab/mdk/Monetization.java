package com.vdcprocesslab.mdk;

import android.app.Activity;
import android.content.Context;
import android.content.SharedPreferences;
import android.os.SystemClock;
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
import com.google.android.gms.ads.AdError;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.AdSize;
import com.google.android.gms.ads.AdView;
import com.google.android.gms.ads.FullScreenContentCallback;
import com.google.android.gms.ads.LoadAdError;
import com.google.android.gms.ads.MobileAds;
import com.google.android.gms.ads.interstitial.InterstitialAd;
import com.google.android.gms.ads.interstitial.InterstitialAdLoadCallback;
import com.google.android.ump.ConsentInformation;
import com.google.android.ump.ConsentRequestParameters;
import com.google.android.ump.UserMessagingPlatform;

import java.util.Collections;
import java.util.List;

/**
 * Anuncios de AdMob y compra única «Quitar anuncios» (Google Play Billing).
 *  - Banner fijo abajo.
 *  - Intersticial (puede ser video) cada INTERSTITIAL_EVERY documentos abiertos/creados, nunca
 *    antes de INTERSTITIAL_COOLDOWN_MS desde el inicio ni desde el anterior, y jamás mientras se escribe.
 *  - Antes de pedir anuncios se obtiene el consentimiento (UMP, obligatorio en EEE/Reino Unido).
 * Si ya compró, no se carga nada de publicidad.
 */
class Monetization {
    interface Listener {
        /** adsRemoved: ya compró; price: precio de Play (o null); privacyOptions: mostrar «Privacidad de anuncios». */
        void onState(boolean adsRemoved, String price, boolean privacyOptions);
    }

    static final int INTERSTITIAL_EVERY = 5;
    static final long INTERSTITIAL_COOLDOWN_MS = 3 * 60 * 1000L;

    private final Activity activity;
    private final ViewGroup adContainer;
    private final Listener listener;
    private final SharedPreferences prefs;
    private BillingClient billing;
    private ProductDetails details;
    private AdView adView;
    private InterstitialAd interstitial;
    private ConsentInformation consent;
    private boolean adsRemoved;
    private boolean adsStarted;
    private long lastInterstitial = SystemClock.elapsedRealtime();   // sin intersticial en los primeros minutos

    Monetization(Activity activity, ViewGroup adContainer, Listener listener) {
        this.activity = activity;
        this.adContainer = adContainer;
        this.listener = listener;
        this.prefs = activity.getSharedPreferences("mdk", Context.MODE_PRIVATE);
        // Caché local: el banner no parpadea al abrir si ya compró (Play lo confirma después).
        this.adsRemoved = prefs.getBoolean("adsRemoved", false);
    }

    void start() {
        if (!adsRemoved) requestConsent();
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

    /** Un documento nuevo o abierto: cada INTERSTITIAL_EVERY se muestra un intersticial si está listo. */
    void onDocumentOpened() {
        if (adsRemoved) return;
        int n = prefs.getInt("docsOpened", 0) + 1;
        long now = SystemClock.elapsedRealtime();
        if (n >= INTERSTITIAL_EVERY && interstitial != null && now - lastInterstitial >= INTERSTITIAL_COOLDOWN_MS) {
            n = 0;
            lastInterstitial = now;
            interstitial.show(activity);
        }
        prefs.edit().putInt("docsOpened", n).apply();
    }

    void showPrivacyOptions() {
        UserMessagingPlatform.showPrivacyOptionsForm(activity, error -> {
            initAds();   // por si el usuario acaba de dar consentimiento
            notifyState();
        });
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

    // ---- consentimiento y anuncios ----

    private void requestConsent() {
        consent = UserMessagingPlatform.getConsentInformation(activity);
        initAds();   // consentimiento ya guardado de una sesión anterior
        consent.requestConsentInfoUpdate(activity, new ConsentRequestParameters.Builder().build(),
                () -> UserMessagingPlatform.loadAndShowConsentFormIfRequired(activity, formError -> {
                    initAds();
                    notifyState();
                }),
                error -> initAds());
    }

    private void initAds() {
        if (adsStarted || adsRemoved || consent == null || !consent.canRequestAds()) return;
        adsStarted = true;
        MobileAds.initialize(activity, status -> { });
        showBanner();
        loadInterstitial();
    }

    private void loadInterstitial() {
        if (adsRemoved) return;
        InterstitialAd.load(activity, BuildConfig.ADMOB_INTERSTITIAL_ID, new AdRequest.Builder().build(),
                new InterstitialAdLoadCallback() {
                    @Override
                    public void onAdLoaded(InterstitialAd ad) {
                        interstitial = ad;
                        ad.setFullScreenContentCallback(new FullScreenContentCallback() {
                            @Override
                            public void onAdDismissedFullScreenContent() { interstitial = null; loadInterstitial(); }

                            @Override
                            public void onAdFailedToShowFullScreenContent(AdError error) { interstitial = null; loadInterstitial(); }
                        });
                    }

                    @Override
                    public void onAdFailedToLoad(LoadAdError error) { interstitial = null; }
                });
    }

    private void showBanner() {
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
            interstitial = null;
            prefs.edit().putBoolean("adsRemoved", true).apply();
            activity.runOnUiThread(() -> { hideBanner(); notifyState(); });
        }
    }

    void notifyState() {
        String price = null;
        if (details != null && details.getOneTimePurchaseOfferDetails() != null) {
            price = details.getOneTimePurchaseOfferDetails().getFormattedPrice();
        }
        boolean privacy = consent != null && consent.getPrivacyOptionsRequirementStatus()
                == ConsentInformation.PrivacyOptionsRequirementStatus.REQUIRED;
        listener.onState(adsRemoved, price, privacy && !adsRemoved);
    }
}
