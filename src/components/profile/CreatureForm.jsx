import React, { useState } from "react";
import { CATEGORIES } from "@/lib/gameConstants";
import { Plus } from "lucide-react";

export default function CreatureForm({ onAdd }) {
  const [baseName, setBaseName] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [role, setRole] = useState("balanced");
  const [description, setDescription] = useState("");
  const isHybrid = category === "Hybrid";

  const submit = (e) => {
    e.preventDefault();
    if (!baseName.trim()) return;
    if (isHybrid && !description.trim()) return;
    onAdd({
      baseName: baseName.trim(),
      category,
      role: isHybrid ? "Hyper Rare" : role,
      description: isHybrid ? description.trim() : "",
    });
    setBaseName("");
    setDescription("");
  };

  return (
    <form onSubmit={submit} className="bg-white/5 rounded-lg p-3 space-y-2 mb-3">
      <input
        value={baseName}
        onChange={(e) => setBaseName(e.target.value)}
        placeholder="Creature name"
        className="w-full bg-white/10 text-white placeholder:text-white/40 rounded-md px-3 py-2 text-sm outline-none"
      />
      <div className="flex gap-2">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="flex-1 bg-slate-800 text-white rounded-md px-2 py-2 text-xs"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c} className="bg-slate-800 text-white">
              {c}
            </option>
          ))}
        </select>
        {!isHybrid && (
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="flex-1 bg-slate-800 text-white rounded-md px-2 py-2 text-xs"
          >
            <option value="predator" className="bg-slate-800 text-white">Predator</option>
            <option value="prey" className="bg-slate-800 text-white">Prey</option>
            <option value="balanced" className="bg-slate-800 text-white">Balanced</option>
          </select>
        )}
      </div>
      {isHybrid && (
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="AI design guide, e.g. Unicorn x Tyrannosaurus Rex — top half T-Rex with a unicorn horn, bottom half unicorn with T-Rex legs and tail, robot style..."
          rows={3}
          className="w-full bg-white/10 text-white placeholder:text-white/40 rounded-md px-3 py-2 text-xs outline-none resize-none"
        />
      )}
      <button type="submit" className="w-full flex items-center justify-center gap-1 bg-purple-600 rounded-md py-2 text-sm font-semibold">
        <Plus className="w-4 h-4" /> Add Creature
      </button>
    </form>
  );
}