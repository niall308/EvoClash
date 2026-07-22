import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import GameCard from "@/components/cards/GameCard";
import HealthBar from "@/components/battle/HealthBar";
import DeckStack from "@/components/battle/DeckStack";
import LivesIndicator from "@/components/battle/LivesIndicator";
import RpsPicker from "@/components/battle/RpsPicker";
import ForfeitModal from "@/components/battle/ForfeitModal";
import PlayerHand from "@/components/battle/PlayerHand";
import PowerButtons from "@/components/battle/PowerButtons";
import ReshuffleModal from "@/components/battle/ReshuffleModal";
import TypeChoiceModal from "@/components/battle/TypeChoiceModal";
import PvpMatchEndModal from "@/components/pvpbattle/PvpMatchEndModal";
import { maxHealth } from "@/lib/battleEngine";
import { Swords, Flag, Zap, Loader2 } from "lucide-react";
import usePvpMatch from "@/hooks/usePvpMatch";

export default function PvpBattleScreen({ matchCode }) {
  const navigate = useNavigate();
  const {
    match,
    myRole,
    oppRole,
    pickRps,
    attack,
    forfeit,
    playCard,
    chooseHybridType,
    myHand,
    user,
    activePowerUps,
    canUseMap,
    handlers,
    reshuffleModalOpen,
    openReshuffle,
    closeReshuffle,
    canRedrawHand,
    canForceOpponentRedraw,
    redrawHandPower,
    forceOpponentRedrawPower,
    boostPreview,
  } = usePvpMatch(matchCode);
  const [showForfeitModal, setShowForfeitModal] = useState(false);

  if (!match || !myRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0D1B2A]">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  const oppName = oppRole === "player1" ? match.player1Name : match.player2Name;
  const myCard = match[`${myRole}Card`];
  const oppCard = match[`${oppRole}Card`];
  const myHp = match[`${myRole}Hp`] || 0;
  const oppHp = match[`${oppRole}Hp`] || 0;
  const myScore = myRole === "player1" ? match.scoreP1 : match.scoreP2;
  const oppScore = oppRole === "player1" ? match.scoreP1 : match.scoreP2;
  const myPoolRemaining =
    (match[`${myRole}Pool`] || []).length + (match[`${myRole}Hand`] || []).length + (myCard?.id ? 1 : 0);
  const isMyTurn = match.turn === myRole && match.phase === "battle";
  const faceDown = !match.rpsDone && (match.phase === "draw" || match.phase === "rps");
  const myLives = Math.max(0, 3 - oppScore);
  const oppLives = Math.max(0, 3 - myScore);
  const pendingHybrid = match[`${myRole}PendingHybrid`];
  const doubleAttackActive = !!match[`${myRole}DoubleAttackActive`];
  const tripleDefenseActive = !!match[`${myRole}TripleDefenseActive`];
  const blockActive = !!match[`${myRole}BlockActive`];
  const halfAttackTurnsLeft = match[`${oppRole}AttackHalvedTurns`] || 0;
  const tempTierBoost = match[`${myRole}TempTierBoost`];

  return (
    <div className="min-h-screen flex flex-col text-white" style={{ background: "linear-gradient(180deg, #0D1B2A 0%, #1A2E45 100%)" }}>
      <div className="grid grid-cols-3 items-center px-3 py-2 text-xs font-bold" style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.5rem)" }}>
        <span className="justify-self-start">Round {match.round}/5</span>
        <span className="justify-self-center whitespace-nowrap">You {myScore} — {oppScore} {oppName}</span>
        <button onClick={() => setShowForfeitModal(true)} className="justify-self-end flex items-center gap-1 text-white/60 hover:text-red-400 p-2 -m-2">
          <Flag className="w-3.5 h-3.5" /> Forfeit
        </button>
      </div>

      <div className="flex flex-col items-center pt-2 gap-2">
        <LivesIndicator lives={oppLives} />
        <p className="text-white/50 text-xs -mt-1">{oppName}</p>
        <AnimatePresence mode="wait">
          {oppCard?.id && (
            <motion.div key={oppCard.id + match.round} initial={{ x: 200, rotateY: 180, opacity: 0 }} animate={{ x: 0, rotateY: 0, opacity: 1 }} transition={{ duration: 0.5 }}>
              <GameCard card={oppCard} size="md" faceDown={faceDown} hpRatio={Math.max(0, oppHp / maxHealth(oppCard))} />
            </motion.div>
          )}
        </AnimatePresence>
        {oppCard?.id && (
          <div className="w-40">
            <HealthBar current={oppHp} max={maxHealth(oppCard)} label={oppName} />
          </div>
        )}
      </div>

      <div className="flex-1 relative flex flex-col items-center justify-center px-4">
        <p className="text-center text-sm text-white/70 max-w-xs">{match.log}</p>
        {match.phase === "rps" && (
          <div className="mt-4">
            <RpsPicker onPick={pickRps} />
          </div>
        )}
        {isMyTurn && (
          <div className="flex flex-col items-center gap-2 mt-4">
            {doubleAttackActive && (
              <span className="flex items-center gap-1 text-yellow-300 text-xs font-bold">
                <Zap className="w-3.5 h-3.5" /> Double Attack ready!
              </span>
            )}
            {tripleDefenseActive && (
              <span className="flex items-center gap-1 text-emerald-300 text-xs font-bold">
                <Zap className="w-3.5 h-3.5" /> Triple Defense ready!
              </span>
            )}
            {blockActive && (
              <span className="flex items-center gap-1 text-slate-300 text-xs font-bold">
                <Zap className="w-3.5 h-3.5" /> Block ready!
              </span>
            )}
            {halfAttackTurnsLeft > 0 && (
              <span className="flex items-center gap-1 text-indigo-300 text-xs font-bold">
                <Zap className="w-3.5 h-3.5" /> Half Attack active ({halfAttackTurnsLeft} left)
              </span>
            )}
            {tempTierBoost?.tier && (
              <span className="flex items-center gap-1 text-amber-300 text-xs font-bold">
                <Zap className="w-3.5 h-3.5" /> Tier Upgrade ready!
              </span>
            )}
            <button
              onClick={attack}
              className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-red-600 px-6 py-3 rounded-full font-bold shadow-lg active:scale-95 transition-transform"
            >
              <Swords className="w-5 h-5" /> Attack
            </button>
          </div>
        )}
        {match.phase === "battle" && !isMyTurn && <p className="text-white/40 text-xs mt-4">Waiting for {oppName}...</p>}
      </div>

      <div className="flex items-end justify-between px-4 gap-3" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1.5rem)" }}>
        <div className="flex-1 flex justify-start">
          {match.phase !== "matchEnd" && (
            <PowerButtons user={user} activeKeys={activePowerUps} canUseMap={canUseMap} handlers={handlers} />
          )}
        </div>
        <div className="flex flex-col items-center gap-2">
          <LivesIndicator lives={myLives} />
          {myCard?.id && (
            <div className="w-40">
              <HealthBar current={myHp} max={maxHealth(myCard)} label="You" />
            </div>
          )}
          <AnimatePresence mode="wait">
            {myCard?.id && (
              <motion.div key={myCard.id + match.round} initial={{ x: 200, rotateY: 180, opacity: 0 }} animate={{ x: 0, rotateY: 0, opacity: 1 }} transition={{ duration: 0.5 }}>
                <GameCard card={myCard} size="md" faceDown={faceDown} hpRatio={Math.max(0, myHp / maxHealth(myCard))} boost={boostPreview} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="flex-1 flex justify-end">
          <DeckStack remaining={myPoolRemaining} />
        </div>
      </div>

      {!myCard?.id && myHand.length > 0 && match.phase === "draw" && <PlayerHand hand={myHand} onSelect={playCard} />}

      {reshuffleModalOpen && (
        <ReshuffleModal
          canRedrawHand={canRedrawHand}
          canForceOpponent={canForceOpponentRedraw}
          onRedrawHand={redrawHandPower}
          onForceOpponent={forceOpponentRedrawPower}
          onCancel={closeReshuffle}
        />
      )}
      {pendingHybrid?.id && <TypeChoiceModal onChoose={chooseHybridType} />}

      {match.phase === "matchEnd" && (
        <PvpMatchEndModal
          matchStatus={match.status}
          won={match.status === "finished" ? match.winnerId === (myRole === "player1" ? match.player1Id : match.player2Id) : null}
          coinsEarned={match[`${myRole}CoinsEarned`] || 0}
        />
      )}
      {showForfeitModal && (
        <ForfeitModal
          onConfirm={async () => {
            await forfeit();
            navigate("/");
          }}
          onCancel={() => setShowForfeitModal(false)}
        />
      )}
    </div>
  );
}