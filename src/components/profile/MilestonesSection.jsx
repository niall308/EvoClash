import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Target, Plus } from "lucide-react";
import CoinFlyAnimation from "@/components/profile/CoinFlyAnimation";
import DrawerPicker from "@/components/common/DrawerPicker";

const METRIC_LABELS = {
  gamesPlayed: "Games Played",
  wins: "Wins",
  losses: "Losses",
  aiGamesPlayed: "AI Games Played",
  creaturesSummoned: "Creatures Summoned",
  creaturesEvolved: "Creatures Evolved",
  tier2Upgrades: "Tier 2 Upgrades",
  tier3Upgrades: "Tier 3 Upgrades",
  tier4Upgrades: "Tier 4 Upgrades",
  creatureEvolutionLinesCompleted: "Evolution Lines Completed",
  distinctTypesOwnedCount: "Elemental Types Owned",
  totalCardsCreated: "Cards Collected",
  threeElementMatches: "Matches With 3 Types",
  winsUnder100HP: "Wins Under 100 HP",
  flawlessWins: "Flawless Wins",
  monoElementWins: "Single-Type Wins",
  totalDamageDealt: "Total Damage Dealt",
  successfulBlocks: "Successful Blocks",
  fastWins: "Wins Under 3 Minutes",
  comebackWins: "Comeback Wins",
  defeatedHigherTierOpponent: "Higher-Tier Defeats",
  maxWinStreak: "Win Streak",
};

// How many times a milestone's reward has been earned by the user so far.
function timesEarned(milestone, user) {
  const value = user[milestone.metric] || 0;
  if (milestone.repeatable) return Math.floor(value / milestone.target);
  return value >= milestone.target ? 1 : 0;
}

