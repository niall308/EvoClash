import React, { useState } from "react";
import { Trash2, Pencil, Check, Loader2 } from "lucide-react";
import UniqueAttackEditor from "@/components/profile/UniqueAttackEditor";
import { validateUniqueAttack, normalizeUniqueAttackForm, normalizeEffectType, EFFECT_TYPES } from "@/lib/uniqueAttacks";

const TARGET_LABEL = { single: "Single", all: "All" };

export default function CreatureRow({ creature, onDelete, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [description, setDescription] = useState(creature.description || "");
  const [ua, setUa] = useState({
    uniqueAttackName: creature.uniqueAttackName || "",
    uniqueAttackPercent: creature.uniqueAttackPercent ?? "",
    uniqueAttackTarget: creature.uniqueAttackTarget || "single",
    uniqueAttackEffectType: creature.uniqueAttackEffectType || "none",
    uniqueAttackEffectPercent: creature.uniqueAttackEffectPercent ?? "",
    uniqueAttackEffectDuration: creature.uniqueAttackEffectDuration ?? "",
    uniqueAttackEffect: creature.uniqueAttackEffect || "",
  });
  const { valid, errors } = validateUniqueAttack(ua);

  const save = async () => {
    if (saving || !valid) return;
    setSaving(true);
    try {
      const normalized = normalizeUniqueAttackForm(ua);
      await onUpdate(creature.id, {
        description: description.trim(),
        ...normalized,
      });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const hasUA = creature.uniqueAttackName || (creature.uniqueAttackPercent || 0) > 0 || (creature.uniqueAttackEffectType && creature.uniqueAttackEffectType !== "none");
  const et = normalizeEffectType(creature.uniqueAttackEffectType);

  return (
    <div className="bg-white/5 rounded-lg px-3 py-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">{creature.baseName}</p>
          <p className="text-[10px] text-white/40">{creature.category} · {creature.role}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setEditing((e) => !e)} disabled={saving} className="text-white/50 hover:text-white/80 disabled:opacity-40">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onDelete(creature.id)} disabled={saving} className="text-red-400 hover:text-red-300 disabled:opacity-40">
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
          <UniqueAttackEditor value={ua} onChange={setUa} />
          <button
            onClick={save}
            disabled={saving || !valid}
            className="flex items-center gap-1 bg-purple-600 rounded-md px-2.5 py-1.5 text-xs font-semibold disabled:opacity-40"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            {saving ? "Saving…" : "Save"}
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
                {` · ${TARGET_LABEL[creature.uniqueAttackTarget] || creature.uniqueAttackTarget || "single"}`}
              </p>
              {et !== "none" && <p className="text-white/30">Effect: {EFFECT_TYPES[et]}</p>}
              {creature.uniqueAttackEffect && <p className="text-white/30">{creature.uniqueAttackEffect}</p>}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}