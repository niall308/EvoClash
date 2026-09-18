import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, X, ImagePlus, Eye } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import EggCreaturePreview from "@/components/admin/EggCreaturePreview";

// One row in the Egg Creatures admin page. Lets the admin edit the baby +
// upgraded display names and add/remove baby + upgraded card-art images for a
// single creature. Each change saves immediately to the Creature entity.
export default function EggCreatureRow({ creature, onUpdate }) {
  const { toast } = useToast();
  const [babyName, setBabyName] = useState(creature.eggBabyName || "");
  const [upgradedName, setUpgradedName] = useState(creature.eggUpgradedName || "");
  const [babyImages, setBabyImages] = useState(creature.eggBabyImages || []);
  const [upgradedImages, setUpgradedImages] = useState(creature.eggUpgradedImages || []);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(null); // "baby" | "upgraded"
  const [showPreview, setShowPreview] = useState(false);

  const save = async (fields) => {
    setSaving(true);
    try {
      const merged = {
        eggBabyName: fields.eggBabyName !== undefined ? fields.eggBabyName : babyName,
        eggUpgradedName: fields.eggUpgradedName !== undefined ? fields.eggUpgradedName : upgradedName,
        eggBabyImages: fields.eggBabyImages !== undefined ? fields.eggBabyImages : babyImages,
        eggUpgradedImages: fields.eggUpgradedImages !== undefined ? fields.eggUpgradedImages : upgradedImages,
      };
      const updated = await base44.entities.Creature.update(creature.id, merged);
      setBabyName(updated.eggBabyName || "");
      setUpgradedName(updated.eggUpgradedName || "");
      setBabyImages(updated.eggBabyImages || []);
      setUpgradedImages(updated.eggUpgradedImages || []);
      onUpdate?.(updated);
    } catch (e) {
      toast({ title: "Save failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const upload = async (slot, file) => {
    if (!file) return;
    setUploading(slot);
    try {
      const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
      const list = slot === "baby" ? babyImages : upgradedImages;
      const next = [...list, file_url];
      if (slot === "baby") setBabyImages(next);
      else setUpgradedImages(next);
      await save({ [slot === "baby" ? "eggBabyImages" : "eggUpgradedImages"]: next });
    } catch (e) {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploading(null);
    }
  };

  const removeImage = (slot, idx) => {
    const list = slot === "baby" ? babyImages : upgradedImages;
    const next = list.filter((_, i) => i !== idx);
    if (slot === "baby") setBabyImages(next);
    else setUpgradedImages(next);
    save({ [slot === "baby" ? "eggBabyImages" : "eggUpgradedImages"]: next });
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="font-bold text-white text-sm">{creature.baseName}</p>
          <p className="text-[11px] text-white/40">{creature.category}</p>
        </div>
        <div className="flex items-center gap-2">
          {babyImages.length > 0 && (
            <span className="text-[10px] font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full">
              Egg-eligible
            </span>
          )}
          {saving && <Loader2 className="w-4 h-4 animate-spin text-white/50" />}
          <button
            onClick={() => setShowPreview(true)}
            className="flex items-center gap-1 text-[11px] font-bold text-white/80 bg-white/10 hover:bg-white/20 rounded-full px-2.5 py-1 transition-colors"
          >
            <Eye className="w-3.5 h-3.5" /> Preview
          </button>
        </div>
      </div>
      {showPreview && <EggCreaturePreview creature={{ ...creature, eggBabyName: babyName, eggUpgradedName: upgradedName, eggBabyImages: babyImages, eggUpgradedImages: upgradedImages }} onClose={() => setShowPreview(false)} />}

      <div className="grid grid-cols-2 gap-2 mb-3">
        <label className="block">
          <span className="text-[10px] text-white/50">Baby name</span>
          <input
            value={babyName}
            onChange={(e) => setBabyName(e.target.value)}
            onBlur={() => babyName !== (creature.eggBabyName || "") && save({ eggBabyName: babyName })}
            placeholder={creature.baseName}
            className="w-full mt-1 bg-black/30 rounded-lg px-2 py-1.5 text-xs text-white outline-none border border-white/10 focus:border-amber-400"
          />
        </label>
        <label className="block">
          <span className="text-[10px] text-white/50">Upgraded name</span>
          <input
            value={upgradedName}
            onChange={(e) => setUpgradedName(e.target.value)}
            onBlur={() => upgradedName !== (creature.eggUpgradedName || "") && save({ eggUpgradedName: upgradedName })}
            placeholder={`Upgraded ${creature.baseName}`}
            className="w-full mt-1 bg-black/30 rounded-lg px-2 py-1.5 text-xs text-white outline-none border border-white/10 focus:border-amber-400"
          />
        </label>
      </div>

      <ImageSlot label="Baby card image(s) — one is picked at random on hatch" slot="baby" images={babyImages} uploading={uploading} onUpload={upload} onRemove={removeImage} />
      <div className="h-3" />
      <ImageSlot label="Upgraded card image(s) — one is picked at random on upgrade" slot="upgraded" images={upgradedImages} uploading={uploading} onUpload={upload} onRemove={removeImage} />
    </div>
  );
}

function ImageSlot({ label, slot, images, uploading, onUpload, onRemove }) {
  return (
    <div>
      <p className="text-[10px] text-white/50 mb-1.5">{label}</p>
      <div className="flex flex-wrap gap-2">
        {images.map((url, i) => (
          <div key={i} className="relative w-20 h-28 rounded-lg overflow-hidden border border-white/10">
            <img src={url} alt="" className="w-full h-full object-cover" />
            <button
              onClick={() => onRemove(slot, i)}
              className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/70 flex items-center justify-center"
              aria-label="Remove image"
            >
              <X className="w-3 h-3 text-white" />
            </button>
          </div>
        ))}
        <label className="w-20 h-28 rounded-lg border-2 border-dashed border-white/20 flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-amber-400 transition-colors">
          {uploading === slot ? (
            <Loader2 className="w-4 h-4 animate-spin text-white/50" />
          ) : (
            <>
              <ImagePlus className="w-4 h-4 text-white/50" />
              <span className="text-[9px] text-white/40">Add</span>
            </>
          )}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onUpload(slot, e.target.files?.[0])}
          />
        </label>
      </div>
    </div>
  );
}