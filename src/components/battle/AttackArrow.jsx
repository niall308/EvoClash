import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp, ArrowDown } from "lucide-react";

export default function AttackArrow({ direction, color, trigger }) {
  const [visible, setVisible] = useState(false);
  const Icon = direction === "up" ? ArrowUp : ArrowDown;

  useEffect(() => {
    if (!trigger) return;
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 3000);
    return () => clearTimeout(t);
  }, [trigger]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key={trigger}
          initial={{ opacity: 0, y: direction === "up" ? 40 : -40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
        >
          <Icon className="w-14 h-14 drop-shadow-lg" style={{ color }} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}