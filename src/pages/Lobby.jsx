import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Trophy, PlusCircle, Search, X, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function Lobby() {
  const navigate = useNavigate();
  const [players, setPlayers] = useState(null);
  const [searching, setSearching] = useState(false);
  const pollRef = useRef(null);
  const searchingRef = useRef(false);

  useEffect(() => {
    base44.functions.invoke("getLobbyPlayers", {}).then(({ data }) => setPlayers(data?.players || []));
    return () => {
      clearInterval(pollRef.current);
      if (searchingRef.current) base44.functions.invoke("findMatch", { action: "cancel" });
    };
  }, []);

  const poll = async () => {
    const { data } = await base44.functions.invoke("findMatch", { action: "search" });
    if (data?.status === "matched" && data.matchCode) {
      clearInterval(pollRef.current);
      setSearching(false);
      searchingRef.current = false;
      navigate(`/pvp-battle/${data.matchCode}`);
    }
  };

  const startSearch = async () => {
    setSearching(true);
    searchingRef.current = true;
    await poll();
    pollRef.current = setInterval(poll, 3000);
  };

  const cancelSearch = async () => {
    clearInterval(pollRef.current);
    setSearching(false);
    searchingRef.current = false;
    await base44.functions.invoke("findMatch", { action: "cancel" });
  };

  return (
    <div className="min-h-screen bg-[#0D1B2A] text-white px-6 py-8">
      <Link to="/play" className="inline-flex items-center gap-1 text-white/60 text-sm mb-8 py-2 px-1 -ml-1">
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-3xl font-black">Player Lobby</h1>
        <Link
          to="/create-lobby"
          className="flex items-center gap-1.5 bg-amber-500 text-black text-xs font-bold px-3 py-2 rounded-full active:scale-95 transition-transform"
        >
          <PlusCircle className="w-4 h-4" /> Create Lobby
        </Link>
      </div>
      <p className="text-white/60 mb-4 text-sm">Active players waiting for a match</p>

      {searching ? (
        <button
          onClick={cancelSearch}
          className="w-full flex items-center justify-center gap-2 bg-white/10 border border-white/20 py-4 rounded-2xl font-bold mb-6 active:scale-95 transition-transform"
        >
          <Loader2 className="w-5 h-5 animate-spin" /> Searching for a match...
          <X className="w-4 h-4 ml-1" />
        </button>
      ) : (
        <button
          onClick={startSearch}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-500 py-4 rounded-2xl font-bold mb-6 active:scale-95 transition-transform"
        >
          <Search className="w-5 h-5" /> Find Game
        </button>
      )}

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