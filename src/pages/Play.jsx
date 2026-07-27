import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Bot, Users, ArrowLeft, Trophy, Sparkles } from "lucide-react";
import { getRankByRP } from "@/lib/rankSystem";
import RankEmblem from "@/components/rank/RankEmblem";
import { ensureActiveDeck } from "@/lib/decks";
import { useAuth } from "@/lib/AuthContext";

const DIFFICULTIES = ["Easy", "Normal", "Hard", "Extreme"];

export default function Play() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [count, setCount] = useState(null);
  const [difficulty, setDifficulty] = useState("Normal");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { active } = await ensureActiveDeck(user.id);
      const cards = await base44.entities.Card.filter({ ownerId: user.id, deckId: active.id });
      setCount(cards.length);
    })();
  }, [user?.id]);

  const ready = count !== null && count >= 15;

  return (
    <div className="min-h-screen bg-[#0D1B2A] text-white px-6 py-8">
      <Link to="/" className="inline-flex items-center gap-1 text-white/60 text-sm mb-4 min-h-[44px] px-1">
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>
      {user && (
        <div className="flex items-center gap-2 mb-4">
          <RankEmblem rp={user.rankPoints} size="sm" />
          <span className="font-bold text-sm">{user.username || user.full_name}</span>
          <span className="text-xs font-bold" style={{ color: getRankByRP(user.rankPoints).color }}>
            {getRankByRP(user.rankPoints).name}
          </span>
        </div>
      )}
      <h1 className="text-3xl font-black mb-2">Choose Battle</h1>
      <p className="text-white/60 mb-4 text-sm">{count === null ? "Loading deck..." : `${count}/15 cards required to play (active deck)`}</p>

      <p className="text-white/50 text-xs mb-2 font-semibold">AI Difficulty</p>
      <div className="grid grid-cols-4 gap-2 mb-6">
        {DIFFICULTIES.map((d) => (
          <button
            key={d}
            onClick={() => setDifficulty(d)}
            className={`py-2 rounded-xl text-xs font-bold transition-colors ${
              difficulty === d ? "bg-gradient-to-r from-red-600 to-orange-500" : "bg-white/10 text-white/60"
            }`}
          >
            {d}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        <button
          onClick={() => ready && navigate("/battle", { state: { difficulty } })}
          disabled={!ready}
          className="w-full flex items-center gap-4 bg-gradient-to-r from-red-600 to-orange-500 p-5 rounded-2xl font-bold text-left disabled:opacity-40"
        >
          <Bot className="w-8 h-8" /> Battle vs AI
        </button>
        <Link to="/human-battle" className="w-full flex items-center gap-4 bg-gradient-to-r from-blue-600 to-cyan-500 p-5 rounded-2xl font-bold text-left">
          <Users className="w-8 h-8" /> Battle vs Human
        </Link>
        <Link to="/leaderboards" className="w-full flex items-center gap-4 bg-gradient-to-r from-amber-500 to-yellow-600 p-5 rounded-2xl font-bold text-left">
          <Trophy className="w-8 h-8" /> Leaderboards
        </Link>
        <Link to="/power-ups" className="w-full flex items-center gap-4 bg-gradient-to-r from-emerald-500 to-teal-600 p-5 rounded-2xl font-bold text-left">
          <Sparkles className="w-8 h-8" /> Power Ups
        </Link>
      </div>
      {!ready && count !== null && <p className="text-yellow-400 text-sm mt-6">Your active deck needs at least 15 cards. Build it up in the Deck screen.</p>}
    </div>
  );
}