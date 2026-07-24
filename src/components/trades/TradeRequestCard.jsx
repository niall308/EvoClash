import React, { useState } from "react";
import { ArrowLeftRight, Check, X, Clock } from "lucide-react";
import GameCard from "@/components/cards/GameCard";
import TradeDetailModal from "@/components/trades/TradeDetailModal";

const STATUS_LABEL = {
  pending: { text: "Pending", color: "text-amber-400" },
  completed: { text: "Completed", color: "text-emerald-400" },
  transferred: { text: "Transferred", color: "text-sky-400" },
  declined: { text: "Declined", color: "text-red-400" },
  cancelled: { text: "Cancelled", color: "text-white/40" },
};

export default function TradeRequestCard({ trade, direction, onAccept, onDecline, onCancel, onClaim, busy }) {
  const [showDetail, setShowDetail] = useState(false);
  const claimed = direction === "incoming" ? trade.recipientClaimed : trade.proposerClaimed;
  const fromCard = {
    name: trade.fromCardName,
    type: trade.fromCardType,
    tier: trade.fromCardTier,
    attack: trade.fromCardAttack,
    defense: trade.fromCardDefense,
    bonusDamage: trade.fromCardBonusDamage,
    isHybrid: trade.fromCardIsHybrid,
    imageUrl: trade.fromCardImageUrl,
  };
  const toCard = {
    name: trade.toCardName,
    type: trade.toCardType,
    tier: trade.toCardTier,
    attack: trade.toCardAttack,
    defense: trade.toCardDefense,
    bonusDamage: trade.toCardBonusDamage,
    isHybrid: trade.toCardIsHybrid,
    imageUrl: trade.toCardImageUrl,
  };
  const isCompleted = trade.status === "completed";
  const statusKey = isCompleted && claimed ? "transferred" : trade.status;
  const status = STATUS_LABEL[statusKey] || STATUS_LABEL.pending;

  return (
    <div
      className={`bg-white/5 rounded-xl p-3 mb-3 ${isCompleted ? "cursor-pointer" : ""}`}
      onClick={() => isCompleted && setShowDetail(true)}
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-white/70">
          {direction === "incoming" ? `From ${trade.fromUserName || "a friend"}` : `To ${trade.toUserName}`}
        </p>
        <span className={`flex items-center gap-1 text-[10px] font-bold ${status.color}`}>
          <Clock className="w-3 h-3" /> {status.text}
        </span>
      </div>

      <div className="flex items-center justify-center gap-3 mb-3">
        <div className="text-center">
          <GameCard card={direction === "incoming" ? fromCard : fromCard} size="xs" />
          <p className="text-[9px] text-white/50 mt-1">{direction === "incoming" ? "They offer" : "You offer"}</p>
        </div>
        <ArrowLeftRight className="w-4 h-4 text-amber-400 shrink-0" />
        <div className="text-center">
          <GameCard card={toCard} size="xs" />
          <p className="text-[9px] text-white/50 mt-1">{direction === "incoming" ? "For your" : "You receive"}</p>
        </div>
      </div>

      {trade.status === "pending" && direction === "incoming" && (
        <div className="flex gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); onAccept(trade.id); }}
            disabled={busy}
            className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600 text-white text-xs font-bold py-2 rounded-full disabled:opacity-50"
          >
            <Check className="w-3.5 h-3.5" /> Accept
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDecline(trade.id); }}
            disabled={busy}
            className="flex-1 flex items-center justify-center gap-1.5 bg-red-600 text-white text-xs font-bold py-2 rounded-full disabled:opacity-50"
          >
            <X className="w-3.5 h-3.5" /> Decline
          </button>
        </div>
      )}

      {trade.status === "pending" && direction === "outgoing" && (
        <button
          onClick={(e) => { e.stopPropagation(); onCancel(trade.id); }}
          disabled={busy}
          className="w-full flex items-center justify-center gap-1.5 bg-white/10 text-white text-xs font-bold py-2 rounded-full disabled:opacity-50"
        >
          <X className="w-3.5 h-3.5" /> Cancel Request
        </button>
      )}

      {isCompleted && !claimed && (
        <button
          onClick={(e) => { e.stopPropagation(); onClaim(trade.id); }}
          disabled={busy}
          className="w-full flex items-center justify-center gap-1.5 bg-emerald-600 text-white text-xs font-bold py-2 rounded-full disabled:opacity-50"
        >
          <Check className="w-3.5 h-3.5" /> Accept Card
        </button>
      )}

      {isCompleted && claimed && (
        <p className="text-center text-sky-400 text-[11px] font-semibold">Card added to your deck</p>
      )}

      {showDetail && (
        <TradeDetailModal
          trade={trade}
          fromCard={fromCard}
          toCard={toCard}
          direction={direction}
          onClose={() => setShowDetail(false)}
        />
      )}
    </div>
  );
}