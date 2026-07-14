import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import GameCard from "@/components/cards/GameCard";
import HealthBar from "@/components/battle/HealthBar";
import DeckStack from "@/components/battle/DeckStack";
import PlayerHand from "@/components/battle/PlayerHand";
import AttackArrow from "@/components/battle/AttackArrow";
import DamageNumber from "@/components/battle/DamageNumber";
import { maxHealth } from "@/lib/battleEngine";
import { Swords, Flag } from "lucide-react";
import { useNavigate } from "react-router-dom";
import useBattleMatch from "@/hooks/useBattleMatch";

export default function BattleScreen({ playerCards, onMatchEnd }) {
  const navigate = useNavigate();
  const {
    round,
    score,
    playerCard,
    playerHand,
    aiCard,
    playerHP,
    aiHP,
    phase,
    turn,
    log,
    effect,
    matchResult,
    drawHand,
    playCard,
    attack,
    playerRemaining,
  } = useBattleMatch(playerCards, onMatchEnd);

  const handleForfeit = () => {
    if (window.confirm("Forfeit the match and return to the home screen?")) {
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen flex flex-col text-white" style={{ background: "linear-gradient(180deg, #0D1B2A 0%, #1A2E45 100%)" }}>
      <div className="flex justify-between items-center px-4 py-2 text-xs font-bold">
        <span>Round {round}/5</span>
        <span>You {score.player} — {score.ai} AI</span>
        <button onClick={handleForfeit} className="flex items-center gap-1 text-white/60 hover:text-red-400">
          <Flag className="w-3.5 h-3.5" /> Forfeit
        </button>
      </div>

      <div className="flex flex-col items-center pt-2 gap-2">
        <AnimatePresence mode="wait">
          {aiCard && (
            <motion.div key={(aiCard.id || aiCard.name) + round} initial={{ x: 200, rotateY: 180, opacity: 0 }} animate={{ x: 0, rotateY: 0, opacity: 1 }} transition={{ duration: 0.5 }}>
              <GameCard card={aiCard} size="md" glow={matchResult && phase === "matchEnd"} />
            </motion.div>
          )}
        </AnimatePresence>
        {aiCard && (
          <div className="w-40">
            <HealthBar current={aiHP} max={maxHealth(aiCard)} label="Opponent" />
          </div>
        )}
      </div>

      <div className="flex-1 relative flex flex-col items-center justify-center px-4">
        <AttackArrow direction={effect?.side === "player" ? "up" : "down"} color={effect?.side === "player" ? "#FF4500" : "#00BFFF"} trigger={effect?.key} />
        <DamageNumber value={effect?.value} blocked={effect?.blocked} tie={effect?.tie} crit={effect?.crit} trigger={effect?.key} />
        <p className="text-center text-sm text-white/70 max-w-xs">{log}</p>
        {phase === "battle" && turn === "player" && (
          <button
            onClick={() => attack("player")}
            className="mt-4 flex items-center gap-2 bg-gradient-to-r from-orange-500 to-red-600 px-6 py-3 rounded-full font-bold shadow-lg active:scale-95 transition-transform"
          >
            <Swords className="w-5 h-5" /> Attack
          </button>
        )}
        {phase === "matchEnd" && (
          <p className="mt-4 text-2xl font-black">{matchResult === "player" ? "🏆 Victory!" : "Defeat"}</p>
        )}
      </div>

      <div className="flex items-end justify-between px-4 pb-6 gap-3">
        <div className="flex-1" />
        <div className="flex flex-col items-center gap-2">
          {playerCard && (
            <div className="w-40">
              <HealthBar current={playerHP} max={maxHealth(playerCard)} label="You" />
            </div>
          )}
          <AnimatePresence mode="wait">
            {playerCard && (
              <motion.div key={(playerCard.id || playerCard.name) + round} initial={{ x: 200, rotateY: 180, opacity: 0 }} animate={{ x: 0, rotateY: 0, opacity: 1 }} transition={{ duration: 0.5 }}>
                <GameCard card={playerCard} size="md" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="flex-1 flex justify-end">
          <DeckStack remaining={playerRemaining} onDraw={drawHand} disabled={phase !== "draw" || !!playerCard || playerHand.length > 0} />
        </div>
      </div>

      {!playerCard && playerHand.length > 0 && <PlayerHand hand={playerHand} onSelect={playCard} />}
    </div>
  );
}