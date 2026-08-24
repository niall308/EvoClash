import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import Battle3v3Screen from "@/components/battle3v3/Battle3v3Screen";
import { ensureActiveDeck } from "@/lib/decks";
import { Loader2 } from "lucide-react";

export default function Battle3v3() {
  const navigate = useNavigate();
  const location = useLocation();
  const difficulty = location.state?.difficulty || "Normal";
  const [cards, setCards] = useState(null);

  useEffect(() => {
    (async () => {
      const user = await base44.auth.me();
      const { active } = await ensureActiveDeck(user.id);
      const myCards = await base44.entities.Card.filter({ ownerId: user.id, deckId: active.id });
      if (myCards.length < 15) {
        navigate("/play");
        return;
      }
      setCards(myCards);
    })();
  }, [navigate]);

  if (!cards) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0D1B2A]">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  return <Battle3v3Screen playerCards={cards} difficulty={difficulty} />;
}