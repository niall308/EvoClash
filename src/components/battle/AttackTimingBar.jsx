import React, { useEffect, useRef, useState } from "react";
import { Swords } from "lucide-react";

// Segments left→right, mirrored around the center (blue = critical, at the middle).
const SEGMENTS = [
  { start: 0, end: 15, color: "#ef4444", multiplier: 0.8 },
  { start: 15, end: 35, color: "#eab308", multiplier: 1.0 },
  { start: 35, end: 45, color: "#22c55e", multiplier: 1.2 },
  { start: 45, end: 55, color: "#3b82f6", multiplier: 2.0 },
  { start: 55, end: 65, color: "#22c55e", multiplier: 1.2 },
  { start: 65, end: 85, color: "#eab308", multiplier: 1.0 },
  { start: 85, end: 100, color: "#ef4444", multiplier: 0.8 },
];
const DURATION_MS = 1200;

function segmentAt(pct) {
  return SEGMENTS.find((s) => pct >= s.start && pct <= s.end) || SEGMENTS[0];
}

// Eases the slider so it moves fastest through the middle of the bar and slows
// down as it approaches either side.
function ease(t) {
  return (1 - Math.cos(Math.PI * t)) / 2;
}

// Timing minigame that replaces the plain Attack button: a slider bounces left-right
// across a red→yellow→green→blue→green→yellow→red bar, taking 1.2s per full
// left-to-right sweep. Tapping Attack locks the slider and reports the landed
// segment's damage multiplier via onLock.
export default function AttackTimingBar({ onLock }) {
  const [pct, setPct] = useState(0);
  const rafRef = useRef(null);
  const startRef = useRef(null);

  useEffect(() => {
    const tick = (now) => {
      if (startRef.current === null) startRef.current = now;
      const elapsed = (now - startRef.current) % (DURATION_MS * 2);
      const forward = elapsed <= DURATION_MS;
      const t = forward ? elapsed / DURATION_MS : (elapsed - DURATION_MS) / DURATION_MS;
      const p = (forward ? ease(t) : 1 - ease(t)) * 100;
      setPct(p);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const handleAttack = () => {
    cancelAnimationFrame(rafRef.current);
    const seg = segmentAt(pct);
    onLock(seg.multiplier);
  };

  return (
    <div className="flex flex-col items-center gap-3 mt-2 w-64 max-w-full">
      <div className="relative w-full h-5 rounded-full overflow-hidden flex border border-white/30">
        {SEGMENTS.map((s, i) => (
          <div key={i} style={{ width: `${s.end - s.start}%`, background: s.color }} />
        ))}
        <div
          className="absolute top-0 h-full w-1 bg-white shadow-[0_0_6px_2px_rgba(255,255,255,0.9)]"
          style={{ left: `${pct}%`, transform: "translateX(-50%)" }}
        />
      </div>
      <button
        onClick={handleAttack}
        className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-red-600 px-6 py-3 rounded-full font-bold shadow-lg active:scale-95 transition-transform"
      >
        <Swords className="w-5 h-5" /> Attack
      </button>
    </div>
  );
}