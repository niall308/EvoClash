import React, { useState } from "react";
import { Trash2, ChevronDown, Swords } from "lucide-react";
import CreatureEditor from "@/components/admin/creatures/CreatureEditor";
import { getCreatureUniqueAttack } from "@/lib/uniqueAttacks";

// One creature row: summary + delete + expand toggle. Expanding renders the
// CreatureEditor (Details / Images / Unique Attack). The description inline-edit
// moved into the Details tab; this row stays a compact summary.
export default function CreatureRow({ creature, onDelete, onUpdated }) {
  const [open, setOpen] = useState(false);
  const ua = getCreatureUniqueAttack(creature);

  return (
    <div className="bg-white/5 rounded-lg px-3 py-2">
      <div className="flex items-center justify-between">
        <button onClick={() => setOpen((o) => !o)} className="flex-1 flex items-center gap-2 text-left min-h-[36px]">
          <ChevronDown className={`w-4 h-4 text-white/40 transition-transform ${open ? "rotate-180" : ""}`} />
          <div>
            <p className="text-sm font-semibold">{creature.baseName}</p>
            <p className="text-[10px] text-white/40">
              {creature.category} · {creature.role}
              {ua && (
                <span className="ml-1 inline-flex items-center gap-0.5 text-purple-300">
                  · <Swords className="w-2.5 h-2.5" /> {ua.name}
                </span>
              )}
            </p>
          </div>
        </button>
        <button onClick={() => onDelete(creature.id)} className="text-red-400 hover:text-red-300 p-1" aria-label={`Delete ${creature.baseName}`}>
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      {open && <CreatureEditor creature={creature} onUpdated={onUpdated} />}
    </div>
  );
}