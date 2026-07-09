import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import BattleScreen from "@/components/battle/BattleScreen";
import { Loader2 } from "lucide-react";

export default function Battle() {
  const navigate = useNavigate();
  const [cards, setCards] = useState(null);
  const [ended, setEnded] = useState(null);

  useEffect(() => {
    (async () => {
      const user = await base44.auth.me();
      const myCards = await base44.entities.Card.filter({ created_by_id: user.id });
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

  if (ended) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-white bg-[#0D1B2A] px-6 text-center">
        <p className="text-3xl font-black">{ended === "player" ? "🏆 You Won the Match!" : "You Lost the Match"}</p>
        <button onClick={() => navigate("/play")} className="bg-white/10 px-6 py-3 rounded-full font-semibold">
          Back to Play
        </button>
      </div>
    );
  }

  return <BattleScreen playerCards={cards} onMatchEnd={setEnded} />;
}