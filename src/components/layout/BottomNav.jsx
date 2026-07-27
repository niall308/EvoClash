import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Swords, Layers, Sparkles, User, ArrowLeftRight, Coins } from "lucide-react";
import useIncomingBattleRequests from "@/hooks/useIncomingBattleRequests";
import useClaimableMilestones from "@/hooks/useClaimableMilestones";
import { useAuth } from "@/lib/AuthContext";
import { getActiveTabPath, getLastTabPath } from "@/lib/tabNavigation";

const TABS = [
  { path: "/", label: "Play", icon: Swords },
  { path: "/deck", label: "Deck", icon: Layers },
  { path: "/generate", label: "Generate", icon: Sparkles },
  { path: "/trades", label: "Trades", icon: ArrowLeftRight },
  { path: "/profile", label: "Profile", icon: User },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const activeTabPath = getActiveTabPath(location.pathname);
  const { requests } = useIncomingBattleRequests();
  const { user } = useAuth();
  const hasClaimableMilestones = useClaimableMilestones(user);

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
            onClick={() => navigate(active ? tab.path : getLastTabPath(tab.path))}
            className="relative flex-1 flex flex-col items-center gap-1 py-2.5 active:scale-95 transition-transform"
          >
            <div className="relative">
              <Icon className={`w-5 h-5 ${active ? "text-amber-400" : "text-white/40"}`} />
              {tab.path === "/" && requests.length > 0 && (
                <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold">
                  {requests.length}
                </span>
              )}
              {tab.path === "/profile" && hasClaimableMilestones && (
                <span className="absolute -top-1.5 -right-2 w-4 h-4 flex items-center justify-center rounded-full bg-amber-400 border border-[#0D1B2A]">
                  <Coins className="w-2.5 h-2.5 text-black" />
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