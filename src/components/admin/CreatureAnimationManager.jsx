import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { CREATURES, CATEGORIES } from "@/lib/gameConstants";
import { Upload, Loader2, X } from "lucide-react";
import DrawerPicker from "@/components/common/DrawerPicker";
import { Image } from "@/components/ui/image";

const STATIC_CREATURES = CATEGORIES.flatMap((cat) => CREATURES[cat].map((name) => ({ name, category: cat })));
const TIERS = [1, 2, 3, 4];

export default function CreatureAnimationManager() {
  const [templates, setTemplates] = useState([]);
  const [allCreatures, setAllCreatures] = useState(STATIC_CREATURES);
  const [selected, setSelected] = useState(STATIC_CREATURES[0].name);
  const [uploadingTier, setUploadingTier] = useState(null);

  const load = async () => {
    const [templateList, customCreatures] = await Promise.all([
      base44.entities.CardTemplate.list(),
      base44.entities.Creature.list(),
    ]);
    setTemplates(templateList);
    const custom = customCreatures.map((c) => ({ name: c.baseName, category: c.category }));
    const merged = [...STATIC_CREATURES];
    custom.forEach((c) => {
      if (!merged.some((m) => m.name === c.name)) merged.push(c);
    });
    setAllCreatures(merged);
  };
  useEffect(() => {
    load();
  }, []);

  const getTemplate = (baseName) => templates.find((t) => t.baseName === baseName);

  const handleUpload = async (tier, e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingTier(tier);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const creature = allCreatures.find((c) => c.name === selected);
    const existing = getTemplate(selected);
    const field = `tier${tier}Animation`;
    if (existing) {
      await base44.entities.CardTemplate.update(existing.id, { [field]: file_url });
    } else {
      await base44.entities.CardTemplate.create({ baseName: selected, category: creature.category, [field]: file_url });
    }
    await load();
    setUploadingTier(null);
  };

  const handleDelete = async (tier) => {
    const existing = getTemplate(selected);
    if (!existing) return;
    await base44.entities.CardTemplate.update(existing.id, { [`tier${tier}Animation`]: "" });
    await load();
  };

  const current = getTemplate(selected);

  return (
    <section>
      <h2 className="text-lg font-bold mb-3">Creature Animations</h2>
      <DrawerPicker
        label="Select Creature"
        value={selected}
        onSelect={setSelected}
        options={allCreatures.map((c) => ({ value: c.name, label: c.name }))}
        triggerClassName="bg-white/10 rounded-lg px-3 py-2 text-sm mb-4 w-full justify-between"
      />
      <div className="grid grid-cols-2 gap-3">
        {TIERS.map((tier) => {
          const field = `tier${tier}Animation`;
          const url = current?.[field];
          return (
            <div key={tier} className="relative bg-white/5 border border-white/10 rounded-xl p-3 flex flex-col items-center gap-2">
              {url && (
                <button
                  onClick={() => handleDelete(tier)}
                  className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-red-400 hover:text-red-300"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
              <span className="text-xs font-bold">Tier {tier}</span>
              {url ? (
                <Image src={url} className="w-16 h-16 rounded-lg" />
              ) : (
                <span className="text-[10px] text-white/40">No file (uses default)</span>
              )}
              <label className="flex flex-col items-center gap-1 cursor-pointer">
                {uploadingTier === tier ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 text-white/60" />}
                <input type="file" accept="image/*,.json,.gif" className="hidden" onChange={(e) => handleUpload(tier, e)} />
              </label>
            </div>
          );
        })}
      </div>
    </section>
  );
}