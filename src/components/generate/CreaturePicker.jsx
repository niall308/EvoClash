import React from "react";
import { Dices } from "lucide-react";

export default function CreaturePicker({ creatures, selected, onSelect }) {
  return (
    <div className="w-full md:w-48 bg-white/5 rounded-xl p-3 max-h-72 overflow-y-auto">
      <p className="text-[10px] uppercase tracking-wide text-white/40 font-bold mb-2">Admin: Pick Creature</p>
      <button
        onClick={() => onSelect(null)}
        className={`w-full flex items-center gap-2 text-left text-xs px-2 py-1.5 rounded-lg mb-1 ${!selected ? "bg-purple-600 text-white" : "text-white/70 hover:bg-white/10"}`}
      >
        <Dices className="w-3.5 h-3.5" /> Random
      </button>
      {creatures.map((c) => (
        <button
          key={c.id}
          onClick={() => onSelect(c)}
          className={`w-full text-left text-xs px-2 py-1.5 rounded-lg mb-1 truncate ${selected?.id === c.id ? "bg-purple-600 text-white" : "text-white/70 hover:bg-white/10"}`}
        >
          {c.baseName}
        </button>
      ))}
    </div>
  );
}