import React from "react";
import { motion } from "framer-motion";

export default function HealthBar({ current, max, label }) {
  const pct = Math.max(0, Math.min(100, (current / max) * 100));
  const color = pct > 60 ? "#22C55E" : pct > 30 ? "#EAB308" : "#EF4444";

  return (
    <div className="w-full">
      <div className="flex justify-between text-[10px] text-white/80 font-semibold mb-0.5">
        <span>{label}</span>
        <span>{Math.max(0, Math.round(current))}/{max}</span>
      </div>
      <div className="h-2.5 w-full bg-black/40 rounded-full overflow-hidden border border-white/10">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}