import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Swords, Layers, Sparkles, User } from "lucide-react";

const TABS = [
  { path: "/", label: "Play", icon: Swords },
  { path: "/deck", label: "Deck", icon: Layers },
  { path: "/generate", label: "Generate", icon: Sparkles },
  { path: "/profile", label: "Profile", icon: User },
];

export default function BottomNav() {
  const location = useLocation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex bg-[#0D1B2A]/95 backdrop-blur-lg border-t border-amber-400/20"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {TABS.map((tab) => {
        const active = location.pathname === tab.path;
        const Icon = tab.icon;
        return (
          <Link key={tab.path} to={tab.path} className="flex-1 flex flex-col items-center gap-1 py-2.5 active:scale-95 transition-transform">
            <Icon className={`w-5 h-5 ${active ? "text-amber-400" : "text-white/40"}`} />
            <span className={`text-[10px] font-bold ${active ? "text-amber-400" : "text-white/40"}`}>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}