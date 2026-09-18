import React, { useEffect, useState } from "react";
import { X, Loader2, Swords } from "lucide-react";
import { base44 } from "@/api/base44Client";

// Lists the player's most recent distinct PvP opponents so they can pick one
// to propose a trade with (no friendship required — see canTradeWith).
export default function RecentPlayersModal({ onSelect, onClose }) {
  const [opponents, setOpponents] = useState(null);

  useEffect(() => {
    base44.functions.invoke("getRecentOpponents", {}).then(({ data }) => {
      setOpponents(data?.opponents || []);
    });
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div
        className="w-full max-w-md bg-[#1A2E45] rounded-t-3xl sm:rounded-3xl border border-white/10 p-5 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <Swords className="w-5 h-5 text-amber-400" /> Recent Players
          </h2>
          <button onClick={onClose} aria-label="Close">
            <X className="w-5 h-5 text-white/50" />
          </button>
        </div>
        <p className="text-white/50 text-xs mb-4">Pick a recent PvP opponent to propose a trade.</p>

        {!opponents ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-white/50" />
          </div>
        ) : opponents.length === 0 ? (
          <p className="text-center text-white/40 text-sm py-8">No recent PvP opponents yet. Play a match first!</p>
        ) : (
          <div className="space-y-2">
            {opponents.map((p) => (
              <button
                key={p.id}
                onClick={() => onSelect?.(p)}
                className="w-full flex items-center justify-between bg-white/5 active:bg-white/10 rounded-2xl px-4 py-3 transition-colors"
              >
                <span className="font-bold text-sm text-white">{p.full_name}</span>
                <span className="text-amber-400 text-xs font-bold">Trade →</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}