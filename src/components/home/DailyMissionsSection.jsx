import React, { useEffect, useState } from "react";
import { CheckCircle2, Target } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { DAILY_MISSIONS } from "@/lib/gameConstants";

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export default function DailyMissionsSection({ user, onUserUpdate }) {
  const [claimingId, setClaimingId] = useState(null);

  useEffect(() => {
    if (!user || user.dailyMissionsDate === todayKey()) return;
    const baseline = {};
    DAILY_MISSIONS.forEach((m) => {
      baseline[m.metric] = user[m.metric] || 0;
    });
    base44.auth
      .updateMe({ dailyMissionsDate: todayKey(), dailyMissionsBaseline: baseline, dailyMissionsClaimed: [] })
      .then(onUserUpdate);
  }, [user, onUserUpdate]);

  if (!user || user.dailyMissionsDate !== todayKey()) return null;

  const baseline = user.dailyMissionsBaseline || {};
  const claimed = user.dailyMissionsClaimed || [];

  const handleClaim = async (mission) => {
    setClaimingId(mission.id);
    const updated = await base44.auth.updateMe({
      coins: (user.coins || 0) + mission.coinReward,
      dailyMissionsClaimed: [...claimed, mission.id],
    });
    onUserUpdate(updated);
    setClaimingId(null);
  };

  return (
    <div className="w-full max-w-sm mt-8">
      <h2 className="text-lg font-bold mb-3">Daily Missions</h2>
      <div className="space-y-2">
        {DAILY_MISSIONS.map((mission) => {
          const progress = Math.min(mission.target, Math.max(0, (user[mission.metric] || 0) - (baseline[mission.metric] || 0)));
          const completed = progress >= mission.target;
          const isClaimed = claimed.includes(mission.id);
          const pct = Math.round((progress / mission.target) * 100);
          return (
            <div key={mission.id} className="bg-white/5 rounded-xl p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="flex items-center gap-2 font-semibold text-sm">
                  <Target className="w-3.5 h-3.5 text-amber-400" /> {mission.label}
                </span>
                {isClaimed ? (
                  <span className="flex items-center gap-1 text-xs font-bold text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Claimed
                  </span>
                ) : completed ? (
                  <button
                    onClick={() => handleClaim(mission)}
                    disabled={claimingId === mission.id}
                    className="text-xs font-bold text-black bg-amber-400 px-2.5 py-1 rounded-full animate-pulse disabled:opacity-50"
                  >
                    Claim +{mission.coinReward} LC
                  </button>
                ) : (
                  <span className="text-xs font-bold text-amber-300">+{mission.coinReward} LC</span>
                )}
              </div>
              <div className="w-full bg-white/10 rounded-full h-1.5 mb-1">
                <div className="bg-amber-400 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
              </div>
              <p className="text-[10px] text-white/40">
                {progress}/{mission.target}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}