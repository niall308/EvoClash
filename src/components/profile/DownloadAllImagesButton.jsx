import React, { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import JSZip from "jszip";
import { base44 } from "@/api/base44Client";

// Sanitize creature names into safe file-name fragments.
const sanitize = (s) => String(s || "creature").replace(/[^a-zA-Z0-9_-]+/g, "_");

export default function DownloadAllImagesButton({ creatures }) {
  const [building, setBuilding] = useState(false);
  const [progress, setProgress] = useState("");

  const handleDownload = async () => {
    if (building || !creatures.length) return;
    setBuilding(true);
    setProgress("Gathering card art...");
    try {
      // Best card per creature: highest tier, tiebreak by attack. Cards are
      // owner-scoped by RLS, so this reflects the admin's own generated cards.
      const cards = await base44.entities.Card.list("-tier", 500);
      const bestByBase = {};
      for (const c of cards) {
        if (!c.imageUrl) continue;
        const cur = bestByBase[c.baseName];
        const better =
          !cur ||
          (c.tier || 1) > (cur.tier || 1) ||
          ((c.tier || 1) === (cur.tier || 1) && (c.attack || 0) > (cur.attack || 0));
        if (better) bestByBase[c.baseName] = c;
      }

      const zip = new JSZip();
      let done = 0;
      const total = creatures.length;
      for (const cr of creatures) {
        const name = sanitize(cr.baseName);
        const ref = cr.referenceImageUrl;
        const art = bestByBase[cr.baseName]?.imageUrl;
        if (ref) {
          try {
            const blob = await fetch(ref).then((r) => r.blob());
            zip.file(`${name}-reference.png`, blob);
          } catch { /* CORS / network — skip */ }
        }
        if (art) {
          try {
            const blob = await fetch(art).then((r) => r.blob());
            zip.file(`${name}-cardart.png`, blob);
          } catch { /* skip */ }
        }
        done += 1;
        setProgress(`Zipping ${done}/${total}...`);
      }

      setProgress("Compressing zip...");
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "evoclash-creature-images.zip";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setProgress("");
    } catch (e) {
      setProgress("Failed to build zip.");
    } finally {
      setBuilding(false);
    }
  };

  return (
    <button
      onClick={handleDownload}
      disabled={building || !creatures.length}
      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold disabled:opacity-50 active:scale-95 transition"
    >
      {building ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
      {building ? (progress || "Building zip...") : "Download All Images"}
    </button>
  );
}