import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, X } from "lucide-react";
import { base44 } from "@/api/base44Client";

const generateCode = () => Math.random().toString(36).slice(2, 8).toUpperCase();

// Hosts a publicly listed offline lobby — anyone can browse and join it from
// the Offline tab, and the match starts automatically the moment someone joins.
export default function CreateOfflineLobby() {
  const navigate = useNavigate();
  const [lobby, setLobby] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    (async () => {
      const me = await base44.auth.me();
      const existing = await base44.entities.GameLobby.filter(
        { created_by_id: me.id, status: "open", matchType: "offline" },
        "-created_date",
        1
      );
      const activeLobby =
        existing[0] ||
        (await base44.entities.GameLobby.create({
          code: generateCode(),
          matchType: "offline",
          status: "open",
          hostName: me.username || me.full_name,
        }));
      setLobby(activeLobby);
    })();
  }, []);

  useEffect(() => {
    if (!lobby) return;
    const unsubscribe = base44.entities.GameLobby.subscribe((event) => {
      if (event.data?.id === lobby.id) {
        if (event.data.status === "in_progress") navigate(`/pvp-battle/${event.data.code}`);
        else setLobby(event.data);
      }
    });
    return unsubscribe;
  }, [lobby?.id, navigate]);

  const cancelLobby = async () => {
    if (!lobby) return;
    setCancelling(true);
    await base44.entities.GameLobby.delete(lobby.id);
    navigate("/human-battle");
  };

  return (
    <div className="text-white px-6 py-8">
      <Link to="/human-battle" className="inline-flex items-center gap-1 text-white/60 text-sm mb-8 min-h-[44px] px-1 -ml-1">
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>
      <h1 className="text-3xl font-black mb-2">Your Open Lobby</h1>
      <p className="text-white/60 mb-8 text-sm">Anyone can see and join your lobby — the battle starts as soon as someone joins.</p>

      {!lobby ? (
        <p className="text-white/50 text-sm">Setting up your lobby...</p>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-2 text-white/50 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Waiting for a player to join...
          </div>
          <button
            onClick={cancelLobby}
            disabled={cancelling}
            className="flex items-center gap-2 bg-white/10 border border-white/20 text-sm font-bold px-4 py-3 rounded-2xl active:scale-95 transition-transform disabled:opacity-50"
          >
            <X className="w-4 h-4" /> {cancelling ? "Cancelling..." : "Cancel Lobby"}
          </button>
        </div>
      )}
    </div>
  );
}