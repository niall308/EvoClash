import React from "react";
import { motion } from "framer-motion";
import { CARD_BACK_URL } from "@/lib/gameConstants";

export default function DeckStack({ remaining }) {
  const stack = Array.from({ length: Math.min(remaining, 4) });

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-10 h-14">
        {stack.map((_, i) => (
          <motion.div
            key={i}
            className="absolute inset-0 rounded-lg border-2 border-amber-400 bg-cover bg-center shadow-md"
            style={{ top: -i * 3, left: -i * 1, backgroundImage: `url(${CARD_BACK_URL})` }}
          />
        ))}
      </div>
      <span className="text-[9px] text-white/70 font-semibold">{remaining} left</span>
    </div>
  );
}