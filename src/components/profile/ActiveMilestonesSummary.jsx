import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Target } from "lucide-react";

// Progress toward a milestone's NEXT (not-yet-claimed) reward.
function getProgress(milestone, user) {
  const value = user[milestone.metric] || 0;
  const claimed = (user.milestoneClaimCounts || {})[milestone.id] || 0;
  if (!milestone.repeatable && claimed >= 1) return null;
  const progressValue = milestone.repeatable ? value - claimed * milestone.target : value;
  const pct = Math.min(100, Math.round((Math.min(progressValue, milestone.target) / milestone.target) * 100));
  return { progressValue: Math.min(progressValue, milestone.target), pct };
}

export default function ActiveMilestonesSummary({ user }) {
  const [milestones, setMilestones] = useState(null);

  useEffect(() => {
    base44.entities.Milestone.list("-created_date").then(setMilestones);
  }, []);

  if (!milestones) return null;

  const active = milestones
    .map((m) => ({ m, progress: getProgress(m, user) }))
    .filter((x) => x.progress)
    .sort((a, b) => b.progress.pct - a.progress.pct)
    .slice(0, 3);

  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-bold">Active Milestones</h2>
        <Link to="/milestones" className="text-white/40 text-xs">
          View all →
        </Link>
      </div>
      {active.length === 0 ? (
        <p className="text-white/40 text-sm bg-white/5 rounded-xl p-3">No active milestones right now.</p>
      ) : (
        <div className="space-y-2">
          {active.map(({ m, progress }) => (
            <div key={m.id} className="bg-white/5 rounded-xl p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="flex items-center gap-2 font-semibold text-sm">
                  <Target className="w-3.5 h-3.5 text-amber-400" /> {m.title}
                </span>
                <span className="text-xs font-bold text-amber-300">+{m.coinReward} LC</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-1.5 mb-1">
                <div className="bg-amber-400 h-1.5 rounded-full" style={{ width: `${progress.pct}%` }} />
              </div>
              <p className="text-[10px] text-white/40">
                {progress.progressValue}/{m.target}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}