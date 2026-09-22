import React from "react";
import { X } from "lucide-react";
import { Image } from "@/components/ui/image";

// Side-by-side preview of the baby (Tier 3) and upgraded (Tier 4) card art for
// a single creature, shown when the admin taps "Preview" on an egg creature row.
export default function EggCreaturePreview({ creature, onClose }) {
  const babyImages = creature.eggBabyImages || [];
  const goodImages = creature.eggUpgradedGoodImages || [];
  const evilImages = creature.eggUpgradedEvilImages || [];
  const babyName = creature.eggBabyName || creature.baseName;
  const goodName = creature.eggUpgradedGoodName || creature.eggUpgradedName || `Blessed ${creature.baseName}`;
  const evilName = creature.eggUpgradedEvilName || creature.eggUpgradedName || `Cursed ${creature.baseName}`;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-full max-w-md bg-[#0D1B2A] rounded-3xl border border-white/10 p-5 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-black text-white">{creature.baseName} — Preview</h2>
          <button onClick={onClose} aria-label="Close">
            <X className="w-5 h-5 text-white/60" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <PreviewCard
            tier={3}
            tierLabel="T3"
            name={babyName}
            image={babyImages[0]}
            placeholder="No baby image yet"
          />
          <PreviewCard
            tier={4}
            tierLabel="T4 · Good"
            name={goodName}
            image={goodImages[0]}
            placeholder="No Good image yet"
            badgeClass="bg-emerald-500 text-white"
          />
          <PreviewCard
            tier={4}
            tierLabel="T4 · Evil"
            name={evilName}
            image={evilImages[0]}
            placeholder="No Evil image yet"
            badgeClass="bg-rose-600 text-white"
          />
        </div>

        <p className="text-[10px] text-white/40 text-center mt-4">
          Shows the first of each image set. The live hatch/upgrade flow picks one at random. Good/Evil is a 50/50 roll on upgrade.
        </p>
      </div>
    </div>
  );
}

function PreviewCard({ tier, tierLabel, name, image, placeholder, badgeClass }) {
  return (
    <div className="rounded-2xl overflow-hidden border border-white/10 bg-black/30 flex flex-col">
      <div className="relative w-full aspect-[3/4]">
        {image ? (
          <Image src={image} alt={name} className="w-full h-full" fittingType="cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[10px] text-white/40 text-center px-2">
            {placeholder}
          </div>
        )}
        <span
          className={`absolute top-1.5 left-1.5 text-[10px] font-black px-1.5 py-0.5 rounded-md ${
            badgeClass || (tier === 3 ? "bg-blue-500 text-white" : "bg-amber-500 text-black")
          }`}
        >
          {tierLabel}
        </span>
      </div>
      <p className="text-center text-xs font-bold text-white py-2 px-1 truncate">{name}</p>
    </div>
  );
}