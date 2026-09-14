import React, { useEffect, useState } from "react";
import { Wand2, Crown } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Image } from "@/components/ui/image";
import { TIERS, TIER_BADGE, CREATURE_IMAGES_I18N } from "@/lib/creatureImages";

// Admin-only "Choose Guide" step for the card generator. Lists the approved
// guide images for the selected creature (grouped by tier), lets the admin pick
// one to use as the card-art reference, and reports the chosen guideImageId up.
// "No guide" falls back to the creature's default reference (existing behaviour).
export default function GuidePicker({ creature, guideImageId, onSelectGuide }) {
  const [guides, setGuides] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!creature) {
      setGuides([]);
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const { guides: list } = await base44.functions.invoke("getCreatureGuideImages", { creatureId: creature.id });
        setGuides(list || []);
      } catch {
        setGuides([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [creature?.id]);

  if (!creature) return null;

  return (
    <div className="w-full max-w-xs">
      <div className="flex items-center gap-1.5 text-white/60 text-xs font-semibold mb-1.5">
        <Wand2 className="w-3.5 h-3.5" /> {CREATURE_IMAGES_I18N.chooseGuide}
      </div>
      {loading ? (
        <div className="text-white/40 text-xs">Loading guides…</div>
      ) : guides.length === 0 ? (
        <div className="text-white/30 text-xs">No approved guides for this creature yet.</div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          <button
            onClick={() => onSelectGuide(null)}
            className={`w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs ${
              !guideImageId ? "bg-purple-600/30 border border-purple-500/50 text-white" : "bg-white/5 text-white/60 hover:bg-white/10"
            }`}
          >
            {CREATURE_IMAGES_I18N.guideNone}
          </button>
          {TIERS.map((t) => {
            const tierGuides = guides.filter((g) => g.tier === t);
            if (tierGuides.length === 0) return null;
            return (
              <div key={t}>
                <div className="flex items-center gap-1 mb-1">
                  <span className={`text-[9px] font-bold px-1 rounded border ${TIER_BADGE[t]}`}>T{t}</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {tierGuides.map((g) => (
                    <button
                      key={g.imageId}
                      onClick={() => onSelectGuide(g.imageId)}
                      className={`relative aspect-square rounded-md overflow-hidden border-2 ${
                        guideImageId === g.imageId ? "border-purple-500" : "border-transparent"
                      }`}
                      aria-label={`Use tier ${t} guide`}
                    >
                      <Image src={g.imageUrl} alt={`T${t} guide`} className="w-full h-full" />
                      {g.isDefaultForTier && (
                        <Crown className="absolute bottom-0.5 right-0.5 w-3 h-3 text-amber-300 fill-amber-300" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}