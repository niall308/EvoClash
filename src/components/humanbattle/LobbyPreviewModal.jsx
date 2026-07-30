import React, { useState } from "react";
import { motion } from "framer-motion";
import { X, Loader2, Swords } from "lucide-react";
import { base44 } from "@/api/base44Client";
import RankEmblem from "@/components/rank/RankEmblem";
import { getRankByRP } from "@/lib/rankSystem";

// Preview of an open lobby's host (rank + win/loss record) before joining —
// joining immediately starts the battle.
export default function LobbyPreviewModal({ lobby, onClose, onJoined }) {
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");
  const rank = getRankByRP(lobby.rankPoints);

  const join = async () => {
    setJoining(true);
    setError("");
    const { data } = await base44.functions.invoke("joinOpenLobby", { lobbyId: lobby.id });
    if (data?.code) {
      onJoined(data.code);
    } else {
      setError(data?.error || "Couldn't join this lobby — it may no longer be open.");
      setJoining(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm bg-[#1A2E45] border border-white/10 rounded-2xl p-6 text-white"
      >
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-xl font-black">{lobby.hostName}'s Lobby</h2>
          <button
            onClick={onClose}
            className="text-white/50 hover:text-white min-w-[44px] min-h-[44px] -m-2.5 flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-3 bg-white/5 rounded-2xl px-4 py-3 mb-3">
          <RankEmblem rp={lobby.rankPoints} size="lg" />
          <div>
            <p className="font-bold text-sm">{rank.name}</p>
            <p className="text-white/40 text-xs">{lobby.rankPoints} RP</p>
          </div>
        </div>

        <div className="flex items-center justify-between bg-white/5 rounded-2xl px-4 py-3 mb-6">
          <span className="text-white/60 text-sm">Win / Loss</span>
          <span className="font-bold text-sm">
            <span className="text-emerald-400">{lobby.wins}W</span> — <span className="text-red-400">{lobby.losses}L</span>
          </span>
        </div>

        {error && <p className="text-red-400 text-xs mb-3">{error}</p>}

        <button
          onClick={join}
          disabled={joining}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 py-3 rounded-2xl font-bold active:scale-95 transition-transform disabled:opacity-50"
        >
          {joining ? <Loader2 className="w-4 h-4 animate-spin" /> : <Swords className="w-4 h-4" />}
          {joining ? "Joining..." : "Join & Start Battle"}
        </button>
      </motion.div>
    </div>
  );
}