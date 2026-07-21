import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Copy, Check, Send } from "lucide-react";
import { base44 } from "@/api/base44Client";

const generateCode = () => Math.random().toString(36).slice(2, 8).toUpperCase();

export default function CreateLobby() {
  const [lobby, setLobby] = useState(null);
  const [players, setPlayers] = useState(null);
  const [copied, setCopied] = useState(false);
  const [invitedIds, setInvitedIds] = useState([]);
  const [sendingId, setSendingId] = useState(null);

  useEffect(() => {
    (async () => {
      const me = await base44.auth.me();
      const existing = await base44.entities.GameLobby.filter({ created_by_id: me.id, status: "open" }, "-created_date", 1);
      const activeLobby = existing[0] || (await base44.entities.GameLobby.create({ code: generateCode(), status: "open" }));
      setLobby(activeLobby);
      const { data } = await base44.functions.invoke("getLobbyPlayers", {});
      setPlayers(data?.players || []);
    })();
  }, []);

  const copyCode = () => {
    navigator.clipboard.writeText(lobby.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const invite = async (player) => {
    setSendingId(player.id);
    await base44.integrations.Core.SendEmail({
      to: player.id,
      subject: "You've been invited to a lobby!",
      body: `You've been invited to join a lobby. Enter this code in the app to join: ${lobby.code}`,
    });
    setInvitedIds((ids) => [...ids, player.id]);
    setSendingId(null);
  };

  return (
    <div className="min-h-screen bg-[#0D1B2A] text-white px-6 py-8">
      <Link to="/lobby" className="inline-flex items-center gap-1 text-white/60 text-sm mb-8">
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>
      <h1 className="text-3xl font-black mb-2">Your Lobby</h1>
      <p className="text-white/60 mb-6 text-sm">Share your code or invite a friend directly</p>

      {!lobby ? (
        <p className="text-white/50 text-sm">Setting up your lobby...</p>
      ) : (
        <div className="flex items-center justify-between bg-white/5 rounded-2xl px-4 py-4 mb-8">
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