import React, { useState } from "react";
import { Trash2, Pencil, Check, ChevronDown } from "lucide-react";
import { EFFECT_TYPES, EFFECT_TYPE_IDS } from "@/lib/uniqueAttacks";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";

const TARGET_OPTIONS = [
  { value: "single", label: "Single Card" },
  { value: "all", label: "All Cards" },
];
const EFFECT_OPTIONS = EFFECT_TYPE_IDS.map((id) => ({ value: id, label: EFFECT_TYPES[id].label }));
const MAX_PERCENT = 200;
const MAX_DURATION = 10;
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

function Picker({ label, options, value, onSelect }) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value)?.label || value;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex-1 flex items-center justify-between bg-white/10 text-white rounded-md px-3 py-2 text-xs"
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

export default function CreatureRow({ creature, onDelete, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [description, setDescription] = useState(creature.description || "");
  const [uaName, setUaName] = useState(creature.uniqueAttackName || "");
  const [uaPercent, setUaPercent] = useState(creature.uniqueAttackPercent?.toString() || "");
  const [uaTarget, setUaTarget] = useState(creature.uniqueAttackTarget || "single");
  const [uaEffectType, setUaEffectType] = useState(creature.uniqueAttackEffectType || "none");
  const [uaEffectPercent, setUaEffectPercent] = useState(creature.uniqueAttackEffectPercent?.toString() || "");
  const [uaEffectDuration, setUaEffectDuration] = useState(creature.uniqueAttackEffectDuration?.toString() || "");
  const [uaEffect, setUaEffect] = useState(creature.uniqueAttackEffect || "");
  const effectMeta = EFFECT_TYPES[uaEffectType];

  const save = async () => {
    await onUpdate(creature.id, {
      description: description.trim(),
      uniqueAttackName: uaName.trim(),
      uniqueAttackPercent: clamp(Number(uaPercent) || 0, 0, MAX_PERCENT),
      uniqueAttackTarget: uaTarget,
      uniqueAttackEffectType: uaEffectType,
      uniqueAttackEffectPercent: effectMeta?.needsPercent ? clamp(Number(uaEffectPercent) || 0, 0, MAX_PERCENT) : 0,
      uniqueAttackEffectDuration: effectMeta?.needsDuration ? clamp(Number(uaEffectDuration) || 0, 0, MAX_DURATION) : 0,
      uniqueAttackEffect: uaEffect.trim(),
    });
    setEditing(false);
  };

  const hasUA = creature.uniqueAttackName || creature.uniqueAttackPercent || creature.uniqueAttackEffectType;

  return (
    <div className="bg-white/5 rounded-lg px-3 py-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">{creature.baseName}</p>
          <p className="text-[10px] text-white/40">{creature.category} · {creature.role}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setEditing((e) => !e)} className="text-white/50 hover:text-white/80">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onDelete(creature.id)} className="text-red-400 hover:text-red-300">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {editing ? (
        <div className="mt-2 space-y-2">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Anatomy guide for the AI card generator"
            rows={3}
            className="w-full bg-white/10 rounded-md px-2.5 py-2 text-xs outline-none resize-none"
          />
          <div className="pt-1 border-t border-white/10">
            <p className="text-[11px] font-bold text-amber-400/80 pt-1.5">Unique Attack</p>
            <input
              value={uaName}
              onChange={(e) => setUaName(e.target.value)}
              placeholder="Attack name"
              className="w-full bg-white/10 rounded-md px-2.5 py-2 text-xs outline-none mt-1"
            />
            <div className="flex gap-2 mt-1.5 items-center">
              <div className="flex-1 flex items-center bg-white/10 rounded-md px-2.5 py-2">
                <input
                  type="number"
                  min={0}
                  max={MAX_PERCENT}
                  value={uaPercent}
                  onChange={(e) => setUaPercent(e.target.value)}
                  placeholder="Damage %"
                  className="w-full bg-transparent text-xs outline-none"
                />
                <span className="text-[10px] text-white/40 ml-1">%</span>
              </div>
              <div className="flex-1">
                <Picker label="Target" options={TARGET_OPTIONS} value={uaTarget} onSelect={setUaTarget} />
              </div>
            </div>
            <div className="flex gap-2 mt-1.5">
              <div className="flex-1">
                <Picker label="Special Effect" options={EFFECT_OPTIONS} value={uaEffectType} onSelect={setUaEffectType} />
              </div>
              {effectMeta?.needsPercent && (
                <div className="flex-1 flex items-center bg-white/10 rounded-md px-2.5 py-2">
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
                <div className="flex-1 flex items-center bg-white/10 rounded-md px-2.5 py-2">
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
              className="w-full bg-white/10 rounded-md px-2.5 py-2 text-xs outline-none mt-1.5"
            />
          </div>
          <button onClick={save} className="flex items-center gap-1 bg-purple-600 rounded-md px-2.5 py-1.5 text-xs font-semibold">
            <Check className="w-3.5 h-3.5" /> Save
          </button>
        </div>
      ) : (
        <>
          {creature.description && <p className="text-[10px] text-white/30 mt-0.5 max-w-xs">{creature.description}</p>}
          {hasUA ? (
            <div className="mt-1 text-[10px] text-white/40 space-y-0.5">
              <p>
                <span className="text-amber-400/80 font-semibold">{creature.uniqueAttackName || "—"}</span>
                {creature.uniqueAttackPercent ? ` · ${creature.uniqueAttackPercent}%` : ""}
                {creature.uniqueAttackTarget ? ` · ${creature.uniqueAttackTarget}` : ""}
              </p>
              {creature.uniqueAttackEffectType && creature.uniqueAttackEffectType !== "none" && (
                <p className="text-white/30">
                  Effect: {EFFECT_TYPES[creature.uniqueAttackEffectType]?.label || creature.uniqueAttackEffectType}
                  {creature.uniqueAttackEffectPercent ? ` (${creature.uniqueAttackEffectPercent}%)` : ""}
                  {creature.uniqueAttackEffectDuration ? ` · ${creature.uniqueAttackEffectDuration} turn(s)` : ""}
                </p>
              )}
              {creature.uniqueAttackEffect && <p className="text-white/30">{creature.uniqueAttackEffect}</p>}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}