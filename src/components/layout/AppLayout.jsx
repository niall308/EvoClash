import React, { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import CoinsBadge from "@/components/layout/CoinsBadge";
import BottomNav from "@/components/layout/BottomNav";
import { recordTabPath, recordVisit } from "@/lib/tabNavigation";

export default function AppLayout() {
  const location = useLocation();

  useEffect(() => {
    recordTabPath(location.pathname);
    recordVisit();
  }, [location.pathname]);

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
          style={{ paddingTop: "calc(env(safe-area-inset-top) + 3rem)", paddingBottom: "calc(env(safe-area-inset-bottom) + 4rem)" }}
        >
          <Outlet />
        </motion.div>
      </AnimatePresence>
      <BottomNav />
    </div>
  );
}