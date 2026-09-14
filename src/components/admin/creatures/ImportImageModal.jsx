import React, { useState } from "react";
import { Upload } from "lucide-react";
import { base44 } from "@/api/base44Client";
import ModalShell from "./ModalShell";

// Import modal: upload a file (via UploadPublicFile) or paste a URL, then record
// it as a pending CreatureImage via the uploadCreatureImage backend function.
export default function ImportImageModal({ creature, onClose, onImported }) {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
      await base44.functions.invoke("uploadCreatureImage", { creatureId: creature.id, url: file_url });
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
      await base44.functions.invoke("uploadCreatureImage", { creatureId: creature.id, url: url.trim() });
      onImported();
      onClose();
    } catch (err) {
      setError(err?.message || "Import failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell title="Import image" onClose={onClose}>
      <div className="space-y-3">
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