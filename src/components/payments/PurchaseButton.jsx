import React from "react";
import { Coins, Loader2 } from "lucide-react";
import { isNativeApp, shouldUseStripe, nativeBridgeAvailable } from "@/lib/platformDetect";

// Centralized purchase control. On web it renders the buy button (Stripe).
// Inside the native iOS WebView while the StoreKit bridge is not yet live, it
// renders a disabled, compliant row instead of a Stripe buy button — so no
// Stripe-for-digital-goods flow exists in the iOS build. (Apple only.)
export default function PurchaseButton({ pack, loading, onPurchase, disabled }) {
  const native = isNativeApp();
  const useStripe = shouldUseStripe();
  const bridge = nativeBridgeAvailable();
  const disallowed = native && !useStripe && !bridge;

  if (disallowed) {
    return (
      <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-2xl px-5 py-4 opacity-70">
        <div className="flex items-center gap-3">
          <Coins className="w-6 h-6 text-amber-300" />
          <span className="font-bold text-lg">{pack.coins.toLocaleString()} LC</span>
        </div>
        <span className="text-xs text-white/50 text-right max-w-[55%]">
          Purchases are available via App Store IAP in the store build.
        </span>
      </div>
    );
  }

  return (
    <button
      onClick={() => onPurchase(pack)}
      disabled={disabled || loading}
      className="flex items-center justify-between bg-white/5 border border-white/10 rounded-2xl px-5 py-4 active:scale-95 transition-transform disabled:opacity-60"
    >
      <div className="flex items-center gap-3">
        <Coins className="w-6 h-6 text-amber-300" />
        <span className="font-bold text-lg">{pack.coins.toLocaleString()} LC</span>
      </div>
      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : (
        <span className="font-bold text-emerald-400">${pack.priceUsd}</span>
      )}
    </button>
  );
}