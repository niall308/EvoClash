import React, { useState } from "react";
import { Upload } from "lucide-react";
import { base44 } from "@/api/base44Client";
import ModalShell from "./ModalShell";
import {
  TIERS,
  TIER_LABELS,
  TIER_GUIDANCE,
  CREATURE_IMAGES_I18N,
} from "@/lib/creatureImages";

// Import modal: upload a file (via UploadPublicFile) or paste a URL, pick the
// target tier, and optionally attach a prompt note. Records a pending
// CreatureImage via the uploadCreatureImage backend function.
export default function ImportImageModal({ creature, onClose, onImported }) {
  const [url, setUrl] = useState("");
  const [tier, setTier] = useState(1);
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (imageUrl) => {
    setBusy(true);
    setError("");
    try {
      await base44.functions.invoke("uploadCreatureImage", {
        creatureId: creature.id,
        url: imageUrl,
        tier,
        prompt: prompt.trim(),
      });
      onImported();
      onClose();
    } catch (err) {
      setError(err?.message || "Import failed");
    } finally {
      setBusy(false);
    }
  };

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
      await submit(file_url);
    } catch (err) {
      setError(err?.message || "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell title="Import image" onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="text-white/60 text-xs mb-1 block">{CREATURE_IMAGES_I18N.tierLabel}</label>
          <div className="flex flex-wrap gap-1.5">
            {TIERS.map((t) => (
              <button
                key={t}
                onClick={() => setTier(t)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold ${
                  tier === t ? "bg-purple-600 text-white" : "bg-white/5 text-white/60"
                }`}
              >
                {TIER_LABELS[t]}
              </button>
            ))}
          </div>
          <p className="text-white/35 text-[10px] mt-1">{TIER_GUIDANCE[tier]}</p>
        </div>
        <div>
          <label className="text-white/60 text-xs mb-1 block">{CREATURE_IMAGES_I18N.promptLabel}</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={2}
            placeholder="Optional note / prompt metadata for this import…"
            className="w-full bg-white/10 rounded-md px-3 py-2 text-sm outline-none resize-none"
          />
        </div>
        <label className="block">
          <span className="text-white/60 text-xs mb-1 block">Upload a file</span>
          <div className="flex items-center justify-center gap-2 border-2 border-dashed border-white/20 rounded-lg py-6 text-white/50 text-sm">
            <Upload className="w-4 h-4" />
            <span className="text-xs">{busy ? "Uploading…" : "Tap to choose an image"}</span>
            <input type="file" accept="image/*" onChange={onFile} disabled={busy} className="hidden" />
          </div>
          <input type="file" accept="image/*" onChange={onFile} disabled={busy} className="mt-2 text-xs text-white/40" />
        </label>
        <div className="text-center text-white/30 text-xs">— or —</div>
        <div>
          <label className="text-white/60 text-xs mb-1 block">Paste image URL</label>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://…"
            className="w-full bg-white/10 rounded-md px-3 py-2 text-sm outline-none"
          />
        </div>
        {error && <p className="text-red-400 text-xs">{error}</p>}
        <button
          onClick={() => url.trim() && submit(url.trim())}
          disabled={busy || !url.trim()}
          className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded-lg py-3 text-sm font-semibold text-white"
        >
          {busy ? "Importing…" : "Import URL"}
        </button>
      </div>
    </ModalShell>
  );
}