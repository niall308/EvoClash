import React from "react";
import { TYPES } from "@/lib/gameConstants";

export default function CardFilterBar({ type, onTypeChange, tier, onTierChange, hybridOnly, onHybridToggle }) {
  return (
    <div className="flex flex-wrap items-center gap-2 px-4 pb-2">
      <select
        value={type}
        onChange={(e) => onTypeChange(e.target.value)}
        className="bg-slate-800 text-white text-xs rounded-lg px-3 py-2 border border-white/10"
      >
        <option value="all">All Types</option>
        {TYPES.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
      <select
        value={tier}
        onChange={(e) => onTierChange(e.target.value)}
        className="bg-slate-800 text-white text-xs rounded-lg px-3 py-2 border border-white/10"
      >
        <option value="all">All Tiers</option>
        {[1, 2, 3, 4].map((t) => (
          <option key={t} value={t}>
            Tier {t}
          </option>
        ))}
      </select>
      <button
        onClick={() => onHybridToggle(!hybridOnly)}
        className={`text-xs font-bold rounded-lg px-3 py-2 border ${
          hybridOnly ? "bg-amber-500 border-amber-500 text-black" : "bg-slate-800 border-white/10 text-white/70"
        }`}
      >
        Hybrid Only
      </button>
    </div>
  );
}