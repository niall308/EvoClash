import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Trophy, Swords, Gamepad2, History, HelpCircle, Target, Flame, Snowflake, ShieldCheck, Trash2 } from "lucide-react";
import { UPGRADE_REQUIREMENT } from "@/lib/gameConstants";
import { getRankByRP } from "@/lib/rankSystem";
import { useAuth } from "@/lib/AuthContext";
import RankEmblem from "@/components/rank/RankEmblem";
import CardFilterBar from "@/components/cards/CardFilterBar";
import ActiveMilestonesSummary from "@/components/profile/ActiveMilestonesSummary";
import FriendsSection from "@/components/profile/FriendsSection";
import DeleteAccountModal from "@/components/profile/DeleteAccountModal";

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="bg-white/5 rounded-xl p-3 flex flex-col items-center gap-1">
      <Icon className="w-5 h-5 text-amber-400" />
      <span className="font-black text-lg">{value}</span>
      <span className="text-[10px] text-white/50">{label}</span>
    </div>
  );
}

export default function Profile() {
  const { user: authUser, logout } = useAuth();
  const [user, setUser] = useState(authUser);
  const [cards, setCards] = useState([]);
  const [filterType, setFilterType] = useState("all");
  const [filterTier, setFilterTier] = useState("all");
  const [hybridOnly, setHybridOnly] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    if (!authUser) return;
    setUser(authUser);
    base44.entities.Card.filter({ created_by_id: authUser.id }).then(setCards);
  }, [authUser?.id]);

  const handleDeleteAccount = async () => {
    await Promise.all([
      base44.entities.Card.deleteMany({ created_by_id: user.id }),
      base44.entities.Deck.deleteMany({ created_by_id: user.id }),
      base44.entities.Friend.deleteMany({ created_by_id: user.id }),
      base44.entities.BattleHistory.deleteMany({ created_by_id: user.id }),
      base44.entities.MatchQueue.deleteMany({ created_by_id: user.id }),
    ]);
    await base44.entities.User.delete(user.id);
    logout(false);
  };

  if (!user) return null;

  const inProgress = cards
    .filter((c) => c.tier < 4)
    .filter(
      (c) =>
        (filterType === "all" || c.type === filterType) &&
        (filterTier === "all" || String(c.tier) === filterTier) &&
        (!hybridOnly || c.isHybrid)
    );
  const rank = getRankByRP(user.rankPoints);
  const streak = user.currentPvpStreak || 0;

  return (
    <div className="min-h-screen bg-[#0D1B2A] text-white px-6 py-6">
      {user.role === "admin" && (
        <Link
          to="/admin"
          className="inline-flex items-center gap-1.5 bg-gradient-to-r from-red-600 to-orange-500 text-xs font-bold px-3 py-2 rounded-full mb-4"
        >
          <ShieldCheck className="w-3.5 h-3.5" /> Admin
        </Link>
      )}

      <div className="flex items-center gap-2 mb-1 flex-wrap">
        <h1 className="text-2xl font-black">{user.username || user.full_name}</h1>
        <RankEmblem rp={user.rankPoints} size="sm" />
        <span className="text-sm font-bold" style={{ color: rank.color }}>
          {rank.name} · #{rank.number}
        </span>
        <span className="text-xs text-white/50 font-semibold">{user.rankPoints || 0} RP</span>
        {streak !== 0 && (
          <span className={`flex items-center gap-1 text-xs font-bold ${streak > 0 ? "text-emerald-400" : "text-red-400"}`}>
            {streak > 0 ? <Flame className="w-3.5 h-3.5" /> : <Snowflake className="w-3.5 h-3.5" />}
            {Math.abs(streak)} {streak > 0 ? "win" : "loss"} streak
          </span>
        )}
      </div>
      <p className="text-white/50 text-xs mb-6">{user.email}</p>

      <div className="grid grid-cols-3 gap-3 mb-8">
        <Stat icon={Trophy} label="Wins" value={user.wins || 0} />
        <Stat icon={Swords} label="Losses" value={user.losses || 0} />
        <Stat icon={Gamepad2} label="Games" value={user.gamesPlayed || 0} />
      </div>

      <Link to="/history" className="flex items-center justify-between bg-white/5 rounded-xl p-4 mb-3">
        <span className="flex items-center gap-2 font-semibold text-sm">
          <History className="w-4 h-4 text-amber-400" /> Battle History
        </span>
        <span className="text-white/40 text-xs">View all →</span>
      </Link>

      <ActiveMilestonesSummary user={user} />

      <FriendsSection user={user} onUserUpdate={setUser} />

      <Link to="/how-to-play" className="flex items-center justify-between bg-white/5 rounded-xl p-4 mb-8">
        <span className="flex items-center gap-2 font-semibold text-sm">
          <HelpCircle className="w-4 h-4 text-amber-400" /> How To Play
        </span>
        <span className="text-white/40 text-xs">View →</span>
      </Link>

      <h2 className="text-lg font-bold mb-3">Upgrade Progress</h2>
      <div className="-mx-6 mb-1">
        <CardFilterBar
          type={filterType}
          onTypeChange={setFilterType}
          tier={filterTier}
          onTierChange={setFilterTier}
          hybridOnly={hybridOnly}
          onHybridToggle={setHybridOnly}
        />
      </div>
      <div className="space-y-3">
        {inProgress.map((c) => (
          <div key={c.id} className="bg-white/5 rounded-xl p-3">
            <p className="font-semibold text-sm">
              {c.name} <span className="text-white/40 text-xs">Tier {c.tier}</span>
            </p>
            <p className="text-[10px] text-white/50 mt-1">
              Destroyed {c.totalWins || 0}/{UPGRADE_REQUIREMENT.cardsDestroyed} · Games {c.totalGames || 0}/{UPGRADE_REQUIREMENT.gamesPlayed} · Match wins {c.matchWins || 0}/{UPGRADE_REQUIREMENT.matchWins}
            </p>
          </div>
        ))}
        {inProgress.length === 0 && <p className="text-white/40 text-sm">No cards in progress.</p>}
      </div>

      <button
        onClick={() => setShowDeleteModal(true)}
        className="w-full flex items-center justify-center gap-2 text-red-400 text-sm font-semibold py-4 mt-8"
      >
        <Trash2 className="w-4 h-4" /> Delete Account
      </button>

      {showDeleteModal && (
        <DeleteAccountModal onConfirm={handleDeleteAccount} onCancel={() => setShowDeleteModal(false)} />
      )}
    </div>
  );
}