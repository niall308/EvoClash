import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { CREATURES, CATEGORIES } from "@/lib/gameConstants";
import { Upload, Loader2 } from "lucide-react";
import DrawerPicker from "@/components/common/DrawerPicker";

const ALL_CREATURES = CATEGORIES.flatMap((cat) => CREATURES[cat].map((name) => ({ name, category: cat })));
const TIERS = [1, 2, 3, 4];

export default function CreatureAnimationManager() {
  const [templates, setTemplates] = useState([]);
  const [selected, setSelected] = useState(ALL_CREATURES[0].name);
  const [uploadingTier, setUploadingTier] = useState(null);

  const load = async () => setTemplates(await base44.entities.CardTemplate.list());
  useEffect(() => {
    load();
  }, []);

  const getTemplate = (baseName) => templates.find((t) => t.baseName === baseName);

  const handleUpload = async (tier, e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingTier(tier);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const creature = ALL_CREATURES.find((c) => c.name === selected);
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

  const current = getTemplate(selected);

  return (
    <section>
      <h2 className="text-lg font-bold mb-3">Creature Animations</h2>
      <DrawerPicker
        label="Select Creature"
        value={selected}
        onSelect={setSelected}
        options={ALL_CREATURES.map((c) => ({ value: c.name, label: c.name }))}
        triggerClassName="bg-white/10 rounded-lg px-3 py-2 text-sm mb-4 w-full justify-between"
      />
      <div className="grid grid-cols-2 gap-3">
        {TIERS.map((tier) => {
          const field = `tier${tier}Animation`;
          const url = current?.[field];
          return (
            <label key={tier} className="bg-white/5 border border-white/10 rounded-xl p-3 flex flex-col items-center gap-2 cursor-pointer">
              <span className="text-xs font-bold">Tier {tier}</span>
              {url ? <span className="text-[10px] text-emerald-400 truncate w-full text-center">Uploaded ✓</span> : <span className="text-[10px] text-white/40">No file</span>}
              {uploadingTier === tier ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 text-white/60" />}
              <input type="file" accept="image/*,.json,.gif" className="hidden" onChange={(e) => handleUpload(tier, e)} />
            </label>
          );
        })}
      </div>
    </section>
  );
}