export default function MilestonesSection({ user, onUserUpdate }) {
  const [milestones, setMilestones] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", metric: "gamesPlayed", target: "", coinReward: "", repeatable: false });
  const [saving, setSaving] = useState(false);
  const [flyOrigin, setFlyOrigin] = useState(null);

  const load = async () => {
    const data = await base44.entities.Milestone.list("-created_date");
    setMilestones(data);
  };

  useEffect(() => {
    load();
  }, []);

  const handleClaim = async (m, e) => {
    const earned = timesEarned(m, user);
    const claimed = (user.milestoneClaimCounts || {})[m.id] || 0;
    if (earned <= claimed) return;
    const coinsGained = (earned - claimed) * m.coinReward;
    const rect = e.currentTarget.getBoundingClientRect();
    setFlyOrigin({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, key: Date.now() });
    const updated = await base44.auth.updateMe({
      coins: (user.coins || 0) + coinsGained,
      milestoneClaimCounts: { ...(user.milestoneClaimCounts || {}), [m.id]: earned },
    });
    onUserUpdate(updated);
    window.dispatchEvent(new CustomEvent("coins-claimed", { detail: { newTotal: updated.coins } }));
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.title || !form.target || !form.coinReward) return;
    setSaving(true);
    await base44.entities.Milestone.create({
      title: form.title,
      description: form.description,
      metric: form.metric,
      target: Number(form.target),
      coinReward: Number(form.coinReward),
      repeatable: form.repeatable,
    });
    setForm({ title: "", description: "", metric: "gamesPlayed", target: "", coinReward: "", repeatable: false });
    setShowForm(false);
    setSaving(false);
    load();
  };

  if (!user) return null;

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold">Milestones</h2>
        {user.isAdmin && (
          <button onClick={() => setShowForm((s) => !s)} className="text-amber-400 text-xs flex items-center gap-1">
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="bg-white/5 rounded-xl p-3 mb-3 space-y-2">
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Title (e.g. Play 1 game)"
            className="w-full bg-white/10 rounded-lg px-3 py-2 text-sm outline-none"
          />
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Description"
            rows={2}
            className="w-full bg-white/10 rounded-lg px-3 py-2 text-sm outline-none resize-none"
          />
          <DrawerPicker
            label="Metric"
            value={form.metric}
            onSelect={(v) => setForm({ ...form, metric: v })}
            options={Object.entries(METRIC_LABELS).map(([key, label]) => ({ value: key, label }))}
            triggerClassName="w-full bg-white/10 rounded-lg px-3 py-2 text-sm justify-between"
          />
          <div className="flex gap-2">
            <input
              type="number"
              value={form.target}
              onChange={(e) => setForm({ ...form, target: e.target.value })}
              placeholder="How many times"
              className="w-1/2 bg-white/10 rounded-lg px-3 py-2 text-sm outline-none"
            />
            <input
              type="number"
              value={form.coinReward}
              onChange={(e) => setForm({ ...form, coinReward: e.target.value })}
              placeholder="Coin reward"
              className="w-1/2 bg-white/10 rounded-lg px-3 py-2 text-sm outline-none"
            />
          </div>
          <label className="flex items-center gap-2 text-xs text-white/70 px-1">
            <input
              type="checkbox"
              checked={form.repeatable}
              onChange={(e) => setForm({ ...form, repeatable: e.target.checked })}
            />
            Repeatable (can be earned again each time the target is reached)
          </label>
          <button disabled={saving} className="w-full bg-amber-500 text-black font-bold rounded-lg py-2 text-sm disabled:opacity-50">
            {saving ? "Saving..." : "Create Milestone"}
          </button>
        </form>
      )}

      {!milestones ? (
        <p className="text-white/40 text-sm">Loading...</p>
      ) : milestones.filter((m) => m.repeatable || ((user.milestoneClaimCounts || {})[m.id] || 0) < 1).length === 0 ? (
        <p className="text-white/40 text-sm">No milestones yet.</p>
      ) : (
        <div className="space-y-2">
          {milestones
            .filter((m) => m.repeatable || ((user.milestoneClaimCounts || {})[m.id] || 0) < 1)
            .sort((a, b) => {
              const aClaimable = timesEarned(a, user) > ((user.milestoneClaimCounts || {})[a.id] || 0);
              const bClaimable = timesEarned(b, user) > ((user.milestoneClaimCounts || {})[b.id] || 0);
              return aClaimable === bClaimable ? 0 : aClaimable ? -1 : 1;
            })
            .map((m) => {
            const value = user[m.metric] || 0;
            const claimedCount = (user.milestoneClaimCounts || {})[m.id] || 0;
            const earned = timesEarned(m, user);
            const claimable = earned > claimedCount;
            const doneForever = !m.repeatable && claimedCount >= 1 && !claimable;
            const progressValue = m.repeatable ? Math.min(value - claimedCount * m.target, m.target) : Math.min(value, m.target);
            const pct = claimable || doneForever ? 100 : Math.min(100, Math.round((progressValue / m.target) * 100));
            return (
              <div key={m.id} className="bg-white/5 rounded-xl p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="flex items-center gap-2 font-semibold text-sm">
                    <Target className="w-3.5 h-3.5 text-amber-400" /> {m.title}
                  </span>
                  {claimable ? (
                    <button
                      onClick={(e) => handleClaim(m, e)}
                      className="text-xs font-bold text-black bg-amber-400 px-2.5 py-1 rounded-full animate-pulse"
                    >
                      Claim +{(earned - claimedCount) * m.coinReward} LC
                    </button>
                  ) : doneForever ? (
                    <span className="text-xs font-bold text-emerald-400">Claimed</span>
                  ) : (
                    <span className="text-xs font-bold text-amber-300">+{m.coinReward} LC</span>
                  )}
                </div>
                {m.description && <p className="text-[10px] text-white/40 mb-1">{m.description}</p>}
                <div className="w-full bg-white/10 rounded-full h-1.5 mb-1">
                  <div className="bg-amber-400 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                </div>
                <p className="text-[10px] text-white/40">
                  {claimable || doneForever ? `${m.target}/${m.target}` : `${progressValue}/${m.target}`} {METRIC_LABELS[m.metric]}
                  {m.repeatable ? ` · Earned ${claimedCount}x` : ""}
                </p>
              </div>
            );
          })}
        </div>
      )}
      {flyOrigin && <CoinFlyAnimation key={flyOrigin.key} origin={flyOrigin} onDone={() => setFlyOrigin(null)} />}
    </div>
  );
}