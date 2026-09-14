import React, { useCallback, useEffect, useState } from "react";
import { Sparkles, Upload, RefreshCw } from "lucide-react";
import { base44 } from "@/api/base44Client";
import CreatureImageTile from "./CreatureImageTile";
import GenerateImagesModal from "./GenerateImagesModal";
import ImportImageModal from "./ImportImageModal";
import CreatureAuditFeed from "./CreatureAuditFeed";
import { CREATURE_IMAGES_I18N } from "@/lib/creatureImages";

// Images tab for a creature: generate/import actions + thumbnail gallery +
// activity feed. Approve/reject/set-default go through their backend functions,
// then refresh the gallery and notify the parent (creature.referenceImageUrl may
// have changed).
export default function CreatureImagesTab({ creature, onCreatureChanged }) {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [modal, setModal] = useState(null); // 'generate' | 'import' | null

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
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {images.map((img) => (
            <CreatureImageTile
              key={img.id}
              image={img}
              busy={busyId === img.id}
              onApprove={(note) => handleApprove(img.id, note)}
              onReject={(note) => handleReject(img.id, note)}
              onSetDefault={() => handleSetDefault(img.id)}
            />
          ))}
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