import React, { useEffect } from "react";
import { Outlet, useLocation, useNavigationType } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import CoinsBadge from "@/components/layout/CoinsBadge";
import BottomNav from "@/components/layout/BottomNav";
import { recordTabPath, recordVisit } from "@/lib/tabNavigation";

export default function AppLayout() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const isBack = navigationType === "POP";

  useEffect(() => {
    recordTabPath(location.pathname);
    recordVisit();
  }, [location.pathname]);

  return (
    <div className="relative min-h-screen" style={{ background: "linear-gradient(180deg, #0D1B2A 0%, #1A2E45 100%)" }}>
      <CoinsBadge />
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={location.pathname}
          initial={{ x: isBack ? -100 : 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: isBack ? 100 : -100, opacity: 0 }}
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