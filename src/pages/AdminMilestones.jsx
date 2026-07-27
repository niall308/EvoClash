import React, { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Loader2, Target, Plus } from "lucide-react";
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

export default function AdminMilestones() {
  const [user, setUser] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [milestones, setMilestones] = useState(null);
  const [form, setForm] = useState({ title: "", description: "", metric: "gamesPlayed", target: "", coinReward: "", repeatable: false });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    base44.auth.me().then((u) => {
      setUser(u);
      setLoaded(true);
    });
    base44.entities.Milestone.list("-created_date").then(setMilestones);
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.title || !form.target || !form.coinReward) return;
    setSaving(true);
    const created = await base44.entities.Milestone.create({
      title: form.title,
      description: form.description,
      metric: form.metric,
      target: Number(form.target),
      coinReward: Number(form.coinReward),
      repeatable: form.repeatable,
    });
    setMilestones((prev) => [created, ...(prev || [])]);
    setForm({ title: "", description: "", metric: "gamesPlayed", target: "", coinReward: "", repeatable: false });
    setSaving(false);
  };

  if (!loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0D1B2A]">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }
  if (user?.role !== "admin") return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-[#0D1B2A] text-white px-6 py-6">
      <Link to="/admin" className="inline-flex items-center gap-1 text-white/60 text-sm mb-6 min-h-[44px] px-1 -ml-1">
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>
      <h1 className="text-2xl font-black mb-6">Milestones</h1>

      <form onSubmit={handleAdd} className="bg-white/5 rounded-xl p-3 mb-6 space-y-2">
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
        <button disabled={saving} className="w-full flex items-center justify-center gap-1.5 bg-amber-500 text-black font-bold rounded-lg py-2 text-sm disabled:opacity-50">
          <Plus className="w-4 h-4" /> {saving ? "Saving..." : "Create Milestone"}
        </button>
      </form>

      {!milestones ? (
        <p className="text-white/40 text-sm">Loading...</p>
      ) : milestones.length === 0 ? (
        <p className="text-white/40 text-sm">No milestones yet.</p>
      ) : (
        <div className="space-y-2">
          {milestones.map((m) => (
            <div key={m.id} className="bg-white/5 rounded-xl p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="flex items-center gap-2 font-semibold text-sm">
                  <Target className="w-3.5 h-3.5 text-amber-400" /> {m.title}
                </span>
                <span className="text-xs font-bold text-amber-300">+{m.coinReward} LC</span>
              </div>
              {m.description && <p className="text-[10px] text-white/40 mb-1">{m.description}</p>}
              <p className="text-[10px] text-white/40">
                Target: {m.target} {METRIC_LABELS[m.metric]}
                {m.repeatable ? " · Repeatable" : ""}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}