import React, { useEffect, useState } from "react";
import { Crown } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Image } from "@/components/ui/image";
import { TIERS, TIER_BADGE, CREATURE_IMAGES_I18N } from "@/lib/creatureImages";

// Compact "Upgrade Guides" panel shown in the creature Details tab: lists the
// default approved guide image per tier (T1–T4) and the creature's unique-attack
// summary. Read-only summary; full management lives in the Images tab.
export default function UpgradeGuidesSection({ creature }) {
  const [guides, setGuides] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const { guides: list } = await base44.functions.invoke("getCreatureGuideImages", { creatureId: creature.id });
        setGuides(list || []);
      } catch {
        setGuides([]);
      }
    })();
  }, [creature.id]);

  const uaName = creature.uniqueAttackName?.trim();
  const ua = uaName
    ? `${uaName} — ${creature.uniqueAttackPercent || 0}% ${creature.uniqueAttackTarget === "all" ? "all" : "single"}`
    : null;

  return (
    <div className="bg-white/5 rounded-lg p-2.5">
      <h4 className="text-white/60 text-xs font-semibold mb-1.5">{CREATURE_IMAGES_I18N.upgradeGuides}</h4>
      <div className="grid grid-cols-4 gap-1.5">
        {TIERS.map((t) => {
          const def = guides.find((g) => g.tier === t && g.isDefaultForTier) || guides.find((g) => g.tier === t);
          return (
            <div key={t} className="flex flex-col items-center gap-1">
              <div className="relative w-full aspect-square rounded-md overflow-hidden bg-black/30 flex items-center justify-center">
                {def?.imageUrl ? (
                  <Image src={def.imageUrl} alt={`T${t} guide`} className="w-full h-full" />
                ) : (
                  <span className="text-white/20 text-[9px]">T{t}</span>
                )}
                <span className={`absolute top-0.5 left-0.5 text-[9px] font-bold px-1 rounded border ${TIER_BADGE[t]}`}>T{t}</span>
                {def?.isDefaultForTier && (
                  <Crown className="absolute bottom-0.5 right-0.5 w-3 h-3 text-amber-300 fill-amber-300" />
                )}
              </div>
              <span className="text-[9px] text-white/40">
                {def ? (def.isDefaultForTier ? "default" : "guide") : CREATURE_IMAGES_I18N.noGuideForTier.replace("{tier}", t)}
              </span>
            </div>
          );
        })}
      </div>
      {ua && (
        <div className="mt-2 text-[10px] text-white/50">
          <span className="font-semibold text-white/70">Unique Attack:</span> {ua}
          {creature.uniqueAttackEffects?.length ? ` — ${creature.uniqueAttackEffects.join(", ")}` : ""}
        </div>
      )}
    </div>
  );
}