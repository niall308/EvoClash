import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Trophy, Swords, Gamepad2, History, HelpCircle, Flame, Snowflake, ShieldCheck, Trash2, Pencil, Bell, LifeBuoy, LogOut } from "lucide-react";
import { getRankByRP } from "@/lib/rankSystem";
import { useAuth } from "@/lib/AuthContext";
import RankEmblem from "@/components/rank/RankEmblem";
import ActiveMilestonesSummary from "@/components/profile/ActiveMilestonesSummary";
import DeleteAccountModal from "@/components/profile/DeleteAccountModal";
import EditProfileModal from "@/components/profile/EditProfileModal";
import SupportModal from "@/components/profile/SupportModal";
import { Image } from "@/components/ui/image";

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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);

  useEffect(() => {
    if (!authUser) return;
    setUser(authUser);
  }, [authUser?.id]);

  const handleDeleteAccount = async () => {
    await base44.functions.invoke("deleteAccount", {});
    logout(false);
  };

  if (!user) return null;

  const rank = getRankByRP(user.rankPoints);
  const streak = user.currentPvpStreak || 0;

  return (
    <div className="text-white px-6 py-6">
      {user.role === "admin" && (
        <Link
          to="/admin"
          className="inline-flex items-center gap-1.5 bg-gradient-to-r from-red-600 to-orange-500 text-xs font-bold px-3 py-2 rounded-full mb-4"
        >
          <ShieldCheck className="w-3.5 h-3.5" /> Admin
        </Link>
      )}

      <div className="flex items-center gap-3 mb-1">
        {user.profilePictureUrl && (
          <div className="w-12 h-12 rounded-full overflow-hidden bg-white/10 shrink-0">
            <Image src={user.profilePictureUrl} className="w-full h-full" />
          </div>
        )}
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-2xl font-black">{user.username || user.full_name}</h1>
          <button
            onClick={() => setShowEditModal(true)}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-white/10 text-white/60"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <div className="flex items-center gap-2 mb-1 flex-wrap">
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

      <Link to="/how-to-play" className="flex items-center justify-between bg-white/5 rounded-xl p-4 mb-3">
        <span className="flex items-center gap-2 font-semibold text-sm">
          <HelpCircle className="w-4 h-4 text-amber-400" /> How To Play
        </span>
        <span className="text-white/40 text-xs">View →</span>
      </Link>

      <Link to="/notification-settings" className="flex items-center justify-between bg-white/5 rounded-xl p-4 mb-8">
        <span className="flex items-center gap-2 font-semibold text-sm">
          <Bell className="w-4 h-4 text-amber-400" /> Notifications
        </span>
        <span className="text-white/40 text-xs">View →</span>
      </Link>

      <button
        onClick={() => setShowSupportModal(true)}
        className="w-full flex items-center justify-between bg-white/5 rounded-xl p-4 mb-3"
      >
        <span className="flex items-center gap-2 font-semibold text-sm">
          <LifeBuoy className="w-4 h-4 text-amber-400" /> Support
        </span>
        <span className="text-white/40 text-xs">Open →</span>
      </button>

      <button
        onClick={() => logout(true)}
        className="w-full flex items-center justify-center gap-2 text-white/70 text-sm font-semibold py-4 mt-8"
      >
        <LogOut className="w-4 h-4" /> Log Out
      </button>

      <button
        onClick={() => setShowDeleteModal(true)}
        className="w-full flex items-center justify-center gap-2 text-red-400 text-sm font-semibold py-4"
      >
        <Trash2 className="w-4 h-4" /> Delete Account
      </button>

      {showDeleteModal && (
        <DeleteAccountModal onConfirm={handleDeleteAccount} onCancel={() => setShowDeleteModal(false)} />
      )}

      {showEditModal && (
        <EditProfileModal
          user={user}
          onClose={() => setShowEditModal(false)}
          onSaved={async () => {
            setShowEditModal(false);
            const freshUser = await base44.auth.me();
            setUser(freshUser);
          }}
        />
      )}

      {showSupportModal && <SupportModal onClose={() => setShowSupportModal(false)} />}
    </div>
  );
}