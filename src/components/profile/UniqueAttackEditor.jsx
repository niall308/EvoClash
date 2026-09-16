import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { EFFECT_TYPES, validateUniqueAttack, normalizeEffectType } from "@/lib/uniqueAttacks";

const TARGET_OPTIONS = [
  { value: "single", label: "Single Card" },
  { value: "all", label: "All Cards" },
];

const EFFECT_ORDER = ["none", "heal_self", "heal_team", "heal_team_on_destroy", "half_attack_target", "custom"];

// Effects that scale by a percentage parameter.
const NEEDS_PERCENT = new Set(["heal_self", "heal_team", "heal_team_on_destroy"]);
// Effects that take a turn duration.
const NEEDS_DURATION = new Set(["half_attack_target"]);

function DrawerSelect({ label, options, value, onSelect }) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value)?.label || value;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex-1 flex items-center justify-between bg-white/10 text-white rounded-md px-3 py-2 text-xs"
      >
        <span className="truncate">{current}</span>
        <ChevronDown className="w-3.5 h-3.5 shrink-0" />
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

function Preview({ value }) {
  const et = normalizeEffectType(value.uniqueAttackEffectType);
  const has = value.uniqueAttackName || Number(value.uniqueAttackPercent) > 0 || et !== "none";
  if (!has) return null;
  const target = value.uniqueAttackTarget === "all" ? "All" : "Single";
  let effectLine = "";
  if (et === "heal_self") effectLine = `Heal self ${value.uniqueAttackEffectPercent || 50}% max HP`;
  else if (et === "heal_team") effectLine = `Heal team ${value.uniqueAttackEffectPercent || 30}% max HP`;
  else if (et === "heal_team_on_destroy") effectLine = `On destroy: heal team ${value.uniqueAttackEffectPercent || 20}% max HP`;
  else if (et === "half_attack_target") effectLine = `Halve target ATK ${value.uniqueAttackEffectDuration || 1} turn(s)`;
  else if (et === "custom" && value.uniqueAttackEffect) effectLine = value.uniqueAttackEffect;
  return (
    <div className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2">
      <p className="text-[11px] font-bold text-amber-300 mb-0.5">Preview</p>
      <p className="text-xs text-white font-semibold">
        {value.uniqueAttackName || "Unnamed Attack"} · {value.uniqueAttackPercent || 0}% · {target}
      </p>
      {effectLine && <p className="text-[10px] text-white/60 mt-0.5">{effectLine}</p>}
    </div>
  );
}

// Shared editor for a creature's Unique Attack fields. Used by both the create
// form and the edit row so validation, effect configuration, and preview stay
// consistent. Controlled: parent owns `value` and updates it via `onChange`.
export default function UniqueAttackEditor({ value, onChange }) {
  const set = (patch) => onChange({ ...value, ...patch });
  const { errors } = validateUniqueAttack(value);
  const et = normalizeEffectType(value.uniqueAttackEffectType);

  return (
    <div className="pt-1 border-t border-white/10">
      <p className="text-[11px] font-bold text-amber-400/80 pt-1.5 pb-0.5">Unique Attack</p>

      <input
        value={value.uniqueAttackName || ""}
        onChange={(e) => set({ uniqueAttackName: e.target.value })}
        placeholder="Attack name (e.g. Devouring Chomp)"
        className="w-full bg-white/10 rounded-md px-3 py-2 text-sm outline-none"
      />

      <div className="flex gap-2 mt-2 items-center">
        <div className="flex-1 flex items-center bg-white/10 rounded-md px-3 py-2">
          <input
            type="number"
            min={0}
            max={200}
            value={value.uniqueAttackPercent ?? ""}
            onChange={(e) => set({ uniqueAttackPercent: e.target.value })}
            placeholder="Damage %"
            className="w-full bg-transparent text-sm outline-none"
          />
          <span className="text-xs text-white/40 ml-1">%</span>
        </div>
        <div className="flex-1">
          <DrawerSelect
            label="Target"
            options={TARGET_OPTIONS}
            value={value.uniqueAttackTarget || "single"}
            onSelect={(v) => set({ uniqueAttackTarget: v })}
          />
        </div>
      </div>
      {errors.percent && <p className="text-[10px] text-red-400 mt-1">{errors.percent}</p>}

      <div className="mt-2">
        <DrawerSelect
          label="Special Effect"
          options={EFFECT_ORDER.map((k) => ({ value: k, label: EFFECT_TYPES[k] }))}
          value={et}
          onSelect={(v) => set({ uniqueAttackEffectType: v })}
        />
      </div>

      {NEEDS_PERCENT.has(et) && (
        <div className="flex items-center bg-white/10 rounded-md px-3 py-2 mt-2">
          <span className="text-[11px] text-white/50 mr-2 shrink-0">Effect %</span>
          <input
            type="number"
            min={0}
            max={200}
            value={value.uniqueAttackEffectPercent ?? ""}
            onChange={(e) => set({ uniqueAttackEffectPercent: e.target.value })}
            placeholder={et === "heal_self" ? 50 : et === "heal_team" ? 30 : 20}
            className="w-full bg-transparent text-sm outline-none"
          />
        </div>
      )}
      {errors.effectPercent && <p className="text-[10px] text-red-400 mt-1">{errors.effectPercent}</p>}

      {NEEDS_DURATION.has(et) && (
        <div className="flex items-center bg-white/10 rounded-md px-3 py-2 mt-2">
          <span className="text-[11px] text-white/50 mr-2 shrink-0">Turns</span>
          <input
            type="number"
            min={0}
            step={1}
            value={value.uniqueAttackEffectDuration ?? ""}
            onChange={(e) => set({ uniqueAttackEffectDuration: e.target.value })}
            placeholder={1}
            className="w-full bg-transparent text-sm outline-none"
          />
        </div>
      )}
      {errors.effectDuration && <p className="text-[10px] text-red-400 mt-1">{errors.effectDuration}</p>}

      <input
        value={value.uniqueAttackEffect || ""}
        onChange={(e) => set({ uniqueAttackEffect: e.target.value })}
        placeholder="Display description (optional)"
        className="w-full bg-white/10 rounded-md px-3 py-2 text-xs outline-none mt-2"
      />

      <Preview value={value} />
    </div>
  );
}