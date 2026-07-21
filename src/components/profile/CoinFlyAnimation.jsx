import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Coins } from "lucide-react";

const COIN_COUNT = 6;

export default function CoinFlyAnimation({ origin, onDone }) {
  const [target, setTarget] = useState(null);

  useEffect(() => {
    const badge = document.getElementById("coins-badge");
    const rect = badge ? badge.getBoundingClientRect() : { left: window.innerWidth - 40, top: 20, width: 0, height: 0 };
    setTarget({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
    const t = setTimeout(onDone, 900);
    return () => clearTimeout(t);
  }, [onDone]);

  if (!target) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {Array.from({ length: COIN_COUNT }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ x: origin.x, y: origin.y, opacity: 1, scale: 1 }}
          animate={{
            x: target.x + (Math.random() * 20 - 10),
            y: target.y + (Math.random() * 20 - 10),
            opacity: 0,
            scale: 0.4,
          }}
          transition={{ duration: 0.8, delay: i * 0.05, ease: "easeIn" }}
          style={{ left: 0, top: 0 }}
          className="absolute w-6 h-6 rounded-full bg-gradient-to-br from-yellow-300 via-amber-400 to-yellow-600 shadow-[0_0_8px_2px_rgba(255,200,0,0.6)] flex items-center justify-center"
        >
          <Coins className="w-3.5 h-3.5 text-yellow-900" />
        </motion.div>
      ))}
    </div>
  );
}