import React from "react";
import { X } from "lucide-react";

export default function ReplacePowerUpModal({ newDef, activeDefs, onReplace, onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center px-6" onClick={onClose}>
      <div
        className="bg-[#0D1B2A] border border-white/10 rounded-2xl p-5 w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-black text-lg">Replace a power-up</h2>
          <button onClick={onClose} className="text-white/50">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-white/60 text-sm mb-4">
          Your loadout is full. Choose which active power-up to replace with <span className="font-bold text-amber-400">{newDef.label}</span>.
        </p>
        <div className="space-y-2">
          {activeDefs.map((def) => (
            <button
              key={def.key}
              onClick={() => onReplace(def.key)}
              className="w-full flex items-center justify-between bg-white/5 hover:bg-white/10 rounded-xl px-4 py-3 text-left active:scale-95 transition-transform"
            >
              <span className="font-bold text-sm">{def.label}</span>
              <span className="text-xs text-amber-400 font-bold">Replace</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}