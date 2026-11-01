package com.vdcprocesslab.mdk;

import android.app.Activity;
import android.content.Context;
import android.content.SharedPreferences;
import android.widget.Toast;

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

import java.util.Collections;
import java.util.List;

/**
 * MD Kraft Pro: compra única (Google Play Billing) que desbloquea abrir/guardar formatos
 * distintos de Markdown y texto, y la previsualización de HTML. Sin anuncios.
 */
class ProUnlock {
    interface Listener {
        /** pro: desbloqueado; price: precio localizado de Play (o null); testBuild/testOn: interruptor de pruebas. */
        void onState(boolean pro, String price, boolean testBuild, boolean testOn);
    }

    private final Activity activity;
    private final Listener listener;
    private final SharedPreferences prefs;
    private BillingClient billing;
    private ProductDetails details;
    private boolean pro;

    ProUnlock(Activity activity, Listener listener) {
        this.activity = activity;
        this.listener = listener;
        this.prefs = activity.getSharedPreferences("mdk", Context.MODE_PRIVATE);
        // Caché local; Play lo confirma (o lo revoca si hubo reembolso) al conectarse.
        this.pro = prefs.getBoolean("pro", false);
    }

    boolean isPro() {
        return pro || (BuildConfig.TEST_BUILD && prefs.getBoolean("proTest", false));
    }

    String price() {
        if (details != null && details.getOneTimePurchaseOfferDetails() != null) {
            return details.getOneTimePurchaseOfferDetails().getFormattedPrice();
        }
        return null;
    }

    void start() {
        notifyState();
        billing = BillingClient.newBuilder(activity)
                .setListener((result, purchases) -> {
                    if (result.getResponseCode() == BillingClient.BillingResponseCode.OK && purchases != null) {
                        handle(purchases, false);
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
        if (details == null || billing == null || !billing.isReady()) {
            Toast.makeText(activity, activity.getString(R.string.pro_unavailable), Toast.LENGTH_LONG).show();
            return;
        }
        billing.launchBillingFlow(activity, BillingFlowParams.newBuilder()
                .setProductDetailsParamsList(Collections.singletonList(
                        BillingFlowParams.ProductDetailsParams.newBuilder().setProductDetails(details).build()))
                .build());
    }

    /** Solo builds de prueba: simula Pro encendido/apagado para probar ambos estados sin Play. */
    void toggleTest() {
        if (!BuildConfig.TEST_BUILD) return;
        prefs.edit().putBoolean("proTest", !prefs.getBoolean("proTest", false)).apply();
        notifyState();
    }

    void resume() {
        if (billing != null && billing.isReady()) queryOwned();   // p. ej. una compra pendiente que se completó
    }

    void destroy() {
        if (billing != null) billing.endConnection();
    }

    private void queryOwned() {
        billing.queryPurchasesAsync(
                QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.INAPP).build(),
                (result, purchases) -> {
                    if (result.getResponseCode() == BillingClient.BillingResponseCode.OK) handle(purchases, true);
                });
    }

    private void queryDetails() {
        billing.queryProductDetailsAsync(QueryProductDetailsParams.newBuilder()
                .setProductList(Collections.singletonList(
                        QueryProductDetailsParams.Product.newBuilder()
                                .setProductId(BuildConfig.PRO_PRODUCT_ID)
                                .setProductType(BillingClient.ProductType.INAPP)
                                .build()))
                .build(), (result, list) -> {
            if (result.getResponseCode() == BillingClient.BillingResponseCode.OK && !list.isEmpty()) {
                details = list.get(0);
                notifyState();
            }
        });
    }

    /** authoritative: respuesta completa de Play (no un evento de compra); ahí sí se puede revocar. */
    private void handle(List<Purchase> purchases, boolean authoritative) {
        boolean owned = false;
        for (Purchase p : purchases) {
            if (!p.getProducts().contains(BuildConfig.PRO_PRODUCT_ID)) continue;
            if (p.getPurchaseState() != Purchase.PurchaseState.PURCHASED) continue;
            owned = true;
            if (!p.isAcknowledged()) {   // Play reembolsa a los 3 días si no se confirma
                billing.acknowledgePurchase(
                        AcknowledgePurchaseParams.newBuilder().setPurchaseToken(p.getPurchaseToken()).build(), r -> { });
            }
        }
        boolean next = owned || (!authoritative && pro);
        if (next != pro) {
            pro = next;
            prefs.edit().putBoolean("pro", pro).apply();
            notifyState();
        }
    }

    void notifyState() {
        boolean testOn = prefs.getBoolean("proTest", false);
        activity.runOnUiThread(() -> listener.onState(isPro(), price(), BuildConfig.TEST_BUILD, testOn));
    }
}
