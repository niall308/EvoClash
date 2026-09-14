import React, { useState } from "react";
import { Check } from "lucide-react";
import { base44 } from "@/api/base44Client";
import CreatureImagesTab from "./CreatureImagesTab";
import UniqueAttackPanel from "./UniqueAttackPanel";
import UpgradeGuidesSection from "./UpgradeGuidesSection";
import { CREATURE_IMAGES_I18N } from "@/lib/creatureImages";

// Re-fetch the creature after image/default changes so the parent list reflects
// the new referenceImageUrl (and any other server-side updates).
const reloadCreature = async (id, onUpdated) => {
  try {
    const fresh = await base44.entities.Creature.get(id);
    if (onUpdated) onUpdated(fresh);
  } catch {
    /* best-effort */
  }
};

// Expandable per-creature editor with three tabs: Details (description/category/
// role), Images (generation/approval), Unique Attack. The parent CreatureManager
// passes an onUpdated callback so list state stays in sync.
export default function CreatureEditor({ creature, onUpdated }) {
  const [tab, setTab] = useState("details");
  const [description, setDescription] = useState(creature.description || "");
  const [savingDesc, setSavingDesc] = useState(false);

  const saveDescription = async () => {
    setSavingDesc(true);
    const updated = await base44.entities.Creature.update(creature.id, { description: description.trim() });
    onUpdated(updated);
    setSavingDesc(false);
  };

  const TABS = [
    { id: "details", label: CREATURE_IMAGES_I18N.detailsTab },
    { id: "images", label: CREATURE_IMAGES_I18N.imagesTab },
    { id: "unique", label: CREATURE_IMAGES_I18N.uniqueAttackTab },
  ];

  return (
    <div className="mt-2 border-t border-white/10 pt-2">
      <div className="flex gap-1 mb-3">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
              tab === t.id ? "bg-purple-600 text-white" : "bg-white/5 text-white/60"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "details" && (
        <div className="space-y-2">
          <UpgradeGuidesSection creature={creature} />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Anatomy / design guide for the AI card generator…"
            className="w-full bg-white/10 rounded-md px-2.5 py-2 text-xs outline-none resize-none"
          />
          <button
            onClick={saveDescription}
            disabled={savingDesc}
            className="flex items-center gap-1 bg-purple-600 rounded-md px-2.5 py-1.5 text-xs font-semibold"
          >
            <Check className="w-3.5 h-3.5" /> Save description
          </button>
        </div>
      )}

      {tab === "images" && (
        <CreatureImagesTab creature={creature} onCreatureChanged={() => reloadCreature(creature.id, onUpdated)} />
      )}

      {tab === "unique" && <UniqueAttackPanel creature={creature} onUpdated={onUpdated} />}
    </div>
  );
}