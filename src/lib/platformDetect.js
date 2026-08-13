// Runtime detection of the Base44 native iOS WebView wrapper. Apple only —
// there is no Android bridge. Base44's iOS build is a lightweight WebView
// around the published web app and does NOT currently expose a StoreKit
// bridge; until it does, `nativeBridgeAvailable()` stays false and the client
// hides Stripe in the native build (App Review compliance) and shows a
// "store build" message instead.

export function isNativeApp() {
  if (typeof window === "undefined") return false;
  // Base44 may inject this flag when the native wrapper loads the app.
  if (window.__base44_native) return true;
  // Native StoreKit bridge hook (populated once Base44 ships it).
  if (window.webkit?.messageHandlers?.iap) return true;
  // Build-time escape hatch for packaging / test builds.
  if (import.meta.env?.VITE_NATIVE_BUILD === "true") return true;
  return false;
}

// True only when the native StoreKit bridge is actually present (vs. merely
// running inside the wrapper). Until Base44 ships the bridge this is false.
export function nativeBridgeAvailable() {
  if (typeof window === "undefined") return false;
  return !!window.webkit?.messageHandlers?.iap;
}

// Stripe is allowed on web. Inside the native iOS WebView it must stay OFF
// (Apple rejects Stripe-for-digital-goods) unless explicitly overridden for a
// hybrid web-only build via VITE_USE_STRIPE_IN_NATIVE.
export function shouldUseStripe() {
  if (!isNativeApp()) return true;
  return import.meta.env?.VITE_USE_STRIPE_IN_NATIVE === "true";
}