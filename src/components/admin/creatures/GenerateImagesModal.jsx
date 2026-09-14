import React, { useState } from "react";
import { Sparkles, Wand2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import ModalShell from "./ModalShell";
import DrawerPicker from "@/components/common/DrawerPicker";
import {
  IMAGE_STYLE_PRESETS,
  DEFAULT_STYLE_PRESET,
  MAX_GENERATE_COUNT,
  TIERS,
  TIER_GUIDANCE,
  buildGuideImagePrompt,
  CREATURE_IMAGES_I18N,
} from "@/lib/creatureImages";

// Generate modal: tier selector (1–4), detailed prompt textarea (required),
// count (1–5), style preset. Generate is disabled until a prompt is entered.
// Calls the generateCreatureImages backend function (server-side image
// generation; never the client GenerateImage). Shows a live preview of the
// combined prompt the server will build (admin prompt + tier guidance).
export default function GenerateImagesModal({ creature, onClose, onGenerated }) {
  const [tier, setTier] = useState(1);
  const [prompt, setPrompt] = useState("");
  const [count, setCount] = useState(1);
  const [style, setStyle] = useState(DEFAULT_STYLE_PRESET);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  const insertTemplate = () => {
    const t = `A ${creature.baseName} in a ${TIER_GUIDANCE[tier].split(" — ")[0].toLowerCase()} pose, full-body, high detail.`;
    setPrompt(t);
  };

  const generate = async () => {
    if (!prompt.trim()) return;
    setBusy(true);
    setError("");
    try {
      await base44.functions.invoke("generateCreatureImages", {
        creatureId: creature.id,
        tier,
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
  const tierOptions = TIERS.map((t) => ({ value: String(t), label: `Tier ${t}` }));
  const preview = buildGuideImagePrompt(creature, prompt, style, tier);

  return (
    <ModalShell title="Generate upgrade-guide images" onClose={onClose}>
      <div className="space-y-3">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-white/60 text-xs">{CREATURE_IMAGES_I18N.tierLabel}</label>
            <button onClick={insertTemplate} className="flex items-center gap-1 text-[10px] text-purple-300 hover:text-purple-200" aria-label={CREATURE_IMAGES_I18N.templateAria}>
              <Wand2 className="w-3 h-3" /> {CREATURE_IMAGES_I18N.useTemplate}
            </button>
          </div>
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
          <p className="text-white/40 text-[10px] mt-1">{CREATURE_IMAGES_I18N.tierHelp}</p>
          <p className="text-white/40 text-[10px] mt-0.5">{TIER_GUIDANCE[tier]}</p>
        </div>

        <div>
          <label className="text-white/60 text-xs mb-1 block">{CREATURE_IMAGES_I18N.promptLabel}</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            placeholder={CREATURE_IMAGES_I18N.promptPlaceholder}
            aria-label={CREATURE_IMAGES_I18N.promptLabel}
            className="w-full bg-white/10 rounded-md px-3 py-2 text-sm outline-none resize-none"
          />
          <p className="text-white/30 text-[10px] mt-1">{CREATURE_IMAGES_I18N.promptHelp}</p>
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

        <button
          onClick={() => setShowPreview((s) => !s)}
          className="text-white/50 text-[10px] underline"
          type="button"
        >
          {showPreview ? "Hide" : "Preview"} combined prompt
        </button>
        {showPreview && (
          <pre className="text-[10px] text-white/50 bg-black/30 rounded p-2 whitespace-pre-wrap max-h-28 overflow-y-auto">{preview}</pre>
        )}

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
              <Sparkles className="w-4 h-4" /> {CREATURE_IMAGES_I18N.generateForTier.replace("{tier}", tier)}
            </>
          )}
        </button>
      </div>
    </ModalShell>
  );
}