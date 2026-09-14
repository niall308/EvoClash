import React, { useState } from "react";
import { Trash2, Pencil, Check } from "lucide-react";

export default function CreatureRow({ creature, onDelete, onUpdateDescription }) {
  const [editing, setEditing] = useState(false);
  const [description, setDescription] = useState(creature.description || "");

  const save = async () => {
    await onUpdateDescription(creature.id, description.trim());
    setEditing(false);
  };

  return (
    <div className="bg-white/5 rounded-lg px-3 py-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">{creature.baseName}</p>
          <p className="text-[10px] text-white/40">{creature.category} · {creature.role}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setEditing((e) => !e)} className="text-white/50 hover:text-white/80">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onDelete(creature.id)} className="text-red-400 hover:text-red-300">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      {editing ? (
        <div className="mt-2 space-y-1.5">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Anatomy guide for the AI card generator, e.g. 'a winged bird-woman with a human female torso and face, feathered wings instead of arms, and taloned bird feet — never a snake or reptile body'"
            rows={3}
            className="w-full bg-white/10 rounded-md px-2.5 py-2 text-xs outline-none resize-none"
          />
          <button onClick={save} className="flex items-center gap-1 bg-purple-600 rounded-md px-2.5 py-1.5 text-xs font-semibold">
            <Check className="w-3.5 h-3.5" /> Save
          </button>
        </div>
      ) : (
        creature.description && <p className="text-[10px] text-white/30 mt-0.5 max-w-xs">{creature.description}</p>
      )}
    </div>
  );
}