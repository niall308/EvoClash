import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import CardGrid from "@/components/cards/CardGrid";
import { ArrowLeft, Sparkles, Loader2, ArrowUpCircle } from "lucide-react";

export default function Deck() {
  const navigate = useNavigate();
  const [cards, setCards] = useState(null);
  const [selectedId, setSelectedId] = useState(null);

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
    if (selectedId === id) setSelectedId(null);
  };

  const handleSelect = (card) => {
    setSelectedId((prev) => (prev === card.id ? null : card.id));
  };

  return (
    <div className="min-h-screen bg-[#0D1B2A] text-white pb-24">
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
        <CardGrid cards={cards} onDelete={handleDelete} selectedId={selectedId} onSelect={handleSelect} />
      )}
      {selectedId && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#0D1B2A]/95 border-t border-white/10">
          <button
            onClick={() => navigate(`/card-upgrade/${selectedId}`)}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 py-3 rounded-full font-bold"
          >
            <ArrowUpCircle className="w-5 h-5" /> Upgrade Card
          </button>
        </div>
      )}
    </div>
  );
}