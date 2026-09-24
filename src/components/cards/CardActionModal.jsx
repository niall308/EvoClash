import React, { useState } from "react";
import { ArrowUpCircle, ArrowLeftRight, BarChart3, X, GitCompareArrows, Trash2 } from "lucide-react";
import GameCard from "./GameCard";

export default function CardActionModal({ card, onClose, onUpgrade, onTrade, onStats, onCompare, onDelete }) {
  const [confirming, setConfirming] = useState(false);
  if (!card) return null;

  const handleConfirmDelete = () => {
    setConfirming(false);
    if (onDelete) onDelete(card);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6" onClick={onClose}>
      <div
        className="relative bg-[#132338] rounded-2xl p-5 w-full max-w-xs flex flex-col items-center gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-3 right-3 text-white/50">
          <X className="w-5 h-5" />
        </button>
        {onDelete && !confirming && (
          <button
            onClick={() => setConfirming(true)}
            className="absolute top-3 left-3 flex items-center gap-1 text-red-400/80 active:scale-95 transition-transform"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}

        {confirming ? (
          <div className="w-full flex flex-col items-center gap-4 py-6">
            <div className="w-14 h-14 rounded-full bg-red-500/15 flex items-center justify-center">
              <Trash2 className="w-7 h-7 text-red-400" />
            </div>
            <p className="text-white font-bold text-center">Delete this card?</p>
            <p className="text-white/50 text-xs text-center -mt-2">This action cannot be undone.</p>
            <div className="w-full flex flex-col gap-2">
              <button
                onClick={handleConfirmDelete}
                className="w-full flex items-center justify-center gap-2 bg-red-500 text-white font-bold py-3 rounded-full active:scale-95 transition-transform"
              >
                <Trash2 className="w-5 h-5" /> Delete
              </button>
              <button
                onClick={() => setConfirming(false)}
                className="w-full bg-white/10 text-white font-bold py-3 rounded-full active:scale-95 transition-transform"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
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
          </>
        )}
      </div>
    </div>
  );
}