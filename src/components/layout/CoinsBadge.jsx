import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, Link } from "react-router-dom";
import { Coins, Plus } from "lucide-react";
import { base44 } from "@/api/base44Client";
import DailyRewardsButton from "@/components/layout/DailyRewardsButton";

export default function CoinsBadge() {
  const [coins, setCoins] = useState(null);
  const [bump, setBump] = useState(0);
  const location = useLocation();

  useEffect(() => {
    base44.auth.me().then((u) => setCoins(u.coins || 0));
  }, [location.pathname]);

  useEffect(() => {
    const handler = (e) => {
      setCoins(e.detail.newTotal);
      setBump((b) => b + 1);
    };
    window.addEventListener("coins-claimed", handler);
    return () => window.removeEventListener("coins-claimed", handler);
  }, []);

  if (coins === null) return null;

  return createPortal(
    <div
      id="coins-badge"
      className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between gap-2 bg-[#0D1B2A] border-b border-white/10 px-3"
      style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)", paddingBottom: "0.75rem" }}
    >
      <DailyRewardsButton />
      <div className="flex items-center gap-2">
        <Link
          to="/buy-coins"
          className="flex items-center justify-center w-[22px] h-[22px] bg-amber-400 text-[#0D1B2A] rounded-full active:scale-90 transition-transform shrink-0"
        >
          <Plus className="w-[10px] h-[10px]" />
        </Link>
        <div
          key={bump}
          className={`flex items-center gap-1 bg-black/50 backdrop-blur px-3 py-1.5 rounded-full text-amber-300 text-xs font-bold border border-amber-400/30${bump ? " animate-coin-pop" : ""}`}
        >
          <Coins className="w-3.5 h-3.5" />
          {coins} LC
        </div>
      </div>
    </div>,
    document.body
  );
}