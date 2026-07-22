import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import CoinsBadge from "@/components/layout/CoinsBadge";

export default function AppLayout() {
  const location = useLocation();
  return (
    <div className="relative">
      <CoinsBadge />
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={location.pathname}
          initial={{ x: 24, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -24, opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          <Outlet />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}