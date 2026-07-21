import React, { useState } from "react";
import { CARD_BACK_URL } from "@/lib/gameConstants";
import GraveyardModal from "@/components/battle/GraveyardModal";

export default function GraveyardPile({ cards = [] }) {
  const [open, setOpen] = useState(false);
  if (!cards.length) return null;
  const stack = Array.from({ length: Math.min(cards.length, 4) });

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed right-2 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1 z-10"
        style={{ perspective: 500 }}
      >
        <div className="relative" style={{ width: 36, height: 50, transformStyle: "preserve-3d" }}>
          {stack.map((_, i) => (
            <div
              key={i}
              className="absolute inset-0 rounded-lg border-2 border-white/20 bg-cover bg-center"
              style={{
                top: -i * 3,
                left: i * 1.5,
                backgroundImage: `url(${CARD_BACK_URL})`,
                transform: `rotateX(35deg) rotate(${i * 3 - 4}deg) translateZ(${i * 3}px)`,
                boxShadow: `0 ${4 + i * 2}px ${6 + i * 2}px rgba(0,0,0,0.55)`,
              }}
            />
          ))}
        </div>
        <span className="text-[9px] text-white/50 font-semibold">{cards.length} defeated</span>
      </button>
      {open && <GraveyardModal cards={cards} onClose={() => setOpen(false)} />}
    </>
  );
}