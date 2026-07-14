import React from "react";

const OPTIONS = [
  { id: "rock", emoji: "🪨", label: "Rock" },
  { id: "paper", emoji: "📄", label: "Paper" },
  { id: "scissors", emoji: "✂️", label: "Scissors" },
];

export default function RpsPicker({ onPick }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-sm text-white/70">Pick to see who goes first</p>
      <div className="flex gap-3">
        {OPTIONS.map((o) => (
          <button
            key={o.id}
            onClick={() => onPick(o.id)}
            className="flex flex-col items-center gap-1 bg-white/10 hover:bg-white/20 rounded-2xl px-4 py-3 active:scale-95 transition-transform"
          >
            <span className="text-3xl">{o.emoji}</span>
            <span className="text-[10px] font-semibold">{o.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}