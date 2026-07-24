import React from "react";
import { X, ArrowLeftRight } from "lucide-react";
import GameCard from "@/components/cards/GameCard";

export default function TradeDetailModal({ trade, fromCard, toCard, direction, onClose }) {
  const tradeDate = new Date(trade.updated_date || trade.created_date).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-[#0D1B2A] border border-white/10 rounded-2xl p-5 max-w-sm w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-bold text-sm">Trade Details</h3>
          <button onClick={onClose} className="text-white/50">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center justify-center gap-4 mb-4">
          <div className="text-center">
            <GameCard card={fromCard} size="sm" />
            <p className="text-[10px] text-white/50 mt-1">
              {direction === "incoming" ? "They offered" : "You offered"}
            </p>
          </div>
          <ArrowLeftRight className="w-5 h-5 text-amber-400 shrink-0" />
          <div className="text-center">
            <GameCard card={toCard} size="sm" />
            <p className="text-[10px] text-white/50 mt-1">
              {direction === "incoming" ? "You received" : "They received"}
            </p>
          </div>
        </div>

        <p className="text-center text-white/40 text-[11px]">Traded on {tradeDate}</p>
      </div>
    </div>
  );
}