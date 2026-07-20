import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Trophy, Swords, Gamepad2, History, HelpCircle } from "lucide-react";
import { UPGRADE_REQUIREMENTS } from "@/lib/gameConstants";
import MilestonesSection from "@/components/profile/MilestonesSection";
import CreatureManager from "@/components/profile/CreatureManager";

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="bg-white/5 rounded-xl p-3 flex flex-col items-center gap-1">
      <Icon className="w-5 h-5 text-amber-400" />
      <span className="font-black text-lg">{value}</span>
      <span className="text-[10px] text-white/50">{label}</span>
    </div>
  );
}

export default function Profile() {
  const [user, setUser] = useState(null);
  const [cards, setCards] = useState([]);

  useEffect(() => {
    (async () => {
      const me = await base44.auth.me();
      setUser(me);
      const myCards = await base44.entities.Card.filter({ created_by_id: me.id });
      setCards(myCards);
    })();
  }, []);

  if (!user) return null;

  const inProgress = cards.filter((c) => c.tier < 4);

  return (
    <div className="min-h-screen bg-[#0D1B2A] text-white px-6 py-6">
      <Link to="/" className="inline-flex items-center gap-1 text-white/60 text-sm mb-6">
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>
      <h1 className="text-2xl font-black mb-1">{user.username || user.full_name}</h1>
      <p className="text-white/50 text-xs mb-6">{user.email}</p>

      <div className="grid grid-cols-3 gap-3 mb-8">
        <Stat icon={Trophy} label="Wins" value={user.wins || 0} />
        <Stat icon={Swords} label="Losses" value={user.losses || 0} />
        <Stat icon={Gamepad2} label="Games" value={user.gamesPlayed || 0} />
      </div>

      <Link to="/history" className="flex items-center justify-between bg-white/5 rounded-xl p-4 mb-3">
        <span className="flex items-center gap-2 font-semibold text-sm">
          <History className="w-4 h-4 text-amber-400" /> Battle History
        </span>
        <span className="text-white/40 text-xs">View all →</span>
      </Link>

      <Link to="/how-to-play" className="flex items-center justify-between bg-white/5 rounded-xl p-4 mb-8">
        <span className="flex items-center gap-2 font-semibold text-sm">
          <HelpCircle className="w-4 h-4 text-amber-400" /> How To Play
        </span>
        <span className="text-white/40 text-xs">View →</span>
      </Link>

      <MilestonesSection user={user} onUserUpdate={setUser} />

      {user.role === "admin" && <CreatureManager />}

      <h2 className="text-lg font-bold mb-3">Upgrade Progress</h2>
      <div className="space-y-3">
        {inProgress.map((c) => {
          const req = UPGRADE_REQUIREMENTS[c.tier];
          return (
            <div key={c.id} className="bg-white/5 rounded-xl p-3">
              <p className="font-semibold text-sm">
                {c.name} <span className="text-white/40 text-xs">Tier {c.tier}</span>
              </p>
              <p className="text-[10px] text-white/50 mt-1">
                Bonus wins {c.winsVsBonus}/{req.winsVsBonus} · Wins {c.winsVsNonBonus}/{req.winsVsNonBonus} · Games {c.gamesPlayed}/{req.gamesPlayed}
              </p>
            </div>
          );
        })}
        {inProgress.length === 0 && <p className="text-white/40 text-sm">No cards in progress.</p>}
      </div>
    </div>
  );
}