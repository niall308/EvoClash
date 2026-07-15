import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Swords, Layers, Sparkles, User, ShieldCheck } from "lucide-react";
import { CARD_BACK_URL } from "@/lib/gameConstants";

const BUTTONS = [
  { to: "/play", label: "Play", icon: Swords, color: "from-red-600 to-orange-500" },
  { to: "/deck", label: "Deck", icon: Layers, color: "from-blue-600 to-cyan-500" },
  { to: "/generate", label: "AI Generate", icon: Sparkles, color: "from-purple-600 to-fuchsia-500" },
  { to: "/profile", label: "Profile", icon: User, color: "from-emerald-600 to-teal-500" },
];

export default function Home() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-10 text-white" style={{ background: "linear-gradient(180deg, #0D1B2A 0%, #1A2E45 100%)" }}>
      <img src={CARD_BACK_URL} alt="Card back" className="w-20 h-28 object-cover rounded-xl border-2 border-amber-400 shadow-lg mb-3" />
      <h1 className="text-4xl font-black tracking-tight mb-1 bg-gradient-to-r from-amber-300 to-orange-500 bg-clip-text text-transparent">Primal Legends</h1>
      <p className="text-white/50 text-sm mb-10">{user ? `Welcome back, ${user.username || user.full_name}` : "Loading..."}</p>
      <div className="w-full max-w-sm grid grid-cols-1 gap-4">
        {BUTTONS.map(({ to, label, icon: Icon, color }) => (
          <Link key={to} to={to} className={`flex items-center gap-4 bg-gradient-to-r ${color} rounded-2xl p-5 font-bold shadow-lg active:scale-95 transition-transform`}>
            <Icon className="w-6 h-6" /> {label}
          </Link>
        ))}
        {user?.isAdmin && (
          <Link to="/admin" className="flex items-center gap-4 bg-white/10 border border-white/20 rounded-2xl p-5 font-bold active:scale-95 transition-transform">
            <ShieldCheck className="w-6 h-6" /> Admin Panel
          </Link>
        )}
      </div>
    </div>
  );
}