import React, { useState } from "react";
import { Sparkles } from "lucide-react";
import { base44 } from "@/api/base44Client";
import ModalShell from "./ModalShell";
import DrawerPicker from "@/components/common/DrawerPicker";
import { IMAGE_STYLE_PRESETS, DEFAULT_STYLE_PRESET, MAX_GENERATE_COUNT, CREATURE_IMAGES_I18N } from "@/lib/creatureImages";

// Generate modal: prompt textarea, count (1–5), style preset. Generate is
// disabled until a prompt is entered. Calls the generateCreatureImages backend
// function (server-side image generation; never the client GenerateImage).
export default function GenerateImagesModal({ creature, onClose, onGenerated }) {
  const [prompt, setPrompt] = useState(
    `A ${creature.baseName}, fierce and cinematic, full-body creature illustration`
  );
  const [count, setCount] = useState(1);
  const [style, setStyle] = useState(DEFAULT_STYLE_PRESET);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const generate = async () => {
    if (!prompt.trim()) return;
    setBusy(true);
    setError("");
    try {
      await base44.functions.invoke("generateCreatureImages", {
        creatureId: creature.id,
        prompt: prompt.trim(),
        count,
        style,
      });
      onGenerated();
      onClose();
    } catch (err) {
      setError(err?.message || "Generation failed");
    } finally {
      setBusy(false);
    }
  };

  const countOptions = Array.from({ length: MAX_GENERATE_COUNT }, (_, i) => ({ value: String(i + 1), label: `${i + 1} image${i ? "s" : ""}` }));
  const styleOptions = IMAGE_STYLE_PRESETS.map((p) => ({ value: p.id, label: p.label }));

  return (
    <ModalShell title="Generate creature images" onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="text-white/60 text-xs mb-1 block">Prompt</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            placeholder="Describe the creature image you want…"
            className="w-full bg-white/10 rounded-md px-3 py-2 text-sm outline-none resize-none"
          />
        </div>
        <div className="flex gap-2 items-center">
          <div className="flex-1 bg-white/10 rounded-md px-3 py-2">
            <div className="text-white/40 text-[10px] mb-0.5">Count</div>
            <DrawerPicker label="Count" options={countOptions} value={String(count)} onSelect={(v) => setCount(Number(v))} />
          </div>
          <div className="flex-1 bg-white/10 rounded-md px-3 py-2">
            <div className="text-white/40 text-[10px] mb-0.5">Style</div>
            <DrawerPicker label="Style" options={styleOptions} value={style} onSelect={setStyle} />
          </div>
        </div>
        {error && <p className="text-red-400 text-xs">{error}</p>}
        <button
          onClick={generate}
          disabled={busy || !prompt.trim()}
          aria-label={CREATURE_IMAGES_I18N.generateAria}
          className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded-lg py-3 text-sm font-semibold text-white"
        >
          {busy ? (
            <>
              <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Generating…
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" /> {CREATURE_IMAGES_I18N.generateButton}
            </>
          )}
        </button>
      </div>
    </ModalShell>
  );
}