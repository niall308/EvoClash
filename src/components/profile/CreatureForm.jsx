import React, { useState } from "react";
import { CATEGORIES } from "@/lib/gameConstants";
import { Plus } from "lucide-react";

export default function CreatureForm({ onAdd }) {
  const [baseName, setBaseName] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [role, setRole] = useState("balanced");

  const submit = (e) => {
    e.preventDefault();
    if (!baseName.trim()) return;
    onAdd({ baseName: baseName.trim(), category, role });
    setBaseName("");
  };

  return (
    <form onSubmit={submit} className="bg-white/5 rounded-lg p-3 space-y-2 mb-3">
      <input
        value={baseName}
        onChange={(e) => setBaseName(e.target.value)}
        placeholder="Creature name"
        className="w-full bg-white/10 rounded-md px-3 py-2 text-sm outline-none"
      />
      <div className="flex gap-2">
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="flex-1 bg-white/10 rounded-md px-2 py-2 text-xs">
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={role} onChange={(e) => setRole(e.target.value)} className="flex-1 bg-white/10 rounded-md px-2 py-2 text-xs">
          <option value="predator">Predator</option>
          <option value="prey">Prey</option>
          <option value="balanced">Balanced</option>
        </select>
      </div>
      <button type="submit" className="w-full flex items-center justify-center gap-1 bg-purple-600 rounded-md py-2 text-sm font-semibold">
        <Plus className="w-4 h-4" /> Add Creature
      </button>
    </form>
  );
}