import React, { useState } from "react";
import { ArrowUp, ArrowDown, Swords, Shield, Sparkles } from "lucide-react";
import { TYPE_COLORS } from "@/lib/gameConstants";

// Compact list view of the deck cards. Columns: Name, Type, Attack, Defense,
// Bonus. The three numeric columns are sortable (click to toggle high→low / low→high).
// Type filtering is handled by the shared CardFilterBar above; this component
// just sorts the already-filtered list it receives.
export default function DeckListView({ cards, onSelect }) {
  const [sortKey, setSortKey] = useState("attack");
  const [sortDir, setSortDir] = useState("desc"); // 'desc' | 'asc'

  const toggleSort = (key) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const sorted = [...cards].sort((a, b) => {
    const av = a[sortKey] || 0;
    const bv = b[sortKey] || 0;
    return sortDir === "desc" ? bv - av : av - bv;
  });

  const SortHeader = ({ label, sortKey: key, icon: Icon }) => (
    <button
      onClick={() => toggleSort(key)}
      className="flex items-center gap-1 text-xs font-bold text-white/70 active:scale-95 transition"
    >
      {Icon && <Icon className="w-3.5 h-3.5" />}
      {label}
      {sortKey === key && (sortDir === "desc" ? <ArrowDown className="w-3 h-3 text-amber-400" /> : <ArrowUp className="w-3 h-3 text-amber-400" />)}
    </button>
  );

  return (
    <div className="px-4 pb-4">
      <div className="rounded-2xl border border-white/10 overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[1.6fr_1fr_0.8fr_0.8fr_0.8fr] gap-2 px-3 py-2.5 bg-white/5 text-white/60">
          <span className="text-xs font-bold">Name</span>
          <span className="text-xs font-bold">Type</span>
          <SortHeader label="ATK" sortKey="attack" icon={Swords} />
          <SortHeader label="DEF" sortKey="defense" icon={Shield} />
          <SortHeader label="Bonus" sortKey="bonusDamage" icon={Sparkles} />
        </div>

        {/* Rows */}
        <div className="max-h-[55vh] overflow-y-auto">
          {sorted.length === 0 && (
            <p className="text-center text-white/40 text-sm py-8">No cards match your filters.</p>
          )}
          {sorted.map((c) => (
            <button
              key={c.id}
              onClick={() => onSelect?.(c)}
              className="w-full grid grid-cols-[1.6fr_1fr_0.8fr_0.8fr_0.8fr] gap-2 px-3 py-2.5 border-t border-white/5 text-left items-center hover:bg-white/5 active:bg-white/10 transition"
            >
              <span className="text-sm font-bold text-white truncate">{c.name}</span>
              <span className="text-xs font-bold truncate" style={{ color: TYPE_COLORS[c.type] }}>
                {c.type}
              </span>
              <span className="text-sm font-black text-orange-400">{c.attack}</span>
              <span className="text-sm font-black text-sky-400">{c.defense}</span>
              <span className="text-sm font-black text-amber-300">{c.bonusDamage > 0 ? `+${c.bonusDamage}` : "—"}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}