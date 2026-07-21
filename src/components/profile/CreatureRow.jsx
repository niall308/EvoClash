import React from "react";
import { Trash2 } from "lucide-react";

export default function CreatureRow({ creature, onDelete }) {
  return (
    <div className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
      <div>
        <p className="text-sm font-semibold">{creature.baseName}</p>
        <p className="text-[10px] text-white/40">{creature.category} · {creature.role}</p>
        {creature.description && <p className="text-[10px] text-white/30 mt-0.5 max-w-xs">{creature.description}</p>}
      </div>
      <button onClick={() => onDelete(creature.id)} className="text-red-400 hover:text-red-300">
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}