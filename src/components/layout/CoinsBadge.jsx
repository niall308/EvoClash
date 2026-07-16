import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Coins } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function CoinsBadge() {
  const [coins, setCoins] = useState(null);
  const location = useLocation();

  useEffect(() => {
    base44.auth.me().then((u) => setCoins(u.coins || 0));
  }, [location.pathname]);

  if (coins === null) return null;

  return (
    <div className="fixed top-3 right-3 z-40 flex items-center gap-1 bg-black/50 backdrop-blur px-3 py-1.5 rounded-full text-amber-300 text-xs font-bold border border-amber-400/30">
      <Coins className="w-3.5 h-3.5" />
      {coins} LC
    </div>
  );
}