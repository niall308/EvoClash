import React, { useCallback, useEffect, useState } from "react";
import { Sparkles, Upload, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import CreatureImageTile from "./CreatureImageTile";
import GenerateImagesModal from "./GenerateImagesModal";
import ImportImageModal from "./ImportImageModal";
import CreatureAuditFeed from "./CreatureAuditFeed";
import { TIERS, TIER_BADGE, CREATURE_IMAGES_I18N } from "@/lib/creatureImages";

// Images tab for a creature: generate/import actions + a gallery grouped by
// tier + activity feed. Approve-as-guide / reject / set-tier-default / use-in-
// card-generator go through their backend functions, then refresh the gallery
// and notify the parent (creature.referenceImageUrl may have changed).
export default function CreatureImagesTab({ creature, onCreatureChanged }) {
  const navigate = useNavigate();
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [modal, setModal] = useState(null);

  const load = useCallback(async () => {
    const list = await base44.entities.CreatureImage.filter({ creatureId: creature.id }, "-created_date");
    setImages(list);
    setLoading(false);
  }, [creature.id]);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = async () => {
    setLoading(true);
    await load();
    if (onCreatureChanged) await onCreatureChanged();
  };

  const handleApprove = useCallback(async (imageId, note) => {
    setBusyId(imageId);
    try {
      await base44.functions.invoke("approveCreatureImage", { imageId, note });
      await refresh();
    } finally {
      setBusyId(null);
    }
  }, [refresh]);

  const handleReject = useCallback(async (imageId, note) => {
    setBusyId(imageId);
    try {
      await base44.functions.invoke("rejectCreatureImage", { imageId, note });
      await refresh();
    } finally {
      setBusyId(null);
    }
  }, [refresh]);

  const handleSetDefault = useCallback(async (imageId) => {
    setBusyId(imageId);
    try {
      await base44.functions.invoke("setDefaultCreatureImage", { imageId });
      await refresh();
    } finally {
      setBusyId(null);
    }
  }, [refresh]);

  const handleSetTierDefault = useCallback(async (image) => {
    setBusyId(image.id);
    try {
      await base44.functions.invoke("setDefaultCreatureImage", { imageId: image.id, tier: image.tier || 1 });
      await refresh();
    } finally {
      setBusyId(null);
    }
  }, [refresh]);

  const handleUseInGenerator = useCallback((image) => {
    navigate(`/generate?creature=${encodeURIComponent(creature.id)}&guide=${encodeURIComponent(image.id)}`);
  }, [navigate, creature.id]);

  const byTier = TIERS.map((t) => ({ tier: t, items: images.filter((i) => (i.tier || 1) === t) }));

  return (
    <div>
      <div className="flex gap-2 mb-3">
        <button
          onClick={() => setModal("generate")}
          className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-500 rounded-lg px-3 py-2 text-xs font-semibold text-white"
          aria-label={CREATURE_IMAGES_I18N.generateAria}
        >
          <Sparkles className="w-3.5 h-3.5" /> {CREATURE_IMAGES_I18N.generateButton}
        </button>
        <button
          onClick={() => setModal("import")}
          className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 rounded-lg px-3 py-2 text-xs font-semibold text-white"
          aria-label={CREATURE_IMAGES_I18N.importAria}
        >
          <Upload className="w-3.5 h-3.5" /> {CREATURE_IMAGES_I18N.importButton}
        </button>
        <button onClick={refresh} className="ml-auto text-white/50 hover:text-white p-2" aria-label="Refresh images">
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {loading ? (
        <div className="text-white/40 text-xs">Loading images…</div>
      ) : images.length === 0 ? (
        <div className="text-white/40 text-xs py-6 text-center">{CREATURE_IMAGES_I18N.noImages}</div>
      ) : (
        <div className="space-y-4">
          {byTier.map(({ tier, items }) =>
            items.length === 0 ? null : (
              <div key={tier}>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${TIER_BADGE[tier]}`}>T{tier}</span>
                  <span className="text-white/40 text-[11px]">{items.length} image{items.length === 1 ? "" : "s"}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {items.map((img) => (
                    <CreatureImageTile
                      key={img.id}
                      image={img}
                      busy={busyId === img.id}
                      onApprove={(note) => handleApprove(img.id, note)}
                      onReject={(note) => handleReject(img.id, note)}
                      onSetDefault={() => handleSetDefault(img.id)}
                      onSetTierDefault={handleSetTierDefault}
                      onUseInGenerator={handleUseInGenerator}
                    />
                  ))}
                </div>
              </div>
            )
          )}
        </div>
      )}

      <CreatureAuditFeed creatureId={creature.id} />

      {modal === "generate" && (
        <GenerateImagesModal creature={creature} onClose={() => setModal(null)} onGenerated={refresh} />
      )}
      {modal === "import" && (
        <ImportImageModal creature={creature} onClose={() => setModal(null)} onImported={refresh} />
      )}
    </div>
  );
}