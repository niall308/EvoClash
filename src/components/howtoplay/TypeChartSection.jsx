import React from "react";
import { TYPE_ADVANTAGES, TYPE_COLORS } from "@/lib/gameConstants";

export default function TypeChartSection() {
  return (
    <div>
      <h2 className="text-lg font-bold mb-3">Card Types &amp; Bonus Damage</h2>
      <p className="text-white/50 text-xs mb-3">Each type deals bonus damage to the types listed next to it.</p>
      <div className="space-y-2">
        {Object.entries(TYPE_ADVANTAGES).map(([type, beats]) => (
          <div key={type} className="bg-white/5 rounded-xl p-3 flex items-center gap-3 text-sm">
            <span className="font-bold px-2 py-1 rounded-full text-white text-xs shrink-0" style={{ background: TYPE_COLORS[type] }}>
              {type}
            </span>
            <span className="text-white/40 text-xs">beats</span>
            <span className="text-white/80 text-xs">{beats.join(", ")}</span>
          </div>
        ))}
      </div>
    </div>
  );
}