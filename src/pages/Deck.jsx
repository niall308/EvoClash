import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import CardGrid from "@/components/cards/CardGrid";
import { ArrowLeft, Sparkles, Loader2 } from "lucide-react";

export default function Deck() {
  const [cards, setCards] = useState(null);

  const load = async () => {
    const user = await base44.auth.me();
    const data = await base44.entities.Card.filter({ created_by_id: user.id }, "-created_date");
    setCards(data);
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (id) => {
    await base44.entities.Card.delete(id);
    setCards((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <div className="min-h-screen bg-[#0D1B2A] text-white">
      <div className="px-6 py-6 flex items-center justify-between">
        <div>
          <Link to="/" className="inline-flex items-center gap-1 text-white/60 text-sm mb-2">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
          <h1 className="text-2xl font-black">Your Deck</h1>
          <p className="text-white/50 text-xs">{cards ? `${cards.length}/50 cards (min 15 to play)` : "Loading..."}</p>
        </div>
        <Link to="/generate" className="flex items-center gap-1 bg-purple-600 px-4 py-2 rounded-full text-xs font-bold">
          <Sparkles className="w-4 h-4" /> Generate
        </Link>
      </div>
      {!cards ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-white/50" />
        </div>
      ) : (
        <CardGrid cards={cards} onDelete={handleDelete} />
      )}
    </div>
  );
}