import React from "react";
import { format } from "date-fns";
import { Trophy, X, Skull, Flame, Shield, Layers, Clock } from "lucide-react";

export default function BattleLogEntry({ h }) {
  return (
    <div className="bg-white/5 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="font-bold text-sm">vs {h.opponentName}</p>
        <span
          className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${
            h.outcome === "win" ? "bg-emerald-600/30 text-emerald-400" : "bg-red-600/30 text-red-400"
          }`}
        >
          {h.outcome === "win" ? <Trophy className="w-3 h-3" /> : <X className="w-3 h-3" />}
          {h.outcome === "win" ? "Win" : "Loss"}
        </span>
      </div>
      <p className="text-[11px] text-white/60 mb-2">
        {format(new Date(h.created_date), "MMM d, yyyy · h:mm a")} · Score {h.playerScore}-{h.aiScore}
      </p>

      <div className="grid grid-cols-4 gap-2 mb-3">
        <div className="flex flex-col items-center bg-white/5 rounded-lg py-2">
          <Skull className="w-3.5 h-3.5 text-red-400 mb-1" />
          <span className="text-xs font-bold">{h.cardsDestroyed || 0}</span>
          <span className="text-[11px] text-white/60">Destroyed</span>
        </div>
        <div className="flex flex-col items-center bg-white/5 rounded-lg py-2">
          <Flame className="w-3.5 h-3.5 text-orange-400 mb-1" />
          <span className="text-xs font-bold">{h.damageDealt || 0}</span>
          <span className="text-[11px] text-white/60">Damage</span>
        </div>
        <div className="flex flex-col items-center bg-white/5 rounded-lg py-2">
          <Shield className="w-3.5 h-3.5 text-blue-400 mb-1" />
          <span className="text-xs font-bold">{h.blocksUsed || 0}</span>
          <span className="text-[11px] text-white/60">Blocks</span>
        </div>
        <div className="flex flex-col items-center bg-white/5 rounded-lg py-2">
          <Clock className="w-3.5 h-3.5 text-purple-400 mb-1" />
          <span className="text-xs font-bold">{h.durationSeconds ? `${Math.floor(h.durationSeconds / 60)}m` : "-"}</span>
          <span className="text-[11px] text-white/60">Duration</span>
        </div>
      </div>

      {h.distinctTypesUsed > 0 && (
        <p className="flex items-center gap-1 text-[11px] text-white/60 mb-2">
          <Layers className="w-3 h-3" /> {h.distinctTypesUsed} element type{h.distinctTypesUsed > 1 ? "s" : ""} used
        </p>
      )}

      <div className="flex flex-wrap gap-1">
        {h.cardsUsed.map((name, i) => (
          <span key={i} className="text-[11px] bg-white/10 px-2 py-1 rounded-full">
            {name}
          </span>
        ))}
      </div>
    </div>
  );
}