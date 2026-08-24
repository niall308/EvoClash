import React from "react";
import GameCard from "@/components/cards/GameCard";
import { RefreshCw } from "lucide-react";

export default function ReplaceCardModal({ choices, onPick }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85 px-4" style={{ paddingTop: "calc(env(safe-area-inset-top) + 1rem)" }}>
      <h2 className="text-lg font-black mb-1 flex items-center gap-2">
        <RefreshCw className="w-5 h-5" /> Card Defeated
      </h2>
      <p className="text-white/60 text-sm mb-4">Choose a replacement</p>
      {choices.length === 0 ? (
        <>
          <p className="text-white/50 text-sm mb-6">No cards left to reinforce!</p>
          <button onClick={() => onPick(null)} className="bg-white/10 font-bold px-6 py-3 rounded-full active:scale-95 transition-transform">
            Continue
          </button>
        </>
      ) : (
        <div className="flex gap-3 mb-6">
          {choices.map((c) => (
            <button key={c.id} onClick={() => onPick(c)} className="active:scale-95 transition-transform rounded-2xl ring-2 ring-white/10 hover:ring-amber-400">
              <GameCard card={c} size="sm" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}