import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, X, Loader2, Clock, RotateCcw, Search, PlusCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import useIncomingBattleRequests from "@/hooks/useIncomingBattleRequests";
import useSentBattleRequestAcceptance from "@/hooks/useSentBattleRequestAcceptance";
import useOfflineMatches, { isMyTurnInMatch } from "@/hooks/useOfflineMatches";
import { useAuth } from "@/lib/AuthContext";
import OpenLobbiesList from "@/components/humanbattle/OpenLobbiesList";
import PlayerProfileModal from "@/components/pvpbattle/PlayerProfileModal";

const MAX_OFFLINE_MATCHES = 10;

export default function OfflineBattleSection() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [players, setPlayers] = useState(null);
  const [recentOpponents, setRecentOpponents] = useState(null);
  const { matches: activeMatchesLive, loaded: activeMatchesLoaded } = useOfflineMatches();
  const activeMatches = activeMatchesLoaded ? activeMatchesLive : null;
  const [sentRequestIds, setSentRequestIds] = useState([]);
  const [pendingRequestIds, setPendingRequestIds] = useState([]);
  const [respondingId, setRespondingId] = useState(null);
  const [searching, setSearching] = useState(false);
  const [profileView, setProfileView] = useState(null);
  const pollRef = useRef(null);
  const searchingRef = useRef(false);
  const { requests: allRequests, refresh: refreshIncoming } = useIncomingBattleRequests();
  const incomingRequests = allRequests.filter((r) => r.matchType === "offline");
  useSentBattleRequestAcceptance(pendingRequestIds, "offline");
  const filteredPlayers = players?.filter((p) => !recentOpponents?.some((r) => r.id === p.id));

  useEffect(() => {
    if (!user) return;
    base44.functions.invoke("getLobbyPlayers", {}).then(({ data }) => setPlayers(data?.players || []));
    base44.functions.invoke("getRecentOpponents", {}).then(({ data }) => setRecentOpponents(data?.opponents || []));
    return () => {
      clearInterval(pollRef.current);
      if (searchingRef.current) base44.functions.invoke("findMatch", { action: "cancel", matchType: "offline" });
    };
  }, [user?.id]);

  const atCap = (activeMatches?.length || 0) >= MAX_OFFLINE_MATCHES;

  const poll = async () => {
    const { data } = await base44.functions.invoke("findMatch", { action: "search", matchType: "offline" });
    if (data?.status === "matched" && data.matchCode) {
      clearInterval(pollRef.current);
      setSearching(false);
      searchingRef.current = false;
      navigate(`/pvp-battle/${data.matchCode}`);
    }
  };

  const startSearch = async () => {
    if (atCap) return;
    setSearching(true);
    searchingRef.current = true;
    await poll();
    pollRef.current = setInterval(poll, 3000);
  };

  const cancelSearch = async () => {
    clearInterval(pollRef.current);
    setSearching(false);
    searchingRef.current = false;
    await base44.functions.invoke("findMatch", { action: "cancel", matchType: "offline" });
  };

  const requestBattle = async (player) => {
    if (!user || atCap) return;
    setSentRequestIds((ids) => [...ids, player.id]);
    const { data } = await base44.functions.invoke("sendBattleInvite", {
      toUserId: player.id,
      toUserName: player.full_name,
      matchType: "offline",
    });
    if (data?.battleRequest?.id) setPendingRequestIds((ids) => [...ids, data.battleRequest.id]);
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

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-bold mb-1">Offline PvP</h2>
        <p className="text-white/60 text-sm">No time limit — leave anytime and resume later.</p>
        <p className={`text-xs font-semibold mt-1 ${atCap ? "text-red-400" : "text-white/40"}`}>
          {activeMatches === null ? "Loading..." : `${activeMatches.length}/${MAX_OFFLINE_MATCHES} active offline battles`}
        </p>
      </div>

      {searching ? (
        <button
          onClick={cancelSearch}
          className="w-full flex items-center justify-center gap-2 bg-white/10 border border-white/20 py-4 rounded-2xl font-bold mb-3 active:scale-95 transition-transform"
        >
          <Loader2 className="w-5 h-5 animate-spin" /> Searching for a match...
          <X className="w-4 h-4 ml-1" />
        </button>
      ) : (
        <button
          onClick={startSearch}
          disabled={atCap}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-500 py-4 rounded-2xl font-bold mb-3 active:scale-95 transition-transform disabled:opacity-40"
        >
          <Search className="w-5 h-5" /> Find Game
        </button>
      )}

      <button
        onClick={() => navigate("/create-offline-lobby")}
        disabled={atCap}
        className="w-full flex items-center justify-center gap-2 bg-white/10 border border-white/20 py-4 rounded-2xl font-bold mb-6 active:scale-95 transition-transform disabled:opacity-40"
      >
        <PlusCircle className="w-5 h-5" /> Create Lobby
      </button>

      <OpenLobbiesList />

      {activeMatches?.length > 0 && (
        <div className="mb-6 space-y-2">
          <p className="text-white/50 text-xs font-semibold">Your Active Battles</p>
          {activeMatches.map((m) => {
            const oppName = m.player1Id === user.id ? m.player2Name : m.player1Name;
            const myScore = m.player1Id === user.id ? m.scoreP1 : m.scoreP2;
            const oppScore = m.player1Id === user.id ? m.scoreP2 : m.scoreP1;
            const isMyTurn = isMyTurnInMatch(m, user.id);
            return (
              <button
                key={m.id}
                onClick={() => navigate(`/pvp-battle/${m.code}`)}
                className="w-full flex items-center justify-between bg-white/5 rounded-2xl px-4 py-3 text-left"
              >
                <div>
                  <p className="font-bold text-sm">vs {oppName}</p>
                  <p className="text-white/40 text-xs">
                    Round {m.round} — You {myScore} : {oppScore} {oppName}
                  </p>
                </div>
                <span className={`flex items-center gap-1 text-xs font-bold ${isMyTurn ? "text-amber-400" : "text-white/50"}`}>
                  <RotateCcw className="w-3.5 h-3.5" /> {isMyTurn ? "Your Turn" : "Their Turn"}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {incomingRequests.length > 0 && (
        <div className="mb-6 space-y-2">
          <p className="text-white/50 text-xs font-semibold">Offline Battle Requests</p>
          {incomingRequests.map((req) => (
            <div key={req.id} className="flex items-center justify-between bg-red-500/10 border border-red-500/30 rounded-2xl px-4 py-3">
              <div>
                <button
                  onClick={() => setProfileView({ id: req.created_by_id, name: req.fromUserName })}
                  className="font-bold text-sm text-left active:opacity-70"
                >
                  {req.fromUserName}
                </button>
                <p className="text-white/40 text-xs">wants an offline battle</p>
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

      {recentOpponents?.length > 0 && (
        <div className="mb-6">
          <p className="text-white/50 text-xs font-semibold mb-2">Recent Opponents</p>
          <div className="space-y-2">
            {recentOpponents.map((p) => {
              const requested = sentRequestIds.includes(p.id);
              return (
                <div key={p.id} className="flex items-center justify-between bg-white/5 rounded-2xl px-4 py-3">
                  <button
                    onClick={() => setProfileView({ id: p.id, name: p.full_name })}
                    className="font-bold text-sm text-left active:opacity-70"
                  >
                    {p.full_name}
                  </button>
                  <button
                    onClick={() => requestBattle(p)}
                    disabled={requested || atCap}
                    className={`flex items-center gap-1 text-xs font-bold px-3 py-2 rounded-full active:scale-95 transition-transform disabled:opacity-50 ${
                      requested ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500 text-black"
                    }`}
                  >
                    {requested ? <Check className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                    {requested ? "Requested" : "Challenge"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {players === null && <p className="text-white/50 text-sm">Loading players...</p>}
      {players?.length === 0 && <p className="text-white/50 text-sm">No other players yet.</p>}

      <div className="space-y-2">
        {filteredPlayers?.map((p) => {
          const requested = sentRequestIds.includes(p.id);
          return (
            <div key={p.id} className="flex items-center justify-between bg-white/5 rounded-2xl px-4 py-3">
              <button
                onClick={() => setProfileView({ id: p.id, name: p.full_name })}
                className="font-bold text-sm text-left active:opacity-70"
              >
                {p.full_name}
              </button>
              <button
                onClick={() => requestBattle(p)}
                disabled={requested || atCap}
                className={`flex items-center gap-1 text-xs font-bold px-3 py-2 rounded-full active:scale-95 transition-transform disabled:opacity-50 ${
                  requested ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500 text-black"
                }`}
              >
                {requested ? <Check className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                {requested ? "Requested" : "Challenge"}
              </button>
            </div>
          );
        })}
      </div>

      {profileView && (
        <PlayerProfileModal player={profileView} onClose={() => setProfileView(null)} />
      )}
    </div>
  );
}