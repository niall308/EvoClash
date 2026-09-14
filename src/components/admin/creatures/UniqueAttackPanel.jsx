import React, { useState } from "react";
import { Swords, Save } from "lucide-react";
import { base44 } from "@/api/base44Client";
import DrawerPicker from "@/components/common/DrawerPicker";
import {
  getCreatureUniqueAttack,
  previewUniqueAttackDamage,
  UNIQUE_ATTACK_I18N,
} from "@/lib/uniqueAttacks";
import { CREATURE_IMAGES_I18N } from "@/lib/creatureImages";

const TARGET_OPTIONS = [
  { value: "single", label: "Single target" },
  { value: "all", label: "All targets" },
];

const SAMPLE_BASE_ATTACK = 1000;

// Unique Attack editor for a creature: name, percent (1–1000), target, effects
// (tag picker). Live preview shows the damage for a sample base attack and the
// formula. Save calls the updateCreatureUniqueAttack backend function.
export default function UniqueAttackPanel({ creature, onUpdated }) {
  const existing = getCreatureUniqueAttack(creature) || {};
  const [name, setName] = useState(existing.name || "");
  const [percent, setPercent] = useState(existing.percent || 100);
  const [target, setTarget] = useState(existing.target || "single");
  const [effects, setEffects] = useState(existing.effects || []);
  const [effectInput, setEffectInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const addEffect = () => {
    const v = effectInput.trim();
    if (!v || effects.includes(v)) return;
    setEffects([...effects, v]);
    setEffectInput("");
  };
  const removeEffect = (e) => setEffects(effects.filter((x) => x !== e));

  const save = async () => {
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      const { data } = await base44.functions.invoke("updateCreatureUniqueAttack", {
        creatureId: creature.id,
        name,
        percent: Number(percent),
        target,
        effects,
      });
      if (data?.creature && onUpdated) onUpdated(data.creature);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (err) {
      setError(err?.message || "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const pctNum = Number(percent) || 0;
  const previewDmg = previewUniqueAttackDamage(SAMPLE_BASE_ATTACK, pctNum);
  const pctInvalid = !Number.isFinite(pctNum) || pctNum < 1 || pctNum > 1000;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5 text-purple-200 text-xs font-bold">
        <Swords className="w-3.5 h-3.5" /> Unique Attack
      </div>
      <div>
        <label className="text-white/60 text-xs mb-1 block">Attack Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Devouring Chomp"
          className="w-full bg-white/10 rounded-md px-3 py-2 text-sm outline-none"
        />
      </div>
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-white/60 text-xs mb-1 block">Percent Damage</label>
          <input
            type="number"
            min={1}
            max={1000}
            value={percent}
            onChange={(e) => setPercent(e.target.value)}
            className={`w-full bg-white/10 rounded-md px-3 py-2 text-sm outline-none ${pctInvalid ? "border border-red-500/60" : ""}`}
          />
        </div>
        <div className="flex-1">
          <label className="text-white/60 text-xs mb-1 block">Target</label>
          <div className="bg-white/10 rounded-md px-3 py-2">
            <DrawerPicker label="Target" options={TARGET_OPTIONS} value={target} onSelect={setTarget} />
          </div>
        </div>
      </div>
      <div>
        <label className="text-white/60 text-xs mb-1 block">Effects (tags)</label>
        <div className="flex gap-1.5 mb-1.5">
          <input
            value={effectInput}
            onChange={(e) => setEffectInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addEffect(); } }}
            placeholder="e.g. bleed:2 turns"
            className="flex-1 bg-white/10 rounded-md px-3 py-2 text-sm outline-none"
          />
          <button onClick={addEffect} className="bg-white/10 hover:bg-white/20 text-white rounded-md px-3 text-sm">Add</button>
        </div>
        {effects.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {effects.map((e) => (
              <span key={e} className="flex items-center gap-1 bg-purple-600/30 border border-purple-500/40 text-purple-100 text-xs px-2 py-0.5 rounded-full">
                {e}
                <button onClick={() => removeEffect(e)} className="text-purple-200 hover:text-white" aria-label={`Remove ${e}`}>×</button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg px-3 py-2 text-xs space-y-1">
        <div className="text-white/50">{CREATURE_IMAGES_I18N.uaHelper}</div>
        <div className="text-white font-semibold">
          Preview @ base attack {SAMPLE_BASE_ATTACK}: <span className="text-amber-300">{previewDmg} damage</span>
        </div>
        <div className="text-white/40 text-[11px]">
          {target === "all" ? "Hits every opponent card." : "Hits one opponent card."}
        </div>
      </div>

      {error && <p className="text-red-400 text-xs">{error}</p>}
      <div className="flex gap-2 items-center">
        <button
          onClick={save}
          disabled={busy || !name.trim() || pctInvalid}
          className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-lg px-4 py-2 text-sm font-semibold text-white"
        >
          <Save className="w-3.5 h-3.5" /> {CREATURE_IMAGES_I18N.uaSave}
        </button>
        {saved && <span className="text-emerald-300 text-xs">Saved</span>}
      </div>
    </div>
  );
}