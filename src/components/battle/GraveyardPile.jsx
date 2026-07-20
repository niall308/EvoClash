import React from "react";
import { CARD_BACK_URL } from "@/lib/gameConstants";

export default function GraveyardPile({ count }) {
  if (!count) return null;
  const stack = Array.from({ length: Math.min(count, 4) });

  return (
    <div className="fixed left-[38%] -translate-x-1/2 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1 z-10">
      <div className="relative" style={{ width: 36, height: 50 }}>
        {stack.map((_, i) => (
          <div
            key={i}
            className="absolute inset-0 rounded-lg border-2 border-white/20 bg-cover bg-center shadow-md opacity-80"
            style={{ top: -i * 2, left: i * 1, backgroundImage: `url(${CARD_BACK_URL})` }}
          />
        ))}
      </div>
      <span className="text-[9px] text-white/50 font-semibold">{count} defeated</span>
    </div>
  );
}