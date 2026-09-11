import React, { useState, useRef } from "react";
import { motion } from "framer-motion";
import GameCard from "@/components/cards/GameCard";
import HealthBar from "@/components/battle/HealthBar";
import LivesIndicator from "@/components/battle/LivesIndicator";
import AttackTimingBar from "@/components/battle/AttackTimingBar";
import MatchEndModal from "@/components/battle/MatchEndModal";
import ForfeitModal from "@/components/battle/ForfeitModal";
import PowerButtons from "@/components/battle/PowerButtons";
import CardSelect3v3Modal from "@/components/battle3v3/CardSelect3v3Modal";
import ReplaceCardModal from "@/components/battle3v3/ReplaceCardModal";
import TypeChoiceModal from "@/components/battle/TypeChoiceModal";
import UniqueAttackButton from "@/components/battle/UniqueAttackButton";
import UniqueAttackModal from "@/components/battle/UniqueAttackModal";
import useBattle3v3 from "@/hooks/useBattle3v3";
import { Swords, Flag, Clock, Target, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";

const SLOTS = [0, 1, 2];

export default function Battle3v3Screen({ playerCards, difficulty, onMatchEnd }) {
  const navigate = useNavigate();
  const v = useBattle3v3(playerCards, onMatchEnd, difficulty);
  const [showForfeit, setShowForfeit] = useState(false);
  const [readied, setReadied] = useState(false);
  const slotRects = useRef([null, null, null, null, null, null]); // 0-2 ai, 3-5 player

  const captureRects = () => {
    SLOTS.forEach((i) => {
      const a = document.getElementById(`ai-slot-${i}`);
      const p = document.getElementById(`player-slot-${i}`);
      slotRects.current[i] = a ? a.getBoundingClientRect() : null;
      slotRects.current[3 + i] = p ? p.getBoundingClientRect() : null;
    });
  };

  const canAttack = v.attackerIdx !== null && v.targetIdx !== null;

  return (
    <div className="min-h-screen flex flex-col text-white" style={{ background: "linear-gradient(180deg, #0D1B2A 0%, #1A2E45 100%)" }}>
      <div className="grid grid-cols-3 items-center px-3 py-2 text-xs font-bold" style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.5rem)" }}>
        <span className="justify-self-start">3v3 · {difficulty}</span>
        <span className="justify-self-center whitespace-nowrap">You {v.playerLives} — {v.aiLives} AI</span>
        <button onClick={() => setShowForfeit(true)} className="justify-self-end flex items-center gap-1 text-white/60 p-2 -m-2">
          <Flag className="w-3.5 h-3.5" /> Forfeit
        </button>
      </div>

      {v.phase === "battle" && v.turn === "player" && (
        <div className="flex justify-center items-center gap-1.5 pb-1 text-xs font-bold">
          <Clock className={`w-3.5 h-3.5 ${v.turnTimeLeft <= 30 ? "text-red-400" : "text-white/50"}`} />
          <span className={v.turnTimeLeft <= 30 ? "text-red-400" : "text-white/50"}>{v.turnTimeLeft}s</span>
        </div>
      )}

      {v.phase === "setup" && (
        <CardSelect3v3Modal
          hand={v.selectionHand}
          selectedIds={v.selectedIds}
          onToggle={v.toggleSelect}
          onConfirm={v.confirmSelect3}
        />
      )}

      {v.phase !== "setup" && (
        <>
          <div className="flex flex-col items-center pt-2">
            <LivesIndicator lives={v.aiLives} />
            <div className="w-full flex items-start justify-center gap-2 px-2 py-2">
              {SLOTS.map((i) => (
                <AiSlot
                  key={i}
                  idx={i}
                  slot={v.aiSlots[i]}
                  isTarget={v.targetIdx === i}
                  attackerSide={v.turn === "player"}
                  selectable={v.turn === "player" && v.attackerIdx !== null && v.phase === "battle"}
                  onSelect={() => (v.awaitingUniqueTarget ? v.selectUniqueTarget(i) : v.selectTarget(i))}
                />
              ))}
            </div>
          </div>

          <div className="flex-1 relative flex flex-col items-center justify-center px-4 gap-2">
            {v.effect && <AttackOverlay effect={v.effect} rects={slotRects.current} />}
            <p className="text-center text-sm text-white/70 max-w-xs">{v.log}</p>
            {v.doubleAttackActive && (
              <span className="flex items-center gap-1 text-yellow-300 text-xs font-bold">
                <Zap className="w-3.5 h-3.5" /> Double Attack ready!
              </span>
            )}
            {v.aiThinking && <span className="text-white/50 text-xs animate-pulse">AI is thinking...</span>}
            {v.phase === "battle" && v.turn === "player" && (
              <div className="flex flex-col items-center gap-2 mt-2">
                {v.awaitingUniqueTarget ? (
                  <span className="flex items-center gap-1 text-purple-300 text-xs font-bold animate-pulse">
                    <Target className="w-3.5 h-3.5" /> Tap an enemy card to target with the Unique Attack!
                  </span>
                ) : (
                  <>
                    {v.attackerIdx !== null && v.playerSlots[v.attackerIdx] && (
                      <UniqueAttackButton
                        card={v.playerSlots[v.attackerIdx].card}
                        used={!!v.usedUniqueAttacks[v.playerSlots[v.attackerIdx].card.id]}
                        disabled={readied}
                        onClick={v.triggerUniqueAttack}
                      />
                    )}
                    {v.attackerIdx !== null && v.targetIdx === null && (
                      <span className="flex items-center gap-1 text-cyan-300 text-xs font-bold">
                        <Target className="w-3.5 h-3.5" /> Now tap an enemy card to target
                      </span>
                    )}
                    {readied && canAttack ? (
                      <AttackTimingBar
                        onLock={(m) => {
                          setReadied(false);
                          captureRects();
                          v.playerAttack(m);
                        }}
                      />
                    ) : (
                      <button
                        onClick={() => {
                          if (!canAttack) { setReadied(false); return; }
                          captureRects();
                          setReadied(true);
                        }}
                        disabled={!canAttack}
                        className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold shadow-lg active:scale-95 transition-transform ${
                          canAttack ? "bg-gradient-to-r from-emerald-500 to-teal-600" : "bg-white/10 text-white/40"
                        }`}
                      >
                        <Swords className="w-5 h-5" /> Attack
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          <div style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1.5rem)" }}>
            <div className="flex items-end justify-between px-3 gap-2">
              <div className="flex-1">
                {v.phase === "battle" && v.turn === "player" && !readied && (
                  <PowerButtons user={v.user} activeKeys={v.activePowerUps} canUseMap={v.canUseMap} handlers={v.handlers} />
                )}
              </div>
              <div className="flex flex-col items-center gap-1">
                <LivesIndicator lives={v.playerLives} />
                <div className="flex items-start justify-center gap-2">
                  {SLOTS.map((i) => (
                    <PlayerSlot
                      key={i}
                      idx={i}
                      slot={v.playerSlots[i]}
                      isAttacker={v.attackerIdx === i}
                      buff={v.playerBuffs?.[i]}
                      active={v.phase === "battle" && v.turn === "player"}
                      onClick={() => v.selectAttacker(i)}
                    />
                  ))}
                </div>
              </div>
              <div className="flex-1 flex justify-end items-center text-[10px] text-white/40 font-bold">
                {v.playerRemaining > 0 && <span>Deck {v.playerRemaining}</span>}
              </div>
            </div>
          </div>
        </>
      )}

      {v.phase === "replace" && v.replaceSlotIdx !== null && (
        <ReplaceCardModal choices={v.replaceChoices} onPick={v.pickReplacement} />
      )}

      {v.phase === "hybridChoice" && <TypeChoiceModal onChoose={v.chooseHybridType} />}

      {v.pendingUniqueAttack && !v.awaitingUniqueTarget && (
        <UniqueAttackModal
          uniqueAttack={v.pendingUniqueAttack}
          onUse={v.confirmUniqueAttack}
          onCancel={v.cancelUniqueAttack}
        />
      )}

      {v.phase === "matchEnd" && (onMatchEnd ? null : <MatchEndModal won={v.matchResult === "player"} coinsBreakdown={v.coinsBreakdown} />)}
      {showForfeit && (
        <ForfeitModal
          onConfirm={async () => { await v.forfeitMatch(); navigate("/play"); }}
          onCancel={() => setShowForfeit(false)}
        />
      )}
    </div>
  );
}

function AiSlot({ idx, slot, isTarget, attackerSide, selectable, onSelect }) {
  return (
    <div id={`ai-slot-${idx}`} className="flex flex-col items-center gap-1">
      {slot ? (
        <>
          <button
            onClick={onSelect}
            disabled={!selectable}
            className={`rounded-2xl transition-all ${isTarget ? "ring-4 ring-red-500 animate-pulse" : attackerSide ? "ring-2 ring-white/30" : ""} ${selectable ? "active:scale-95" : "cursor-default"}`}
          >
            <GameCard card={slot.card} size="sm" hpRatio={slot.hp / slot.maxHp} />
          </button>
          <div className="w-20">
            <HealthBar current={slot.hp} max={slot.maxHp} label="" />
          </div>
        </>
      ) : (
        <div className="w-20 h-28 rounded-2xl border-2 border-dashed border-white/15 flex items-center justify-center text-white/20 text-[10px]">
          Empty
        </div>
      )}
    </div>
  );
}

function PlayerSlot({ idx, slot, isAttacker, buff, active, onClick }) {
  return (
    <div id={`player-slot-${idx}`} className="flex flex-col items-center gap-1">
      {slot ? (
        <>
          {(buff?.block || buff?.defenseMult) && (
            <span className="text-[8px] font-bold text-emerald-300 flex items-center gap-0.5">
              <Zap className="w-2 h-2" />{buff.block ? "Block" : "3x Def"}
            </span>
          )}
          <button onClick={onClick} className={`rounded-2xl transition-all ${isAttacker ? "ring-4 ring-amber-400 animate-pulse" : active ? "ring-2 ring-white/20 active:scale-95" : "opacity-90"}`}>
            <GameCard card={slot.card} size="sm" hpRatio={slot.hp / slot.maxHp} />
          </button>
          <div className="w-20">
            <HealthBar current={slot.hp} max={slot.maxHp} label="" />
          </div>
        </>
      ) : (
        <div className="w-20 h-28 rounded-2xl border-2 border-dashed border-white/15 flex items-center justify-center text-white/20 text-[10px]">
          Empty
        </div>
      )}
    </div>
  );
}

function AttackOverlay({ effect, rects }) {
  if (!effect) return null;
  const fromIdx = effect.side === "player" ? 3 + effect.from : effect.from;
  const toIdx = effect.side === "player" ? effect.to : 3 + effect.to;
  const from = rects[fromIdx];
  const to = rects[toIdx];
  if (!from || !to) return null;
  const x1 = from.left + from.width / 2;
  const y1 = from.top + from.height / 2;
  const x2 = to.left + to.width / 2;
  const y2 = to.top + to.height / 2;
  const color = effect.side === "player" ? "#FF4500" : "#00BFFF";
  return (
    <svg className="fixed inset-0 pointer-events-none z-40" width="100%" height="100%">
      <motion.line
        key={effect.key}
        x1={x1} y1={y1} x2={x2} y2={y2}
        stroke={color} strokeWidth={4} strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
      />
      <motion.circle r={6} fill={color} initial={{ cx: x1, cy: y1 }} animate={{ cx: x2, cy: y2 }} transition={{ duration: 0.3 }} />
    </svg>
  );
}