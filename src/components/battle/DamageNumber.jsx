import React from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function DamageNumber({ value, blocked, trigger }) {
  return (
    <AnimatePresence>
      {trigger && (
        <motion.div
          key={trigger}
          initial={{ opacity: 0, y: 0, scale: 0.5 }}
          animate={{ opacity: 1, y: -40, scale: 1.3 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          className={`absolute inset-x-0 top-1/3 text-center text-3xl font-black pointer-events-none ${blocked ? "text-blue-400" : "text-red-500"}`}
        >
          {blocked ? "BLOCKED" : `-${value}`}
        </motion.div>
      )}
    </AnimatePresence>
  );
}