import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Users, CheckCircle2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function JoinLobby() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("loading"); // loading | notfound | own | ready | joined
  const [lobby, setLobby] = useState(null);

  useEffect(() => {
    (async () => {
      const me = await base44.auth.me();
      const matches = await base44.entities.GameLobby.filter({ code: code.toUpperCase() }, "-created_date", 1);
      const found = matches[0];
      if (!found) {
        setStatus("notfound");
        return;
      }
      setLobby(found);
      if (found.created_by_id === me.id) {
        setStatus("own");
      } else if (found.joinedUserId) {
        setStatus(found.joinedUserId === me.id ? "joined" : "notfound");
      } else {
        setStatus("ready");
      }
    })();
  }, [code]);

  // Once joined, wait for the host to start the match, then jump straight into it.
  useEffect(() => {
    if (status !== "joined" || !lobby) return;
    const unsubscribe = base44.entities.GameLobby.subscribe((event) => {
      if (event.data?.id === lobby.id && event.data.status === "in_progress") {
        navigate(`/pvp-battle/${lobby.code}`);
      }
    });
    return unsubscribe;
  }, [status, lobby, navigate]);

  const joinLobby = async () => {
    const me = await base44.auth.me();
    const updated = await base44.entities.GameLobby.update(lobby.id, {
      status: "closed",
      joinedUserId: me.id,
      joinedUserName: me.username || me.full_name,
    });
    setLobby(updated);
    setStatus("joined");
  };

  return (
    <div className="text-white px-6 py-8">
      <Link to="/lobby" className="inline-flex items-center gap-1 text-white/60 text-sm mb-8 min-h-[44px] px-1 -ml-1">
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>

      {status === "loading" && <p className="text-white/50 text-sm">Looking up lobby...</p>}

      {status === "notfound" && (
        <div>
          <h1 className="text-2xl font-black mb-2">Lobby Not Found</h1>
          <p className="text-white/60 text-sm">This invite link is invalid or the lobby is no longer available.</p>
        </div>
      )}

      {status === "own" && (
        <div>
          <h1 className="text-2xl font-black mb-2">This Is Your Lobby</h1>
          <p className="text-white/60 text-sm mb-6">Share this link with a friend instead of opening it yourself.</p>
          <button
            onClick={() => navigate("/create-lobby")}
            className="bg-amber-500 text-black font-bold px-4 py-3 rounded-2xl text-sm"
          >
            Go to My Lobby
          </button>
        </div>
      )}

      {status === "ready" && lobby && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-6 h-6 text-amber-400" />
            <h1 className="text-2xl font-black">Join {lobby.hostName || "a Player"}'s Lobby</h1>
          </div>
          <p className="text-white/60 text-sm mb-6">Lobby code: <span className="font-bold text-amber-300 tracking-widest">{lobby.code}</span></p>
          <button
            onClick={joinLobby}
            className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 font-bold px-4 py-4 rounded-2xl text-sm active:scale-95 transition-transform"
          >
            Join Lobby
          </button>
        </div>
      )}

      {status === "joined" && lobby && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            <h1 className="text-2xl font-black">You're In!</h1>
          </div>
          <p className="text-white/60 text-sm mb-6">
            You joined {lobby.hostName || "the host"}'s lobby. Waiting for them to start the match...
          </p>
          <div className="flex items-center gap-2 text-white/50 text-sm mb-6">
            <div className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
            You'll jump into battle automatically once they start
          </div>
          <Link to="/play" className="inline-block bg-amber-500 text-black font-bold px-4 py-3 rounded-2xl text-sm">
            Back to Play Menu
          </Link>
        </div>
      )}
    </div>
  );
}