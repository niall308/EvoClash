import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Trophy, Loader2 } from "lucide-react";
import PullToRefresh from "@/components/common/PullToRefresh";

export default function Leaderboards() {
  const [leaderboard, setLeaderboard] = useState(null);

  const fetchLeaderboard = async () => {
    const res = await base44.functions.invoke("getLeaderboard", {});
    setLeaderboard(res.data.leaderboard);
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  return (
    <PullToRefresh onRefresh={fetchLeaderboard}>
    <div className="min-h-screen bg-[#0D1B2A] text-white px-6 py-8">
      <Link to="/play" className="inline-flex items-center gap-1 text-white/60 text-sm mb-8 min-h-[44px] px-1 -ml-1">
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>
      <h1 className="text-3xl font-black mb-2 flex items-center gap-2">
        <Trophy className="w-7 h-7 text-amber-400" /> Leaderboards
      </h1>
      <p className="text-white/60 mb-6 text-sm">Top 50 players by wins</p>

      {!leaderboard ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-white/50" />
        </div>
      ) : (
        <div className="space-y-2">
          {leaderboard.map((p, i) => (
            <div key={i} className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="w-6 text-center font-bold text-amber-400">{i + 1}</span>
                <span className="font-semibold text-sm">{p.full_name}</span>
              </div>
              <div className="flex gap-4 text-xs text-white/60">
                <span className="text-emerald-400 font-bold">{p.wins} W</span>
                <span>{p.losses} L</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
    </PullToRefresh>
  );
}