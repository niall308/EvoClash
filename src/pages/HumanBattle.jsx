import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Users, UserPlus, Clock } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import PlayerLobbySection from "@/components/humanbattle/PlayerLobbySection";
import OfflineBattleSection from "@/components/humanbattle/OfflineBattleSection";
import FriendsSection from "@/components/profile/FriendsSection";
import useOfflineMatches, { isMyTurnInMatch } from "@/hooks/useOfflineMatches";

const ALL_TABS = [
  { key: "lobby", label: "Live", icon: Users },
  { key: "offline", label: "Offline", icon: Clock },
  { key: "friends", label: "Friends", icon: UserPlus },
];

export default function HumanBattle() {
  const { user, updateUser } = useAuth();
  const isAdmin = user?.role === "admin";
  const TABS = isAdmin ? ALL_TABS : ALL_TABS.filter((t) => t.key !== "lobby");
  const [tab, setTab] = useState("offline");
  const { matches: offlineMatches } = useOfflineMatches();
  const myTurnCount = user ? offlineMatches.filter((m) => isMyTurnInMatch(m, user.id)).length : 0;

  if (!user) return null;

  return (
    <div className="text-white px-6 py-8">
      <Link to="/play" className="inline-flex items-center gap-1 text-white/60 text-sm mb-4 min-h-[44px] px-1">
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>
      <h1 className="text-3xl font-black mb-6">Battle vs Human</h1>

      <div className={`grid gap-2 mb-6 bg-white/5 rounded-2xl p-1 ${isAdmin ? "grid-cols-3" : "grid-cols-2"}`}>
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`relative flex items-center justify-center gap-1.5 py-3 rounded-xl text-xs font-bold transition-colors ${
              tab === key ? "bg-gradient-to-r from-blue-600 to-cyan-500" : "text-white/50"
            }`}
          >
            <Icon className="w-4 h-4" /> {label}
            {key === "offline" && myTurnCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold">
                {myTurnCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === "lobby" && <PlayerLobbySection />}
      {tab === "offline" && <OfflineBattleSection />}
      {tab === "friends" && <FriendsSection user={user} onUserUpdate={updateUser} />}
    </div>
  );
}