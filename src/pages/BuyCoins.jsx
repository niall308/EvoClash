import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Coins, Loader2, History } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { COIN_PACKS } from "@/lib/gameConstants";

export default function BuyCoins() {
  const navigate = useNavigate();
  const [loadingId, setLoadingId] = useState(null);

  const handleBuy = async (packId) => {
    if (window.self !== window.top) {
      alert("Checkout only works from the published app, not inside this preview.");
      return;
    }
    setLoadingId(packId);
    const { data } = await base44.functions.invoke("createCoinCheckout", {
      packId,
      successUrl: window.location.origin + "/",
      cancelUrl: window.location.origin + "/buy-coins",
    });
    if (data?.url) {
      window.location.href = data.url;
    } else {
      setLoadingId(null);
    }
  };

  return (
    <div className="text-white px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-white/60 hover:text-white text-sm min-h-[44px] px-1 -ml-1">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <button onClick={() => navigate("/coin-history")} className="flex items-center gap-1.5 bg-white/10 text-xs font-bold px-3 py-2 rounded-full active:scale-95 transition-transform">
          <History className="w-4 h-4" /> History
        </button>
      </div>
      <h1 className="text-2xl font-bold mb-1">Buy Legend Coins</h1>
      <p className="text-white/60 text-sm mb-6">Get more LC to upgrade cards, unlock powers, and generate creatures.</p>

      <div className="flex flex-col gap-3">
        {COIN_PACKS.map((pack) => (
          <button
            key={pack.id}
            onClick={() => handleBuy(pack.id)}
            disabled={loadingId !== null}
            className="flex items-center justify-between bg-white/5 border border-white/10 rounded-2xl px-5 py-4 active:scale-95 transition-transform disabled:opacity-60"
          >
            <div className="flex items-center gap-3">
              <Coins className="w-6 h-6 text-amber-300" />
              <span className="font-bold text-lg">{pack.coins.toLocaleString()} LC</span>
            </div>
            {loadingId === pack.id ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <span className="font-bold text-emerald-400">${pack.priceUsd}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}