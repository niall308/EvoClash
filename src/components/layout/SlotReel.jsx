import React, { useMemo } from "react";
import { motion } from "framer-motion";

const ITEM_HEIGHT = 64; // px, matches the 16 (w-16 h-16) reel window
const STRIP_LENGTH = 24; // how many digits scroll past before landing

// Renders one slot-machine digit reel. `maxDigit` is the highest digit this
// reel can show (2 for the thousands reel, 9 for the rest). `targetDigit` is
// the digit it must land on; `spinning` triggers the roll animation.
export default function SlotReel({ maxDigit, targetDigit, spinning, spinKey }) {
  const strip = useMemo(() => {
    const digits = Array.from({ length: STRIP_LENGTH - 1 }, () => Math.floor(Math.random() * (maxDigit + 1)));
    digits.push(targetDigit);
    return digits;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinKey, targetDigit, maxDigit]);

  const finalY = -(strip.length - 1) * ITEM_HEIGHT;

  return (
    <div className="w-14 h-16 bg-white/5 rounded-xl overflow-hidden border border-white/10">
      <motion.div
        key={spinKey}
        initial={{ y: 0 }}
        animate={spinning ? { y: finalY } : { y: 0 }}
        transition={spinning ? { duration: 5, ease: [0.15, 0.65, 0.35, 1] } : { duration: 0 }}
      >
        {(spinning ? strip : [targetDigit]).map((digit, i) => (
          <div
            key={i}
            className="flex items-center justify-center text-3xl font-black text-amber-300"
            style={{ height: ITEM_HEIGHT }}
          >
            {digit}
          </div>
        ))}
      </motion.div>
    </div>
  );
}