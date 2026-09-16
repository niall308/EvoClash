import React, { useState } from "react";
import { CATEGORIES } from "@/lib/gameConstants";
import { Plus, ChevronDown } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { UNIQUE_ATTACK_EFFECT_OPTIONS } from "@/lib/uniqueAttackEffects";

const ALL_CATEGORIES = [...CATEGORIES, "Hybrid"];
const ROLE_OPTIONS = [
  { value: "predator", label: "Predator" },
  { value: "prey", label: "Prey" },
  { value: "balanced", label: "Balanced" },
];
const TARGET_OPTIONS = [
  { value: "single", label: "Single" },
  { value: "multi", label: "Multi (all)" },
];

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

export default function CreatureForm({ onAdd }) {
  const [baseName, setBaseName] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [role, setRole] = useState("balanced");
  const [description, setDescription] = useState("");
  const [uaName, setUaName] = useState("");
  const [uaPercent, setUaPercent] = useState("");
  const [uaTarget, setUaTarget] = useState("single");
  const [uaEffect, setUaEffect] = useState("");
  const [uaEffectType, setUaEffectType] = useState("none");
  const isHybrid = category === "Hybrid";

  const submit = (e) => {
    e.preventDefault();
    if (!baseName.trim()) return;
    onAdd({
      baseName: baseName.trim(),
      category,
      role: isHybrid ? "hyper_rare" : role,
      description: description.trim(),
      uniqueAttackName: uaName.trim(),
      uniqueAttackPercent: Math.max(0, Math.min(250, Number(uaPercent) || 0)),
      uniqueAttackTarget: uaTarget,
      uniqueAttackEffect: uaEffect.trim(),
      uniqueAttackEffectType: uaEffectType,
    });
    setBaseName("");
    setDescription("");
    setUaName("");
    setUaPercent("");
    setUaTarget("single");
    setUaEffect("");
    setUaEffectType("none");
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
              max={250}
              value={uaPercent}
              onChange={(e) => setUaPercent(e.target.value)}
              placeholder="Percent"
              className="w-full bg-transparent text-sm outline-none"
            />
            <span className="text-xs text-white/40 ml-1">%</span>
          </div>
          <div className="flex-1">
            <PickerField label="Target" options={TARGET_OPTIONS} value={uaTarget} onSelect={setUaTarget} />
          </div>
        </div>
        <div className="flex mt-2">
          <PickerField label="Effect type" options={UNIQUE_ATTACK_EFFECT_OPTIONS} value={uaEffectType} onSelect={setUaEffectType} />
        </div>
        <input
          value={uaEffect}
          onChange={(e) => setUaEffect(e.target.value)}
          placeholder="Additional effects (optional, e.g. halves target's attack next turn)"
          className="w-full bg-white/10 rounded-md px-3 py-2 text-xs outline-none mt-2"
        />
      </div>

      <button type="submit" className="w-full flex items-center justify-center gap-1 bg-purple-600 rounded-md py-2 text-sm font-semibold">
        <Plus className="w-4 h-4" /> Add Creature
      </button>
    </form>
  );
}