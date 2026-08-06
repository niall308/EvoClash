import React, { Suspense, useEffect } from "react";
import { Outlet, useLocation, useNavigationType } from "react-router-dom";
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
      <div
        key={location.pathname}
        className={isBack ? "page-enter page-enter-back" : "page-enter"}
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 3rem)", paddingBottom: "calc(env(safe-area-inset-bottom) + 4rem)" }}
      >
        <Suspense fallback={
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="w-8 h-8 border-4 border-white/20 border-t-amber-400 rounded-full animate-spin"></div>
          </div>
        }>
          <Outlet />
        </Suspense>
      </div>
      <BottomNav />
    </div>
  );
}