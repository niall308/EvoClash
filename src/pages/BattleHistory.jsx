import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Trophy, X, Loader2 } from "lucide-react";

export default function BattleHistory() {
  const [history, setHistory] = useState(null);

  useEffect(() => {
    (async () => {
      const user = await base44.auth.me();
      const records = await base44.entities.BattleHistory.filter({ created_by_id: user.id }, "-created_date");
      setHistory(records);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-[#0D1B2A] text-white px-6 py-6">
      <Link to="/profile" className="inline-flex items-center gap-1 text-white/60 text-sm mb-6">
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>
      <h1 className="text-2xl font-black mb-6">Battle History</h1>

      {!history ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-white/50" />
        </div>
      ) : history.length === 0 ? (
        <p className="text-white/40 text-sm">No battles played yet.</p>
      ) : (
        <div className="space-y-3">
          {history.map((h) => (
            <div key={h.id} className="bg-white/5 rounded-xl p-4">
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
              <p className="text-[10px] text-white/40 mb-2">
                {format(new Date(h.created_date), "MMM d, yyyy · h:mm a")} · Score {h.playerScore}-{h.aiScore}
              </p>
              <div className="flex flex-wrap gap-1">
                {h.cardsUsed.map((name, i) => (
                  <span key={i} className="text-[10px] bg-white/10 px-2 py-1 rounded-full">
                    {name}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}