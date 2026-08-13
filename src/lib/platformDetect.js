// Runtime detection of the Base44 native WebView wrapper.
// Base44's iOS/Android builds are a lightweight WebView around the published
// web app; it does NOT currently expose a native billing bridge. Until it does,
// `nativeBridgeAvailable()` stays false and the client hides Stripe in the
// native build (compliance) and shows a "store builds" message instead.

export function isNativeApp() {
  if (typeof window === "undefined") return false;
  // Base44 may inject this flag when the native wrapper loads the app.
  if (window.__base44_native) return true;
  // Native IAP bridge hooks (populated once Base44 ships the StoreKit/Play bridge).
  if (window.webkit?.messageHandlers?.iap) return true;
  if (typeof window.jsInterface !== "undefined" && window.jsInterface) return true;
  // Build-time escape hatch for packaging / test builds.
  if (import.meta.env?.VITE_NATIVE_BUILD === "true") return true;
  return false;
}

// True only when the native billing bridge is actually present (vs. merely
// running inside the wrapper). Until Base44 ships the bridge this is false.
export function nativeBridgeAvailable() {
  if (typeof window === "undefined") return false;
  return !!(
    window.webkit?.messageHandlers?.iap ||
    (typeof window.jsInterface !== "undefined" && window.jsInterface)
  );
}

// Stripe is allowed on web. Inside the native WebView it must stay OFF
// (Apple/Google reject Stripe-for-digital-goods) unless explicitly overridden
// for a hybrid web-only build via VITE_USE_STRIPE_IN_NATIVE.
export function shouldUseStripe() {
  if (!isNativeApp()) return true;
  return import.meta.env?.VITE_USE_STRIPE_IN_NATIVE === "true";
}