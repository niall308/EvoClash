import React, { useEffect, useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { Coins, Plus } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function CoinsBadge() {
  const [coins, setCoins] = useState(null);
  const location = useLocation();

  useEffect(() => {
    base44.auth.me().then((u) => setCoins(u.coins || 0));
  }, [location.pathname]);

  if (coins === null) return null;

  return (
    <div className="fixed top-3 right-3 z-40 flex items-center gap-2">
      <Link
        to="/buy-coins"
        className="flex items-center justify-center w-6 h-6 bg-amber-400 text-[#0D1B2A] rounded-full active:scale-90 transition-transform"
      >
        <Plus className="w-4 h-4" />
      </Link>
      <div className="flex items-center gap-1 bg-black/50 backdrop-blur px-3 py-1.5 rounded-full text-amber-300 text-xs font-bold border border-amber-400/30">
        <Coins className="w-3.5 h-3.5" />
        {coins} LC
      </div>
    </div>
  );
}