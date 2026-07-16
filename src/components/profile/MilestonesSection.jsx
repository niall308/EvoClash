import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Target, Plus } from "lucide-react";

const METRIC_LABELS = { gamesPlayed: "Games Played", wins: "Wins", losses: "Losses" };

export default function MilestonesSection({ user, onUserUpdate }) {
  const [milestones, setMilestones] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", metric: "gamesPlayed", target: "", coinReward: "" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const data = await base44.entities.Milestone.list("-created_date");
    setMilestones(data);
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!milestones || !user) return;
    const claimed = user.claimedMilestoneIds || [];
    const toClaim = milestones.filter((m) => !claimed.includes(m.id) && (user[m.metric] || 0) >= m.target);
    if (toClaim.length === 0) return;
    (async () => {
      const totalCoins = toClaim.reduce((sum, m) => sum + m.coinReward, 0);
      const updated = await base44.auth.updateMe({
        coins: (user.coins || 0) + totalCoins,
        claimedMilestoneIds: [...claimed, ...toClaim.map((m) => m.id)],
      });
      onUserUpdate(updated);
    })();
  }, [milestones, user]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.title || !form.target || !form.coinReward) return;
    setSaving(true);
    await base44.entities.Milestone.create({
      title: form.title,
      metric: form.metric,
      target: Number(form.target),
      coinReward: Number(form.coinReward),
    });
    setForm({ title: "", metric: "gamesPlayed", target: "", coinReward: "" });
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
            placeholder="Title (e.g. Play 100 games)"
            className="w-full bg-white/10 rounded-lg px-3 py-2 text-sm outline-none"
          />
          <select
            value={form.metric}
            onChange={(e) => setForm({ ...form, metric: e.target.value })}
            className="w-full bg-white/10 rounded-lg px-3 py-2 text-sm outline-none"
          >
            <option value="gamesPlayed">Games Played</option>
            <option value="wins">Wins</option>
            <option value="losses">Losses</option>
          </select>
          <div className="flex gap-2">
            <input
              type="number"
              value={form.target}
              onChange={(e) => setForm({ ...form, target: e.target.value })}
              placeholder="Target"
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
          <button disabled={saving} className="w-full bg-amber-500 text-black font-bold rounded-lg py-2 text-sm disabled:opacity-50">
            {saving ? "Saving..." : "Create Milestone"}
          </button>
        </form>
      )}

      {!milestones ? (
        <p className="text-white/40 text-sm">Loading...</p>
      ) : milestones.length === 0 ? (
        <p className="text-white/40 text-sm">No milestones yet.</p>
      ) : (
        <div className="space-y-2">
          {milestones.map((m) => {
            const value = user[m.metric] || 0;
            const claimed = (user.claimedMilestoneIds || []).includes(m.id);
            const pct = Math.min(100, Math.round((value / m.target) * 100));
            return (
              <div key={m.id} className="bg-white/5 rounded-xl p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="flex items-center gap-2 font-semibold text-sm">
                    <Target className="w-3.5 h-3.5 text-amber-400" /> {m.title}
                  </span>
                  <span className={`text-xs font-bold ${claimed ? "text-emerald-400" : "text-amber-300"}`}>
                    {claimed ? "Claimed" : `+${m.coinReward} LC`}
                  </span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-1.5 mb-1">
                  <div className="bg-amber-400 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                </div>
                <p className="text-[10px] text-white/40">
                  {Math.min(value, m.target)}/{m.target} {METRIC_LABELS[m.metric]}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}