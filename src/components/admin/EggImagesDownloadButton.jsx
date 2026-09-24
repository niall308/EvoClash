import React, { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import JSZip from "jszip";

// Downloads every egg image (baby + good + evil) for a single creature as a
// zipped folder, grouped by slot. Used in the Egg Creatures admin so the
// admin can grab a creature's full egg art set at once.
const sanitize = (s) => String(s || "creature").replace(/[^a-zA-Z0-9_-]+/g, "_");

const SLOTS = [
  { key: "eggBabyImages", folder: "baby" },
  { key: "eggUpgradedGoodImages", folder: "good" },
  { key: "eggUpgradedEvilImages", folder: "evil" },
];

export default function EggImagesDownloadButton({ creature }) {
  const [building, setBuilding] = useState(false);
  const [progress, setProgress] = useState("");

  const handleDownload = async () => {
    if (building) return;
    const all = SLOTS.flatMap((s) => creature[s.key] || []);
    if (all.length === 0) return;
    setBuilding(true);
    setProgress("Fetching images...");
    try {
      const zip = new JSZip();
      const base = sanitize(creature.baseName);
      let done = 0;
      for (const slot of SLOTS) {
        const imgs = creature[slot.key] || [];
        for (let i = 0; i < imgs.length; i++) {
          try {
            const blob = await fetch(imgs[i]).then((r) => r.blob());
            const ext = (blob.type.split("/")[1] || "png").replace("jpeg", "jpg");
            zip.file(`${base}/${slot.folder}/${i + 1}.${ext}`, blob);
          } catch { /* CORS / network — skip */ }
          done += 1;
          setProgress(`Fetching ${done}/${all.length}...`);
        }
      }
      setProgress("Compressing zip...");
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `evoclash-egg-${base}.zip`;
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

  const total = SLOTS.reduce((n, s) => n + (creature[s.key]?.length || 0), 0);
  const disabled = building || total === 0;

  return (
    <button
      onClick={handleDownload}
      disabled={disabled}
      title={total === 0 ? "No egg images to download" : "Download all egg images"}
      className="flex items-center gap-1 text-[11px] font-bold text-white/80 bg-white/10 hover:bg-white/20 rounded-full px-2.5 py-1 transition-colors disabled:opacity-40"
    >
      {building ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
      {building ? (progress || "Building...") : "Images"}
    </button>
  );
}