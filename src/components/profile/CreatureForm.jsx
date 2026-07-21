import React, { useState } from "react";
import { CATEGORIES } from "@/lib/gameConstants";
import { Plus } from "lucide-react";

const ALL_CATEGORIES = [...CATEGORIES, "Hybrid"];

export default function CreatureForm({ onAdd }) {
  const [baseName, setBaseName] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [role, setRole] = useState("balanced");
  const [description, setDescription] = useState("");
  const isHybrid = category === "Hybrid";

  const submit = (e) => {
    e.preventDefault();
    if (!baseName.trim()) return;
    onAdd({ baseName: baseName.trim(), category, role: isHybrid ? "hyper_rare" : role, description: description.trim() });
    setBaseName("");
    setDescription("");
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
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="flex-1 bg-white/10 text-white rounded-md px-2 py-2 text-xs">
          {ALL_CATEGORIES.map((c) => <option key={c} value={c} className="bg-slate-800 text-white">{c}</option>)}
        </select>
        {isHybrid ? (
          <select value="hyper_rare" disabled className="flex-1 bg-white/10 text-white rounded-md px-2 py-2 text-xs">
            <option value="hyper_rare" className="bg-slate-800 text-white">Hyper Rare</option>
          </select>
        ) : (
          <select value={role} onChange={(e) => setRole(e.target.value)} className="flex-1 bg-white/10 text-white rounded-md px-2 py-2 text-xs">
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
          placeholder="Design guide for the AI card generator, e.g. 'Top half is a Tyrannosaurus Rex with a unicorn-style horn, bottom half is a unicorn with T-Rex legs and a unicorn tail, all in a robot style'"
          rows={3}
          className="w-full bg-white/10 rounded-md px-3 py-2 text-xs outline-none resize-none"
        />
      )}
      <button type="submit" className="w-full flex items-center justify-center gap-1 bg-purple-600 rounded-md py-2 text-sm font-semibold">
        <Plus className="w-4 h-4" /> Add Creature
      </button>
    </form>
  );
}