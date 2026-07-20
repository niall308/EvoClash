import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Bot, Users, ArrowLeft, Trophy } from "lucide-react";

export default function Play() {
  const navigate = useNavigate();
  const [count, setCount] = useState(null);

  useEffect(() => {
    (async () => {
      const user = await base44.auth.me();
      const cards = await base44.entities.Card.filter({ created_by_id: user.id });
      setCount(cards.length);
    })();
  }, []);

  const ready = count !== null && count >= 15;

  return (
    <div className="min-h-screen bg-[#0D1B2A] text-white px-6 py-8">
      <Link to="/" className="inline-flex items-center gap-1 text-white/60 text-sm mb-8">
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>
      <h1 className="text-3xl font-black mb-2">Choose Battle</h1>
      <p className="text-white/60 mb-8 text-sm">{count === null ? "Loading deck..." : `${count}/15 cards required to play`}</p>
      <div className="space-y-4">
        <button
          onClick={() => ready && navigate("/battle")}
          disabled={!ready}
          className="w-full flex items-center gap-4 bg-gradient-to-r from-red-600 to-orange-500 p-5 rounded-2xl font-bold text-left disabled:opacity-40"
        >
          <Bot className="w-8 h-8" /> Battle vs AI
        </button>
        <button disabled className="w-full flex items-center gap-4 bg-white/5 p-5 rounded-2xl font-bold text-left opacity-40">
          <Users className="w-8 h-8" /> Battle vs Human <span className="text-xs font-normal ml-auto">Coming soon</span>
        </button>
        <Link to="/leaderboards" className="w-full flex items-center gap-4 bg-gradient-to-r from-amber-500 to-yellow-600 p-5 rounded-2xl font-bold text-left">
          <Trophy className="w-8 h-8" /> Leaderboards
        </Link>
      </div>
      {!ready && count !== null && <p className="text-yellow-400 text-sm mt-6">Build your deck to at least 15 cards in the Deck screen.</p>}
    </div>
  );
}