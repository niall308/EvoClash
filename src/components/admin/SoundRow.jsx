import React, { useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { loadSoundAssets, playFileUrl } from "@/lib/soundEngine";
import { Play, Trash2, Upload, Loader2 } from "lucide-react";

// One row in the Sound Manager: upload/replace the audio file, preview it, toggle
// loop, and delete. Reloading the in-memory sound assets after any change keeps
// the live app in sync without a page refresh.
export default function SoundRow({ sound, asset, onChanged }) {
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [loop, setLoop] = useState(asset?.isLoop ?? sound.isLoop ?? false);

  const persist = async (fileUrl) => {
    if (asset?.id) {
      await base44.entities.SoundAsset.update(asset.id, { fileUrl, isLoop: loop });
    } else {
      await base44.entities.SoundAsset.create({
        key: sound.key,
        label: sound.label,
        category: sound.category,
        fileUrl,
        isLoop: loop,
      });
    }
    await loadSoundAssets();
    onChanged?.();
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await persist(file_url);
    } catch (err) {
      alert("Upload failed: " + (err?.message || "please try again"));
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleDelete = async () => {
    if (!asset?.id) return;
    setBusy(true);
    try {
      await base44.entities.SoundAsset.delete(asset.id);
      await loadSoundAssets();
      onChanged?.();
    } finally {
      setBusy(false);
    }
  };

  const toggleLoop = async (value) => {
    setLoop(value);
    if (asset?.id) {
      await base44.entities.SoundAsset.update(asset.id, { isLoop: value });
      await loadSoundAssets();
      onChanged?.();
    }
  };

  return (
    <div className="bg-white/5 rounded-xl p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="min-w-0">
          <p className="font-bold text-sm truncate">{sound.label}</p>
          <p className="text-white/40 text-[11px] uppercase tracking-wide">{sound.category}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => asset && playFileUrl(asset.fileUrl, loop)}
            disabled={!asset}
            className="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center active:scale-95 disabled:opacity-30"
          >
            <Play className="w-4 h-4 text-white" />
          </button>
          <button
            onClick={handleDelete}
            disabled={!asset || busy}
            className="w-9 h-9 rounded-full bg-red-600/80 flex items-center justify-center active:scale-95 disabled:opacity-30"
          >
            <Trash2 className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="flex-1 flex items-center justify-center gap-2 bg-white/10 rounded-lg py-2 text-xs font-bold active:scale-95 disabled:opacity-40"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {asset ? "Replace" : "Upload"}
        </button>
        <input ref={fileRef} type="file" accept="audio/*" onChange={handleFile} className="hidden" />
        <label className="flex items-center gap-1 text-xs text-white/60 select-none shrink-0">
          <input type="checkbox" checked={loop} onChange={(e) => toggleLoop(e.target.checked)} className="accent-amber-400" />
          Loop
        </label>
      </div>
    </div>
  );
}