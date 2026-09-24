import React, { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import JSZip from "jszip";

// Downloads every egg image (baby + good + evil) for ALL given creatures into a
// single zip, each creature in its own subfolder grouped by slot. Used at the
// top of the Egg Creatures admin page.
const sanitize = (s) => String(s || "creature").replace(/[^a-zA-Z0-9_-]+/g, "_");

const SLOTS = [
  { key: "eggBabyImages", folder: "baby" },
  { key: "eggUpgradedGoodImages", folder: "good" },
  { key: "eggUpgradedEvilImages", folder: "evil" },
];

export default function DownloadAllEggImagesButton({ creatures }) {
  const [building, setBuilding] = useState(false);
  const [progress, setProgress] = useState("");

  const total = creatures.reduce(
    (n, c) => n + SLOTS.reduce((m, s) => m + (c[s.key]?.length || 0), 0),
    0
  );

  const handleDownload = async () => {
    if (building || total === 0) return;
    setBuilding(true);
    setProgress("Fetching images...");
    try {
      const zip = new JSZip();
      let done = 0;
      for (const cr of creatures) {
        const base = sanitize(cr.baseName);
        for (const slot of SLOTS) {
          const imgs = cr[slot.key] || [];
          for (let i = 0; i < imgs.length; i++) {
            try {
              const blob = await fetch(imgs[i]).then((r) => r.blob());
              const ext = (blob.type.split("/")[1] || "png").replace("jpeg", "jpg");
              zip.file(`${base}/${slot.folder}/${i + 1}.${ext}`, blob);
            } catch { /* CORS / network — skip */ }
            done += 1;
            setProgress(`Fetching ${done}/${total}...`);
          }
        }
      }
      setProgress("Compressing zip...");
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "evoclash-all-egg-images.zip";
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

  const disabled = building || total === 0;

  return (
    <button
      onClick={handleDownload}
      disabled={disabled}
      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold disabled:opacity-50 active:scale-[0.99] transition"
    >
      {building ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
      {building ? (progress || "Building...") : `Download All Images${total ? ` (${total})` : ""}`}
    </button>
  );
}