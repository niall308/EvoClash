import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Trophy, PlusCircle, Search, X, Loader2, Swords, Check } from "lucide-react";
import { base44 } from "@/api/base44Client";
import useIncomingBattleRequests from "@/hooks/useIncomingBattleRequests";
import { useAuth } from "@/lib/AuthContext";

export default function Lobby() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [players, setPlayers] = useState(null);
  const [searching, setSearching] = useState(false);
  const [sentRequestIds, setSentRequestIds] = useState([]);
  const [respondingId, setRespondingId] = useState(null);
  const pollRef = useRef(null);
  const searchingRef = useRef(false);
  const { requests: incomingRequests, refresh: refreshIncoming } = useIncomingBattleRequests();

  useEffect(() => {
    base44.functions.invoke("getLobbyPlayers", {}).then(({ data }) => setPlayers(data?.players || []));
    return () => {
      clearInterval(pollRef.current);
      if (searchingRef.current) base44.functions.invoke("findMatch", { action: "cancel" });
    };
  }, []);

  const requestBattle = async (player) => {
    if (!user) return;
    setSentRequestIds((ids) => [...ids, player.id]);
    await base44.entities.BattleRequest.create({
      toUserId: player.id,
      toUserName: player.full_name,
      fromUserName: user.username || user.full_name,
    });
  };

  const respondToRequest = async (request, action) => {
    setRespondingId(request.id);
    const { data } = await base44.functions.invoke("respondBattleRequest", { requestId: request.id, action });
    setRespondingId(null);
    if (action === "accept" && data?.matchCode) {
      navigate(`/pvp-battle/${data.matchCode}`);
    } else {
      refreshIncoming();
    }
  };

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
      <Link to="/play" className="inline-flex items-center gap-1 text-white/60 text-sm mb-8 min-h-[44px] px-1 -ml-1">
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
      <p className="text-white/60 mb-1 text-sm">Active players waiting for a match</p>
      <p className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold mb-4">
        <span className="w-2 h-2 rounded-full bg-emerald-400" />
        {players?.filter((p) => p.online).length ?? 0} player{players?.filter((p) => p.online).length === 1 ? "" : "s"} online
      </p>

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

      {incomingRequests.length > 0 && (
        <div className="mb-6 space-y-2">
          <p className="text-white/50 text-xs font-semibold">Battle Requests</p>
          {incomingRequests.map((req) => (
            <div key={req.id} className="flex items-center justify-between bg-red-500/10 border border-red-500/30 rounded-2xl px-4 py-3">
              <div>
                <p className="font-bold text-sm">{req.fromUserName}</p>
                <p className="text-white/40 text-xs">wants to battle you</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => respondToRequest(req, "decline")}
                  disabled={respondingId === req.id}
                  className="p-2 rounded-full bg-white/10 text-white/60 disabled:opacity-40"
                >
                  <X className="w-4 h-4" />
                </button>
                <button
                  onClick={() => respondToRequest(req, "accept")}
                  disabled={respondingId === req.id}
                  className="flex items-center gap-1.5 bg-emerald-500 text-black text-xs font-bold px-3 py-2 rounded-full disabled:opacity-40"
                >
                  {respondingId === req.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  Accept
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {players === null && <p className="text-white/50 text-sm">Loading players...</p>}
      {players?.length === 0 && <p className="text-white/50 text-sm">No other players yet.</p>}

      <div className="space-y-2">
        {players?.map((p) => {
          const requested = sentRequestIds.includes(p.id);
          return (
            <div key={p.id} className="flex items-center justify-between bg-white/5 rounded-2xl px-4 py-3">
              <div className="flex items-center gap-3">
                <span className={`w-2.5 h-2.5 rounded-full ${p.online ? "bg-emerald-400" : "bg-white/20"}`} />
                <div>
                  <p className="font-bold text-sm">{p.full_name}</p>
                  <p className="text-white/40 text-xs">{p.online ? "Online" : "Offline"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 text-amber-300 text-xs font-bold">
                  <Trophy className="w-3.5 h-3.5" /> Rank #{p.rank}
                </div>
                {p.online && (
                  <button
                    onClick={() => requestBattle(p)}
                    disabled={requested}
                    className={`flex items-center gap-1 text-xs font-bold px-3 py-2 rounded-full active:scale-95 transition-transform disabled:opacity-50 ${
                      requested ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500 text-black"
                    }`}
                  >
                    {requested ? <Check className="w-3.5 h-3.5" /> : <Swords className="w-3.5 h-3.5" />}
                    {requested ? "Requested" : "Battle"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}