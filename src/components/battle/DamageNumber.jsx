import React from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function DamageNumber({ value, blocked, tie, trigger }) {
  return (
    <AnimatePresence>
      {trigger && (
        <motion.div
          key={trigger}
          initial={{ opacity: 0, y: 0, scale: 0.5 }}
          animate={{ opacity: 1, y: -40, scale: 1.3 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          className={`absolute inset-x-0 top-1/3 text-center text-3xl font-black pointer-events-none ${tie ? "text-amber-400" : blocked ? "text-blue-400" : "text-red-500"}`}
        >
          {tie ? "TIE!" : blocked ? "BLOCKED" : `-${value}`}
        </motion.div>
      )}
    </AnimatePresence>
  );
}