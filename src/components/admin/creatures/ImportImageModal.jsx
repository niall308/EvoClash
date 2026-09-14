import React, { useState } from "react";
import { Upload } from "lucide-react";
import { base44 } from "@/api/base44Client";
import ModalShell from "./ModalShell";
import { TIERS, TIER_GUIDANCE, CREATURE_IMAGES_I18N } from "@/lib/creatureImages";

// Import modal: pick a tier, optionally add a prompt, then upload a file (via
// UploadPublicFile) or paste a URL. Recorded as a pending CreatureImage via the
// uploadCreatureImage backend function (carrying tier + prompt + style metadata).
export default function ImportImageModal({ creature, onClose, onImported }) {
  const [tier, setTier] = useState(1);
  const [prompt, setPrompt] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const record = async (imageUrl) => {
    await base44.functions.invoke("uploadCreatureImage", {
      creatureId: creature.id,
      url: imageUrl,
      tier,
      prompt: prompt.trim(),
    });
  };

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
      await record(file_url);
      onImported();
      onClose();
    } catch (err) {
      setError(err?.message || "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const importUrl = async () => {
    if (!url.trim()) return;
    setBusy(true);
    setError("");
    try {
      await record(url.trim());
      onImported();
      onClose();
    } catch (err) {
      setError(err?.message || "Import failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell title="Import guide image" onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="text-white/60 text-xs mb-1 block">{CREATURE_IMAGES_I18N.tierLabel}</label>
          <div className="flex gap-1 bg-white/10 rounded-md p-1">
            {TIERS.map((t) => (
              <button
                key={t}
                onClick={() => setTier(t)}
                className={`flex-1 py-1.5 rounded text-xs font-bold ${tier === t ? "bg-purple-600 text-white" : "text-white/60"}`}
                aria-pressed={tier === t}
              >
                T{t}
              </button>
            ))}
          </div>
          <p className="text-white/40 text-[10px] mt-1">{TIER_GUIDANCE[tier]}</p>
        </div>
        <div>
          <label className="text-white/60 text-xs mb-1 block">Prompt (optional, for traceability)</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={2}
            placeholder="What was this image intended to depict?"
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
          onClick={importUrl}
          disabled={busy || !url.trim()}
          className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded-lg py-3 text-sm font-semibold text-white"
        >
          {busy ? "Importing…" : "Import URL"}
        </button>
      </div>
    </ModalShell>
  );
}