import React, { useState } from "react";
import { CATEGORIES } from "@/lib/gameConstants";
import { EFFECT_TYPES, EFFECT_TYPE_IDS } from "@/lib/uniqueAttacks";
import { Plus, ChevronDown } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";

const ALL_CATEGORIES = [...CATEGORIES, "Hybrid"];
const ROLE_OPTIONS = [
  { value: "predator", label: "Predator" },
  { value: "prey", label: "Prey" },
  { value: "balanced", label: "Balanced" },
];
const TARGET_OPTIONS = [
  { value: "single", label: "Single Card" },
  { value: "all", label: "All Cards" },
];
const EFFECT_OPTIONS = EFFECT_TYPE_IDS.map((id) => ({ value: id, label: EFFECT_TYPES[id].label }));
const MAX_PERCENT = 200;
const MAX_DURATION = 10;

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

function PickerField({ label, options, value, onSelect, disabled }) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value)?.label || value;

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className="flex-1 flex items-center justify-between bg-white/10 text-white rounded-md px-3 py-2 text-xs disabled:opacity-60"
      >
        {current} <ChevronDown className="w-3.5 h-3.5" />
      </button>
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="bg-[#0D1B2A] border-white/10 text-white">
          <DrawerHeader>
            <DrawerTitle className="text-white">{label}</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] space-y-1 max-h-[60vh] overflow-y-auto">
            {options.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => {
                  onSelect(o.value);
                  setOpen(false);
                }}
                className={`w-full text-left px-4 py-3 rounded-xl text-sm font-semibold ${
                  value === o.value ? "bg-amber-500 text-black" : "bg-white/5 text-white"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}

// Composes a short human-readable preview of the configured attack.
function AttackPreview({ name, percent, target, effectType, effectPercent, effectDuration }) {
  if (!name && !percent && effectType === "none") return null;
  const parts = [];
  if (name) parts.push(name);
  if (percent) parts.push(`${percent}%`);
  if (target) parts.push(target === "all" ? "all cards" : "single card");
  if (effectType && effectType !== "none") {
    let eff = EFFECT_TYPES[effectType].label;
    if (EFFECT_TYPES[effectType].needsPercent && effectPercent) eff += ` (${effectPercent}%)`;
    if (EFFECT_TYPES[effectType].needsDuration && effectDuration) eff += ` (${effectDuration} turn${effectDuration === 1 ? "" : "s"})`;
    parts.push(eff);
  }
  return <p className="text-[10px] text-amber-300/80 mt-1.5">Preview: {parts.join(" · ") || "—"}</p>;
}

export default function CreatureForm({ onAdd }) {
  const [baseName, setBaseName] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [role, setRole] = useState("balanced");
  const [description, setDescription] = useState("");
  const [uaName, setUaName] = useState("");
  const [uaPercent, setUaPercent] = useState("");
  const [uaTarget, setUaTarget] = useState("single");
  const [uaEffectType, setUaEffectType] = useState("none");
  const [uaEffectPercent, setUaEffectPercent] = useState("");
  const [uaEffectDuration, setUaEffectDuration] = useState("");
  const [uaEffect, setUaEffect] = useState("");
  const [error, setError] = useState("");
  const isHybrid = category === "Hybrid";
  const effectMeta = EFFECT_TYPES[uaEffectType];

  const submit = (e) => {
    e.preventDefault();
    if (!baseName.trim()) {
      setError("Creature name is required.");
      return;
    }
    const pct = Number(uaPercent);
    if (uaPercent !== "" && (Number.isNaN(pct) || pct < 0 || pct > MAX_PERCENT)) {
      setError(`Damage percent must be between 0 and ${MAX_PERCENT}.`);
      return;
    }
    const epct = Number(uaEffectPercent);
    if (effectMeta?.needsPercent && uaEffectPercent !== "" && (Number.isNaN(epct) || epct < 0 || epct > MAX_PERCENT)) {
      setError(`Effect percent must be between 0 and ${MAX_PERCENT}.`);
      return;
    }
    const edur = Number(uaEffectDuration);
    if (effectMeta?.needsDuration && uaEffectDuration !== "" && (Number.isNaN(edur) || edur < 0 || edur > MAX_DURATION)) {
      setError(`Effect duration must be between 0 and ${MAX_DURATION} turns.`);
      return;
    }
    setError("");
    onAdd({
      baseName: baseName.trim(),
      category,
      role: isHybrid ? "hyper_rare" : role,
      description: description.trim(),
      uniqueAttackName: uaName.trim(),
      uniqueAttackPercent: clamp(pct || 0, 0, MAX_PERCENT),
      uniqueAttackTarget: uaTarget,
      uniqueAttackEffectType: uaEffectType,
      uniqueAttackEffectPercent: effectMeta?.needsPercent ? clamp(epct || 0, 0, MAX_PERCENT) : 0,
      uniqueAttackEffectDuration: effectMeta?.needsDuration ? clamp(edur || 0, 0, MAX_DURATION) : 0,
      uniqueAttackEffect: uaEffect.trim(),
    });
    setBaseName("");
    setDescription("");
    setUaName("");
    setUaPercent("");
    setUaTarget("single");
    setUaEffectType("none");
    setUaEffectPercent("");
    setUaEffectDuration("");
    setUaEffect("");
  };

  return (
    <form onSubmit={submit} className="bg-white/5 rounded-lg p-3 space-y-2 mb-3">
      <input
        value={baseName}
        onChange={(e) => setBaseName(e.target.value)}
        placeholder="Creature name"
        className="w-full bg-white/10 rounded-md px-3 py-2 text-sm outline-none"
      />
      <div className="flex gap-2">
        <PickerField
          label="Category"
          options={ALL_CATEGORIES.map((c) => ({ value: c, label: c }))}
          value={category}
          onSelect={setCategory}
        />
        {isHybrid ? (
          <PickerField label="Role" options={[{ value: "hyper_rare", label: "Hyper Rare" }]} value="hyper_rare" onSelect={() => {}} disabled />
        ) : (
          <PickerField label="Role" options={ROLE_OPTIONS} value={role} onSelect={setRole} />
        )}
      </div>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder={
          isHybrid
            ? "Design guide for the AI card generator, e.g. 'Top half is a Tyrannosaurus Rex with a unicorn-style horn, bottom half is a unicorn with T-Rex legs and a unicorn tail, all in a robot style'"
            : "Anatomy guide for the AI card generator, e.g. 'a winged bird-woman with a human female torso and face, feathered wings instead of arms, and taloned bird feet — never a snake or reptile body'"
        }
        rows={3}
        className="w-full bg-white/10 rounded-md px-3 py-2 text-xs outline-none resize-none"
      />

      <div className="pt-1 border-t border-white/10">
        <p className="text-[11px] font-bold text-amber-400/80 pt-1.5 pb-0.5">Unique Attack</p>
        <input
          value={uaName}
          onChange={(e) => setUaName(e.target.value)}
          placeholder="Attack name (e.g. Devouring Chomp)"
          className="w-full bg-white/10 rounded-md px-3 py-2 text-sm outline-none"
        />
        <div className="flex gap-2 mt-2 items-center">
          <div className="flex-1 flex items-center bg-white/10 rounded-md px-3 py-2">
            <input
              type="number"
              min={0}
              max={MAX_PERCENT}
              value={uaPercent}
              onChange={(e) => setUaPercent(e.target.value)}
              placeholder="Damage %"
              className="w-full bg-transparent text-sm outline-none"
            />
            <span className="text-xs text-white/40 ml-1">%</span>
          </div>
          <div className="flex-1">
            <PickerField label="Target" options={TARGET_OPTIONS} value={uaTarget} onSelect={setUaTarget} />
          </div>
        </div>
        <div className="flex gap-2 mt-2">
          <div className="flex-1">
            <PickerField label="Special Effect" options={EFFECT_OPTIONS} value={uaEffectType} onSelect={setUaEffectType} />
          </div>
          {effectMeta?.needsPercent && (
            <div className="flex-1 flex items-center bg-white/10 rounded-md px-3 py-2">
              <input
                type="number"
                min={0}
                max={MAX_PERCENT}
                value={uaEffectPercent}
                onChange={(e) => setUaEffectPercent(e.target.value)}
                placeholder="Effect %"
                className="w-full bg-transparent text-xs outline-none"
              />
              <span className="text-[10px] text-white/40 ml-1">%</span>
            </div>
          )}
          {effectMeta?.needsDuration && (
            <div className="flex-1 flex items-center bg-white/10 rounded-md px-3 py-2">
              <input
                type="number"
                min={0}
                max={MAX_DURATION}
                value={uaEffectDuration}
                onChange={(e) => setUaEffectDuration(e.target.value)}
                placeholder="Turns"
                className="w-full bg-transparent text-xs outline-none"
              />
              <span className="text-[10px] text-white/40 ml-1">t</span>
            </div>
          )}
        </div>
        <input
          value={uaEffect}
          onChange={(e) => setUaEffect(e.target.value)}
          placeholder="Effect description (display only — optional)"
          className="w-full bg-white/10 rounded-md px-3 py-2 text-xs outline-none mt-2"
        />
        <AttackPreview
          name={uaName}
          percent={uaPercent}
          target={uaTarget}
          effectType={uaEffectType}
          effectPercent={uaEffectPercent}
          effectDuration={uaEffectDuration}
        />
        {error && <p className="text-[10px] text-red-400 mt-1">{error}</p>}
      </div>

      <button type="submit" className="w-full flex items-center justify-center gap-1 bg-purple-600 rounded-md py-2 text-sm font-semibold">
        <Plus className="w-4 h-4" /> Add Creature
      </button>
    </form>
  );
}