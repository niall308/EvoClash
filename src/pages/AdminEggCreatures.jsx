import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Loader2, Egg } from "lucide-react";
import { base44 } from "@/api/base44Client";
import EggCreatureRow from "@/components/admin/EggCreatureRow";

// Admin page for configuring which creatures can hatch from eggs and what they
// look like. Lists every creature in the game and lets the admin set baby +
// upgraded card art (multiple images each) and the baby/upgraded display names.
export default function AdminEggCreatures() {
  const [creatures, setCreatures] = useState(null);

  useEffect(() => {
    (async () => {
      const list = await base44.entities.Creature.filter({}, undefined, 1000);
      list.sort(
        (a, b) =>
          (a.category || "").localeCompare(b.category || "") ||
          (a.baseName || "").localeCompare(b.baseName || "")
      );
      setCreatures(list);
    })();
  }, []);

  return (
    <div className="text-white px-6 py-6 pb-24">
      <Link to="/admin" className="inline-flex items-center gap-1 text-white/60 text-sm mb-6 min-h-[44px] px-1 -ml-1">
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>
      <h1 className="text-2xl font-black mb-1 flex items-center gap-2">
        <Egg className="w-6 h-6 text-amber-400" /> Egg Creatures
      </h1>
      <p className="text-white/50 text-xs mb-6">
        Configure the baby &amp; upgraded card art and names for creatures that can hatch from eggs. A creature needs at least one baby image to be eligible.
      </p>
      {!creatures ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-white/50" />
        </div>
      ) : (
        <div className="space-y-3">
          {creatures.map((c) => (
            <EggCreatureRow
              key={c.id}
              creature={c}
              onUpdate={(u) => setCreatures((prev) => prev.map((x) => (x.id === u.id ? u : x)))}
            />
          ))}
        </div>
      )}
    </div>
  );
}