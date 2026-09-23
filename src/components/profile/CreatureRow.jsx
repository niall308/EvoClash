import React, { useState } from "react";
import { Trash2, Pencil, Check, ChevronDown, Loader2, ImagePlus, X } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";

const TARGET_OPTIONS = [
  { value: "single", label: "Single" },
  { value: "multi", label: "Multi (all)" },
];

function TargetPicker({ value, onSelect }) {
  const [open, setOpen] = useState(false);
  const current = TARGET_OPTIONS.find((o) => o.value === value)?.label || value;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex-1 flex items-center justify-between bg-white/10 text-white rounded-md px-3 py-2 text-xs"
      >
        {current} <ChevronDown className="w-3.5 h-3.5" />
      </button>
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="bg-[#0D1B2A] border-white/10 text-white">
          <DrawerHeader>
            <DrawerTitle className="text-white">Target</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] space-y-1">
            {TARGET_OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => {
                  onSelect(o.value);
                  setOpen(false);
                }}
                className={`w-full text-left px-4 py-3 rounded-xl text-sm font-semibold ${
                  value === o.value ? "bg-amber-500 text-black" : "bg-white/5 text-white"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}

const TIERS = [1, 2, 3, 4];

export default function CreatureRow({ creature, onDelete, onUpdate }) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [description, setDescription] = useState(creature.description || "");
  const [uaName, setUaName] = useState(creature.uniqueAttackName || "");
  const [uaPercent, setUaPercent] = useState(creature.uniqueAttackPercent?.toString() || "");
  const [uaTarget, setUaTarget] = useState(creature.uniqueAttackTarget || "single");
  const [uaEffect, setUaEffect] = useState(creature.uniqueAttackEffect || "");
  const [tierImages, setTierImages] = useState({
    1: creature.tier1Image || "",
    2: creature.tier2Image || "",
    3: creature.tier3Image || "",
    4: creature.tier4Image || "",
  });
  const [uploadingTier, setUploadingTier] = useState(null);
  const [viewImage, setViewImage] = useState(null);

  const uploadTierImage = async (tier, file) => {
    if (!file) return;
    setUploadingTier(tier);
    try {
      const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
      setTierImages((prev) => ({ ...prev, [tier]: file_url }));
    } catch (e) {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploadingTier(null);
    }
  };

  const removeTierImage = (tier) => {
    setTierImages((prev) => ({ ...prev, [tier]: "" }));
  };

  const save = async () => {
    await onUpdate(creature.id, {
      description: description.trim(),
      uniqueAttackName: uaName.trim(),
      uniqueAttackPercent: Math.max(0, Math.min(250, Number(uaPercent) || 0)),
      uniqueAttackTarget: uaTarget,
      uniqueAttackEffect: uaEffect.trim(),
      tier1Image: tierImages[1],
      tier2Image: tierImages[2],
      tier3Image: tierImages[3],
      tier4Image: tierImages[4],
    });
    setEditing(false);
  };

  const hasUA = creature.uniqueAttackName || creature.uniqueAttackPercent || creature.uniqueAttackEffect;

  return (
    <div className="bg-white/5 rounded-lg px-3 py-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">{creature.baseName}</p>
          <p className="text-[10px] text-white/40">{creature.category} · {creature.role}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setEditing((e) => !e)} className="text-white/50 hover:text-white/80">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onDelete(creature.id)} className="text-red-400 hover:text-red-300">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {editing ? (
        <div className="mt-2 space-y-2">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Anatomy guide for the AI card generator, e.g. 'a winged bird-woman with a human female torso and face, feathered wings instead of arms, and taloned bird feet — never a snake or reptile body'"
            rows={3}
            className="w-full bg-white/10 rounded-md px-2.5 py-2 text-xs outline-none resize-none"
          />
          <div className="pt-1 border-t border-white/10">
            <p className="text-[11px] font-bold text-amber-400/80 pt-1.5">Unique Attack</p>
            <input
              value={uaName}
              onChange={(e) => setUaName(e.target.value)}
              placeholder="Attack name"
              className="w-full bg-white/10 rounded-md px-2.5 py-2 text-xs outline-none mt-1"
            />
            <div className="flex gap-2 mt-1.5 items-center">
              <div className="flex-1 flex items-center bg-white/10 rounded-md px-2.5 py-2">
                <input
                  type="number"
                  min={0}
                  max={250}
                  value={uaPercent}
                  onChange={(e) => setUaPercent(e.target.value)}
                  placeholder="Percent"
                  className="w-full bg-transparent text-xs outline-none"
                />
                <span className="text-[10px] text-white/40 ml-1">%</span>
              </div>
              <div className="flex-1">
                <TargetPicker value={uaTarget} onSelect={setUaTarget} />
              </div>
            </div>
            <input
              value={uaEffect}
              onChange={(e) => setUaEffect(e.target.value)}
              placeholder="Additional effects (optional)"
              className="w-full bg-white/10 rounded-md px-2.5 py-2 text-xs outline-none mt-1.5"
            />
          </div>
          <div className="pt-1 border-t border-white/10">
            <p className="text-[11px] font-bold text-amber-400/80 pt-1.5 pb-1">Tier Images</p>
            <div className="grid grid-cols-2 gap-2">
              {TIERS.map((t) => (
                <div key={t} className="rounded-lg border border-white/10 bg-black/20 p-1.5">
                  <p className="text-[10px] text-white/50 mb-1">Tier {t}</p>
                  {tierImages[t] ? (
                    <div className="relative w-full aspect-[3/4] rounded-md overflow-hidden">
                      <img
                        src={tierImages[t]}
                        alt={`Tier ${t}`}
                        onClick={() => setViewImage(tierImages[t])}
                        className="w-full h-full object-cover cursor-pointer"
                      />
                      <button
                        onClick={() => removeTierImage(t)}
                        className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/70 flex items-center justify-center"
                        aria-label={`Remove Tier ${t} image`}
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ) : (
                    <label className="w-full aspect-[3/4] rounded-md border-2 border-dashed border-white/20 flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-amber-400 transition-colors">
                      {uploadingTier === t ? (
                        <Loader2 className="w-4 h-4 animate-spin text-white/50" />
                      ) : (
                        <>
                          <ImagePlus className="w-4 h-4 text-white/50" />
                          <span className="text-[9px] text-white/40">Upload</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => uploadTierImage(t, e.target.files?.[0])}
                      />
                    </label>
                  )}
                </div>
              ))}
            </div>
          </div>
          <button onClick={save} className="flex items-center gap-1 bg-purple-600 rounded-md px-2.5 py-1.5 text-xs font-semibold">
            <Check className="w-3.5 h-3.5" /> Save
          </button>
        </div>
      ) : (
        <>
          {creature.description && <p className="text-[10px] text-white/30 mt-0.5 max-w-xs">{creature.description}</p>}
          {hasUA ? (
            <div className="mt-1 text-[10px] text-white/40 space-y-0.5">
              <p>
                <span className="text-amber-400/80 font-semibold">{creature.uniqueAttackName || "—"}</span>
                {creature.uniqueAttackPercent ? ` · ${creature.uniqueAttackPercent}%` : ""}
                {creature.uniqueAttackTarget ? ` · ${creature.uniqueAttackTarget}` : ""}
              </p>
              {creature.uniqueAttackEffect && <p className="text-white/30">Effect: {creature.uniqueAttackEffect}</p>}
            </div>
          ) : null}
        </>
      )}
      {viewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setViewImage(null)}
        >
          <div className="relative max-w-full max-h-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setViewImage(null)}
              className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-black/80 flex items-center justify-center z-10"
              aria-label="Close"
            >
              <X className="w-4 h-4 text-white" />
            </button>
            <img src={viewImage} alt="Tier image" className="max-w-[90vw] max-h-[80vh] rounded-lg object-contain" />
          </div>
        </div>
      )}
    </div>
  );
}