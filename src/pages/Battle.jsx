import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import BattleScreen from "@/components/battle/BattleScreen";
import BattleLoading from "@/components/battle/BattleLoading";
import { prepareBattleDeck } from "@/lib/decks";

export default function Battle() {
  const navigate = useNavigate();
  const location = useLocation();
  const difficulty = location.state?.difficulty || "Normal";
  const [cards, setCards] = useState(null);
  const [status, setStatus] = useState("Finding your active deck…");

  useEffect(() => {
    let alive = true;
    (async () => {
      const user = await base44.auth.me();
      if (!alive) return;
      setStatus("Loading your cards…");
      const { cards: deckCards, ready } = await prepareBattleDeck(user.id);
      if (!alive) return;
      if (!ready) {
        // 15-card gate still enforced — send players back to build a deck.
        navigate("/play");
        return;
      }
      setCards(deckCards);
    })();
    return () => {
      alive = false;
    };
  }, [navigate]);

  if (!cards) return <BattleLoading status={status} />;

  return <BattleScreen playerCards={cards} difficulty={difficulty} />;
}