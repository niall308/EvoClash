import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, History, Info } from "lucide-react";
import { COIN_PACKS } from "@/lib/gameConstants";
import { getIapManager, validateReceiptServerSide } from "@/lib/iapManager";
import { isNativeApp, shouldUseStripe, nativeBridgeAvailable } from "@/lib/platformDetect";
import PurchaseButton from "@/components/payments/PurchaseButton";
import RestorePurchasesButton from "@/components/payments/RestorePurchasesButton";

export default function BuyCoins() {
  const navigate = useNavigate();
  const [loadingId, setLoadingId] = useState(null);
  const iap = getIapManager();

  const handleBuy = async (pack) => {
    setLoadingId(pack.id);
    try {
      const res = await iap.buy(pack.id);
      if (res?.error === "native_iap_bridge_unavailable") {
        alert("In-app purchases aren't available in this build yet. Purchases will be available via the App Store in the store build.");
      } else if (res?.receipt) {
        // When the Base44 native bridge eventually returns a receipt inline,
        // forward it to the server for validation + entitlement grant.
        await validateReceiptServerSide({ platform: res.platform, packId: pack.id, receiptOrToken: res.receipt });
      }
    } finally {
      setLoadingId(null);
    }
  };

  const showBlockedBanner = isNativeApp() && !shouldUseStripe() && !nativeBridgeAvailable();

  return (
    <div className="text-white px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-white/60 hover:text-white text-sm min-h-[44px] px-1 -ml-1">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="flex items-center gap-2">
          <RestorePurchasesButton />
          <button onClick={() => navigate("/coin-history")} className="flex items-center gap-1.5 bg-white/10 text-xs font-bold px-3 py-2 rounded-full active:scale-95 transition-transform">
            <History className="w-4 h-4" /> History
          </button>
        </div>
      </div>
      <h1 className="text-2xl font-bold mb-1">Buy Legend Coins</h1>
      <p className="text-white/60 text-sm mb-6">Get more LC to upgrade cards, unlock powers, and generate creatures.</p>

      {showBlockedBanner && (
        <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-400/30 rounded-xl px-4 py-3 mb-4 text-amber-200/90 text-xs">
          <Info className="w-4 h-4 shrink-0" />
          <span>Purchases aren't available in this build — they'll be available via the App Store in the store build.</span>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {COIN_PACKS.map((pack) => (
          <PurchaseButton
            key={pack.id}
            pack={pack}
            loading={loadingId === pack.id}
            onPurchase={handleBuy}
            disabled={loadingId !== null}
          />
        ))}
      </div>
    </div>
  );
}