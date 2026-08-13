import { base44 } from "@/api/base44Client";
import { COIN_PACKS } from "@/lib/gameConstants";
import { isNativeApp, shouldUseStripe } from "@/lib/platformDetect";
import { catalogByPackId } from "@/lib/iapCatalog";

// IAPManager: a single client-facing abstraction over the two payment
// backends, selected by platform / feature flag.
//
// - StripeBackend: existing web checkout (createCoinCheckout). Used on web and
//   on a hybrid native build where VITE_USE_STRIPE_IN_NATIVE=true.
// - NativeIAPBackend: talks to the Base44 native billing bridge
//   (window.webkit.messageHandlers.iap / window.jsInterface) that will be
//   populated once Base44 ships their StoreKit/Google Play Billing integration.
//   Until that bridge exists, native calls return 'native_iap_bridge_unavailable'
//   so the UI can show the not-available-in-this-build message. When the bridge
//   lands, only _bridge() + the receipt-handling callback need wiring.

class StripeBackend {
  async getProducts() {
    return COIN_PACKS;
  }
  async buy(packId) {
    if (window.self !== window.top) {
      alert("Checkout only works from the published app, not inside this preview.");
      return {};
    }
    const { data } = await base44.functions.invoke("createCoinCheckout", {
      packId,
      successUrl: window.location.origin + "/",
      cancelUrl: window.location.origin + "/buy-coins",
    });
    if (data?.url) window.location.href = data.url;
    return data || {};
  }
  async restorePurchases() {
    return { restored: true, message: "Stripe purchases are restored automatically after checkout." };
  }
  async getPurchaseHistory() {
    const { data } = await base44.functions.invoke("getIapStatus", {});
    return data?.entitlements || [];
  }
}

class NativeIAPBackend {
  _bridge() {
    if (window.webkit?.messageHandlers?.iap) {
      return { type: "apple", post: (m) => window.webkit.messageHandlers.iap.postMessage(m) };
    }
    if (typeof window.jsInterface !== "undefined" && window.jsInterface) {
      return { type: "google", post: (m) => window.jsInterface.postMessage(JSON.stringify(m)) };
    }
    return null;
  }
  async getProducts() {
    return COIN_PACKS; // displayed locally; store fetch via the bridge later
  }
  async buy(packId) {
    const bridge = this._bridge();
    if (!bridge) return { error: "native_iap_bridge_unavailable" };
    // Ask the native layer to start the purchase. When it returns a receipt
    // the bridge should call window.__base44_iap_onPurchase(payload), which
    // iapManager wires to validateReceiptServerSide. (Wired when bridge lands.)
    bridge.post({ op: "purchase", packId });
    return { pending: true, platform: bridge.type };
  }
  async restorePurchases() {
    const bridge = this._bridge();
    if (bridge) bridge.post({ op: "restore" });
    // Always also hit the server (source of truth) for the restore view.
    const { data } = await base44.functions.invoke("getIapStatus", {});
    return data?.entitlements || [];
  }
  async getPurchaseHistory() {
    const { data } = await base44.functions.invoke("getIapStatus", {});
    return data?.entitlements || [];
  }
}

let backend = null;
function select() {
  return isNativeApp() && !shouldUseStripe() ? new NativeIAPBackend() : new StripeBackend();
}
export function getIapManager() {
  if (!backend) backend = select();
  return backend;
}

// Server-side receipt validation — called immediately after a native purchase
// (once the bridge is live) so the server grants entitlement idempotently.
export async function validateReceiptServerSide({ platform, packId, receiptOrToken }) {
  const catalog = catalogByPackId(packId);
  if (!catalog) throw new Error("unknown pack");
  const productId = platform === "apple" ? catalog.appleProductId : catalog.googleProductId;
  const { data } = await base44.functions.invoke("validateIapReceipt", { platform, productId, receiptOrToken });
  if (data?.valid !== false && platform === "google") {
    // Consumables must be consumed to allow repurchase.
    try { await base44.functions.invoke("acknowledgeIapPurchase", { platform, productId, purchaseToken: receiptOrToken }); } catch {}
  }
  return data;
}