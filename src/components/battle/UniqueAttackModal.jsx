import React from "react";
import { motion } from "framer-motion";
import { Swords, X } from "lucide-react";

// Popup shown when the player taps the Unique Attack button. It presents the
// attack's name + a composed description and asks the player to confirm or
// cancel. The timing slider is NOT used for unique attacks — confirming here
// fires the attack directly at a 1.0x multiplier (the percent scaling is the
// unique attack's power).
export default function UniqueAttackModal({ uniqueAttack, onUse, onCancel }) {
  if (!uniqueAttack) return null;
  const targetLabel = uniqueAttack.target === "all" ? "all opponent cards" : "the opponent's card";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onCancel}>
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative w-full max-w-sm rounded-2xl p-5 text-white"
        style={{ background: "linear-gradient(160deg, #2A1A45 0%, #1A1030 100%)", boxShadow: "0 0 0 1px rgba(106,13,173,0.6)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onCancel} className="absolute top-2 right-2 text-white/50 hover:text-white p-1" aria-label="Cancel unique attack">
          <X className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: "#6A0DAD" }}>
            <Swords className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-purple-300/70">Unique Attack</p>
            <p className="font-bold text-white text-lg leading-tight">{uniqueAttack.name}</p>
          </div>
        </div>
        <p className="text-sm text-white/80 mb-3">
          Deals <span className="font-bold text-white">{uniqueAttack.percent}%</span> of this card's attack as damage to {targetLabel}.
        </p>
        {uniqueAttack.effect && (
          <p className="text-xs text-purple-200/80 mb-4 italic border-l-2 border-purple-500/50 pl-2">{uniqueAttack.effect}</p>
        )}
        <p className="text-[10px] text-purple-300/70 mb-4">1 use per game — no timing slider for this attack.</p>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 px-4 py-2.5 rounded-xl bg-white/10 text-white font-bold active:scale-95 transition-transform">
            Cancel
          </button>
          <button onClick={onUse} className="flex-1 px-4 py-2.5 rounded-xl font-bold text-white active:scale-95 transition-transform" style={{ background: "linear-gradient(135deg, #6A0DAD 0%, #4B0082 100%)" }}>
            Use Attack
          </button>
        </div>
      </motion.div>
    </div>
  );
}