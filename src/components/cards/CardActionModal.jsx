import React from "react";
import { ArrowUpCircle, ArrowLeftRight, BarChart3, X, GitCompareArrows } from "lucide-react";
import GameCard from "./GameCard";

export default function CardActionModal({ card, onClose, onUpgrade, onTrade, onStats, onCompare }) {
  if (!card) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6" onClick={onClose}>
      <div
        className="bg-[#132338] rounded-2xl p-5 w-full max-w-xs flex flex-col items-center gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="self-end -mt-2 -mr-2 text-white/50">
          <X className="w-5 h-5" />
        </button>
        <GameCard card={card} size="lg" />
        <div className="w-full flex flex-col gap-2">
          <button
            onClick={onUpgrade}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold py-3 rounded-full active:scale-95 transition-transform"
          >
            <ArrowUpCircle className="w-5 h-5" /> Upgrade
          </button>
          <button
            onClick={onTrade}
            className="w-full flex items-center justify-center gap-2 bg-white/10 text-white font-bold py-3 rounded-full active:scale-95 transition-transform"
          >
            <ArrowLeftRight className="w-5 h-5" /> Trade
          </button>
          <button
            onClick={onStats}
            className="w-full flex items-center justify-center gap-2 bg-white/10 text-white font-bold py-3 rounded-full active:scale-95 transition-transform"
          >
            <BarChart3 className="w-5 h-5" /> Stats
          </button>
          {onCompare && (
            <button
              onClick={onCompare}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold py-3 rounded-full active:scale-95 transition-transform"
            >
              <GitCompareArrows className="w-5 h-5" /> Compare
            </button>
          )}
        </div>
      </div>
    </div>
  );
}