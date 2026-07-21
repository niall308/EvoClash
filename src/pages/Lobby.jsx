import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Trophy } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function Lobby() {
  const [players, setPlayers] = useState(null);

  useEffect(() => {
    base44.functions.invoke("getLobbyPlayers", {}).then(({ data }) => setPlayers(data?.players || []));
  }, []);

  return (
    <div className="min-h-screen bg-[#0D1B2A] text-white px-6 py-8">
      <Link to="/play" className="inline-flex items-center gap-1 text-white/60 text-sm mb-8">
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>
      <h1 className="text-3xl font-black mb-2">Player Lobby</h1>
      <p className="text-white/60 mb-6 text-sm">Active players waiting for a match</p>

      {players === null && <p className="text-white/50 text-sm">Loading players...</p>}
      {players?.length === 0 && <p className="text-white/50 text-sm">No other players yet.</p>}

      <div className="space-y-2">
        {players?.map((p) => (
          <div key={p.id} className="flex items-center justify-between bg-white/5 rounded-2xl px-4 py-3">
            <div className="flex items-center gap-3">
              <span className={`w-2.5 h-2.5 rounded-full ${p.online ? "bg-emerald-400" : "bg-white/20"}`} />
              <div>
                <p className="font-bold text-sm">{p.full_name}</p>
                <p className="text-white/40 text-xs">{p.online ? "Online" : "Offline"}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-amber-300 text-xs font-bold">
              <Trophy className="w-3.5 h-3.5" /> Rank #{p.rank}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}