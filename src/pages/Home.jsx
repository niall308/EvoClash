import React, { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Swords, Layers, Sparkles, User, ShieldCheck, Coins, ArrowLeftRight } from "lucide-react";
import { CARD_BACK_URL } from "@/lib/gameConstants";
import { useAuth } from "@/lib/AuthContext";
import useClaimableMilestones from "@/hooks/useClaimableMilestones";
import useIncomingTradeRequests from "@/hooks/useIncomingTradeRequests";
import DailyMissionsSection from "@/components/home/DailyMissionsSection";

const BUTTONS = [
  { to: "/play", label: "Play", icon: Swords, color: "from-red-600 to-orange-500" },
  { to: "/deck", label: "Deck", icon: Layers, color: "from-blue-600 to-cyan-500" },
  { to: "/generate", label: "AI Generate", icon: Sparkles, color: "from-purple-600 to-fuchsia-500" },
  { to: "/trades", label: "Trades", icon: ArrowLeftRight, color: "from-sky-600 to-cyan-500" },
  { to: "/profile", label: "Profile", icon: User, color: "from-emerald-600 to-teal-500" },
];

export default function Home() {
  const { user, updateUser } = useAuth();
  const hasMarkedSeen = useRef(false);
  const hasClaimableMilestones = useClaimableMilestones(user);
  const { requests: incomingTrades } = useIncomingTradeRequests();

  useEffect(() => {
    if (user && !hasMarkedSeen.current) {
      hasMarkedSeen.current = true;
      base44.auth.updateMe({ lastSeenAt: new Date().toISOString() });
    }
  }, [user]);

  return (
    <div className="flex flex-col items-center justify-center px-6 py-10 text-white">
      <img src={CARD_BACK_URL} alt="Card back" className="w-20 h-28 object-cover rounded-xl border-2 border-amber-400 shadow-lg mb-3" />
      <h1 className="text-4xl font-black tracking-tight mb-1 bg-gradient-to-r from-amber-300 to-orange-500 bg-clip-text text-transparent">EvoClash</h1>
      <p className="text-white/50 text-sm mb-10">{user ? `Welcome back, ${user.username || user.full_name}` : "Loading..."}</p>
      <div className="w-full max-w-sm grid grid-cols-1 gap-4">
        {BUTTONS.map(({ to, label, icon: Icon, color }) => (
          <Link key={to} to={to} className={`relative flex items-center gap-4 bg-gradient-to-r ${color} rounded-2xl p-5 font-bold shadow-lg active:scale-95 transition-transform`}>
            <Icon className="w-6 h-6" /> {label}
            {to === "/profile" && hasClaimableMilestones && (
              <span className="absolute -top-2 -right-2 w-7 h-7 flex items-center justify-center rounded-full bg-amber-400 border-2 border-[#0D1B2A] shadow-lg animate-pulse">
                <Coins className="w-3.5 h-3.5 text-black" />
              </span>
            )}
            {to === "/trades" && incomingTrades.length > 0 && (
              <span className="absolute -top-2 -right-2 min-w-[20px] h-5 px-1 flex items-center justify-center rounded-full bg-red-500 border-2 border-[#0D1B2A] text-white text-[10px] font-bold">
                {incomingTrades.length}
              </span>
            )}
          </Link>
        ))}
        {user?.isAdmin && (
          <Link to="/admin" className="flex items-center gap-4 bg-white/10 border border-white/20 rounded-2xl p-5 font-bold active:scale-95 transition-transform">
            <ShieldCheck className="w-6 h-6" /> Admin Panel
          </Link>
        )}
      </div>
      <DailyMissionsSection user={user} onUserUpdate={updateUser} />
    </div>
  );
}