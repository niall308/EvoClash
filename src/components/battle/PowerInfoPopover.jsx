import React from "react";
import { motion } from "framer-motion";
import { X, Lock, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { formatCooldownCompact } from "@/lib/powerUps";

const STATE_META = {
  ready: { icon: CheckCircle2, color: "#34D399", label: "Ready" },
  cooldown: { icon: Clock, color: "#F59E0B", label: "On cooldown" },
  exhausted: { icon: Clock, color: "#F59E0B", label: "Uses exhausted" },
  unowned: { icon: Lock, color: "#94A3B8", label: "Not owned" },
  notTurn: { icon: AlertCircle, color: "#94A3B8", label: "Wait your turn" },
  usedThisTurn: { icon: AlertCircle, color: "#94A3B8", label: "Used this turn" },
  needsCard: { icon: AlertCircle, color: "#94A3B8", label: "Needs your card" },
  needsOpponent: { icon: AlertCircle, color: "#94A3B8", label: "Needs opponent" },
  locked: { icon: AlertCircle, color: "#94A3B8", label: "Not usable now" },
  noMode: { icon: Lock, color: "#94A3B8", label: "Not in this mode" },
};

// Compact, mobile-friendly popover that explains a power-up: its description,
// its reset cadence, and a live countdown + plain-English reason for why it
// can't be used right now. Tapping the backdrop or the close button dismisses it.
export default function PowerInfoPopover({ powerDef, status, onClose }) {
  if (!powerDef) return null;
  const meta = STATE_META[status.state] || STATE_META.locked;
  const Icon = meta.icon;
  const showCountdown = status.countdownMs != null && status.countdownMs > 0 && isFinite(status.countdownMs);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        className="relative w-full max-w-xs rounded-2xl p-4 text-white"
        style={{ background: "linear-gradient(160deg, #1A2E45 0%, #0D1B2A 100%)", boxShadow: "0 0 0 1px rgba(255,255,255,0.12)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-2 right-2 text-white/50 hover:text-white p-1" aria-label="Close power info">
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 mb-3 pr-6">
          <span className="text-xs uppercase tracking-widest text-white/50">{powerDef.category}</span>
        </div>
        <p className="font-bold text-white text-lg leading-tight mb-1">{powerDef.label}</p>
        <p className="text-sm text-white/80 mb-3">{powerDef.description}</p>

        <div className="flex items-center gap-2 mb-2 px-2.5 py-2 rounded-xl" style={{ background: "rgba(255,255,255,0.06)" }}>
          <Icon className="w-4 h-4 shrink-0" style={{ color: meta.color }} />
          <div className="flex-1">
            <p className="text-[10px] uppercase tracking-widest text-white/50 leading-none">{meta.label}</p>
            <p className="text-sm font-semibold text-white leading-tight mt-0.5">
              {status.state === "ready" ? "Tap the button to use it." : status.text}
            </p>
          </div>
          {showCountdown && (
            <span className="text-xs font-bold text-amber-300 tabular-nums">{formatCooldownCompact(status.countdownMs)}</span>
          )}
        </div>

        <p className="text-[11px] text-white/50">{powerDef.replenishTime}</p>
      </motion.div>
    </div>
  );
}