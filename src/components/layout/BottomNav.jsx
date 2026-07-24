import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Swords, Layers, Sparkles, User, ArrowLeftRight } from "lucide-react";
import useIncomingBattleRequests from "@/hooks/useIncomingBattleRequests";

const TABS = [
  { path: "/", label: "Play", icon: Swords },
  { path: "/deck", label: "Deck", icon: Layers },
  { path: "/generate", label: "Generate", icon: Sparkles },
  { path: "/trades", label: "Trades", icon: ArrowLeftRight },
  { path: "/profile", label: "Profile", icon: User },
];

const SUB_ROUTE_MAP = {
  "/lobby": "/",
  "/create-lobby": "/",
  "/join-lobby": "/",
  "/leaderboards": "/",
  "/power-ups": "/",
  "/card-upgrade": "/deck",
  "/history": "/profile",
  "/how-to-play": "/profile",
  "/milestones": "/profile",
};

function getActiveTabPath(pathname) {
  if (pathname === "/") return "/";
  for (const prefix of Object.keys(SUB_ROUTE_MAP)) {
    if (pathname.startsWith(prefix)) return SUB_ROUTE_MAP[prefix];
  }
  return pathname;
}

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const activeTabPath = getActiveTabPath(location.pathname);
  const { requests } = useIncomingBattleRequests();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex bg-[#0D1B2A]/95 backdrop-blur-lg border-t border-amber-400/20"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {TABS.map((tab) => {
        const active = activeTabPath === tab.path;
        const Icon = tab.icon;
        return (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            className="relative flex-1 flex flex-col items-center gap-1 py-2.5 active:scale-95 transition-transform"
          >
            <div className="relative">
              <Icon className={`w-5 h-5 ${active ? "text-amber-400" : "text-white/40"}`} />
              {tab.path === "/" && requests.length > 0 && (
                <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold">
                  {requests.length}
                </span>
              )}
            </div>
            <span className={`text-[10px] font-bold ${active ? "text-amber-400" : "text-white/40"}`}>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}