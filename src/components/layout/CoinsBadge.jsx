import React, { useEffect, useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { Coins, Plus } from "lucide-react";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";

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

  return (
    <div id="coins-badge" className="fixed top-3 right-3 z-40 flex items-center gap-2">
      <Link
        to="/buy-coins"
        className="flex items-center justify-center w-6 h-6 bg-amber-400 text-[#0D1B2A] rounded-full active:scale-90 transition-transform"
      >
        <Plus className="w-4 h-4" />
      </Link>
      <motion.div
        key={bump}
        initial={bump ? { scale: 1.4 } : false}
        animate={{ scale: 1 }}
        className="flex items-center gap-1 bg-black/50 backdrop-blur px-3 py-1.5 rounded-full text-amber-300 text-xs font-bold border border-amber-400/30"
      >
        <Coins className="w-3.5 h-3.5" />
        {coins} LC
      </motion.div>
    </div>
  );
}