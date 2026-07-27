import React, { useEffect, useState } from "react";
import { Trophy, Swords, Loader2, UserMinus, X, Users } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { getRankByRP } from "@/lib/rankSystem";
import RankEmblem from "@/components/rank/RankEmblem";

export default function FriendDetailModal({ friend, onClose, onRemove }) {
  const [stats, setStats] = useState(null);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    base44.functions.invoke("getFriendStats", { friendUserId: friend.friendUserId }).then(({ data }) => {
      if (!data?.error) setStats(data);
    });
  }, [friend.friendUserId]);

  const handleRemove = async () => {
    if (!window.confirm(`Remove ${friend.friendName} as a friend?`)) return;
    setRemoving(true);
    await base44.entities.Friend.delete(friend.id);
    setRemoving(false);
    onRemove(friend.id);
  };

  const rank = stats ? getRankByRP(stats.rankPoints) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="bg-[#132338] rounded-2xl p-5 w-full max-w-xs flex flex-col items-center gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="self-end -mt-1 -mr-1 text-white/50">
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-lg font-black text-white -mt-3">{friend.friendName}</h2>

        {!stats ? (
          <Loader2 className="w-6 h-6 animate-spin text-white/50 my-4" />
        ) : (
          <>
            <div className="flex items-center gap-2">
              <RankEmblem rp={stats.rankPoints} size="md" />
              <span className="text-sm font-bold" style={{ color: rank.color }}>
                {rank.name} · #{rank.number}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 w-full">
              <div className="bg-white/5 rounded-xl p-3 flex flex-col items-center gap-1">
                <Trophy className="w-5 h-5 text-amber-400" />
                <span className="font-black text-lg text-white">{stats.wins}</span>
                <span className="text-[10px] text-white/50">Wins</span>
              </div>
              <div className="bg-white/5 rounded-xl p-3 flex flex-col items-center gap-1">
                <Swords className="w-5 h-5 text-amber-400" />
                <span className="font-black text-lg text-white">{stats.losses}</span>
                <span className="text-[10px] text-white/50">Losses</span>
              </div>
            </div>

            <div className="w-full">
              <p className="text-white/40 text-[10px] flex items-center gap-1 mb-2">
                <Users className="w-3 h-3" /> Head to Head
              </p>
              {stats.headToHead.totalGames === 0 ? (
                <p className="text-white/40 text-xs">You haven't played this friend yet.</p>
              ) : (
                <div className="flex items-center justify-center gap-3 bg-white/5 rounded-xl p-3">
                  <div className="flex flex-col items-center">
                    <span className="font-black text-lg text-emerald-400">{stats.headToHead.myWins}</span>
                    <span className="text-[10px] text-white/50">You</span>
                  </div>
                  <span className="text-white/30 text-xs font-bold">vs</span>
                  <div className="flex flex-col items-center">
                    <span className="font-black text-lg text-red-400">{stats.headToHead.friendWins}</span>
                    <span className="text-[10px] text-white/50">{friend.friendName}</span>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        <button
          onClick={handleRemove}
          disabled={removing}
          className="w-full flex items-center justify-center gap-2 bg-red-600/20 text-red-400 font-bold py-2.5 rounded-xl disabled:opacity-50"
        >
          {removing ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserMinus className="w-4 h-4" />}
          Remove Friend
        </button>
      </div>
    </div>
  );
}