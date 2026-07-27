import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Copy, Check, Send, Link2, Play, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

const generateCode = () => Math.random().toString(36).slice(2, 8).toUpperCase();

export default function CreateLobby() {
  const navigate = useNavigate();
  const [lobby, setLobby] = useState(null);
  const [players, setPlayers] = useState(null);
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [invitedIds, setInvitedIds] = useState([]);
  const [sendingId, setSendingId] = useState(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    (async () => {
      const me = await base44.auth.me();
      const existing = await base44.entities.GameLobby.filter({ created_by_id: me.id, status: "open" }, "-created_date", 1);
      const activeLobby =
        existing[0] ||
        (await base44.entities.GameLobby.create({ code: generateCode(), status: "open", hostName: me.username || me.full_name }));
      setLobby(activeLobby);
      const { data } = await base44.functions.invoke("getLobbyPlayers", {});
      setPlayers(data?.players || []);
    })();
  }, []);

  useEffect(() => {
    if (!lobby) return;
    const unsubscribe = base44.entities.GameLobby.subscribe((event) => {
      if (event.data?.id === lobby.id) setLobby(event.data);
    });
    return unsubscribe;
  }, [lobby?.id]);

  const handleStart = async () => {
    if (!lobby?.joinedUserId || starting) return;
    setStarting(true);
    const { data } = await base44.functions.invoke("startPvpMatch", { lobbyId: lobby.id });
    if (data?.code) {
      navigate(`/pvp-battle/${data.code}`);
    } else {
      setStarting(false);
    }
  };

  const inviteLink = lobby ? `${window.location.origin}/join-lobby/${lobby.code}` : "";

  const copyCode = () => {
    navigator.clipboard.writeText(lobby.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const invite = async (player) => {
    setSendingId(player.id);
    await base44.functions.invoke("inviteToLobby", { lobbyId: lobby.id, toUserId: player.id });
    setInvitedIds((ids) => [...ids, player.id]);
    setSendingId(null);
  };

  return (
    <div className="text-white px-6 py-8">
      <Link to="/lobby" className="inline-flex items-center gap-1 text-white/60 text-sm mb-8 min-h-[44px] px-1 -ml-1">
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>
      <h1 className="text-3xl font-black mb-2">Your Lobby</h1>
      <p className="text-white/60 mb-6 text-sm">Share your code or invite a friend directly</p>

      {!lobby ? (
        <p className="text-white/50 text-sm">Setting up your lobby...</p>
      ) : (
        <>
          <div className="flex items-center justify-between bg-white/5 rounded-2xl px-4 py-4 mb-3">
            <div>
              <p className="text-white/40 text-xs mb-1">Lobby Code</p>
              <p className="text-2xl font-black tracking-widest text-amber-300">{lobby.code}</p>
            </div>
            <button
              onClick={copyCode}
              className="flex items-center gap-1.5 bg-white/10 text-xs font-bold px-3 py-2 rounded-full active:scale-95 transition-transform"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>

          <button
            onClick={copyLink}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-sm font-bold px-4 py-3 rounded-2xl mb-8 active:scale-95 transition-transform"
          >
            {linkCopied ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
            {linkCopied ? "Invite Link Copied!" : "Copy Invite Link to Share on Discord"}
          </button>

          {lobby.joinedUserId && (
            <p className="text-emerald-400 text-sm font-bold mb-3">{lobby.joinedUserName} has joined!</p>
          )}
          <button
            onClick={handleStart}
            disabled={!lobby.joinedUserId || starting}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-sm font-bold px-4 py-3 rounded-2xl mb-8 active:scale-95 transition-transform disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {starting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {lobby.joinedUserId ? (starting ? "Starting..." : "Start Game") : "Waiting for a player to join..."}
          </button>
        </>
      )}

      <h2 className="text-lg font-bold mb-3">Invite a Friend</h2>
      {players === null && <p className="text-white/50 text-sm">Loading players...</p>}
      {players?.length === 0 && <p className="text-white/50 text-sm">No other players yet.</p>}

      <div className="space-y-2">
        {players?.map((p) => {
          const invited = invitedIds.includes(p.id);
          return (
            <div key={p.id} className="flex items-center justify-between bg-white/5 rounded-2xl px-4 py-3">
              <div className="flex items-center gap-3">
                <span className={`w-2.5 h-2.5 rounded-full ${p.online ? "bg-emerald-400" : "bg-white/20"}`} />
                <div>
                  <p className="font-bold text-sm">{p.full_name}</p>
                  <p className="text-white/40 text-xs">{p.online ? "Online" : "Offline"}</p>
                </div>
              </div>
              <button
                onClick={() => invite(p)}
                disabled={invited || sendingId === p.id}
                className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-full active:scale-95 transition-transform disabled:opacity-50 ${
                  invited ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500 text-black"
                }`}
              >
                {invited ? (
                  <>
                    <Check className="w-3.5 h-3.5" /> Invited
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" /> {sendingId === p.id ? "Sending..." : "Invite"}
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}