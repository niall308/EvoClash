import { useState, useRef, useEffect, useCallback } from "react";
import { generateRandomCard, upgradeCard } from "@/lib/cardGenerator";
import { computeDamage, rollDice, maxHealth } from "@/lib/battleEngine";
import { checkUpgradeEligible } from "@/lib/upgradeCheck";
import { AI_OPPONENT_NAMES } from "@/lib/gameConstants";
import { base44 } from "@/api/base44Client";

const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const randomFrom = (arr) => arr[Math.floor(Math.random() * arr.length)];

export default function useBattleMatch(playerCards, onMatchEnd) {
  const [opponentName] = useState(() => randomFrom(AI_OPPONENT_NAMES));
  const [aiPool, setAiPool] = useState(() =>
    shuffle(
      Array.from({ length: 15 }, () => {
        const r = Math.random();
        const tier = r < 0.6 ? 1 : r < 0.85 ? 2 : r < 0.97 ? 3 : 4;
        return generateRandomCard(tier);
      })
    )
  );
  const [playerPool, setPlayerPool] = useState(() => shuffle(playerCards));
  const [round, setRound] = useState(1);
  const [score, setScore] = useState({ player: 0, ai: 0 });
  const [playerCard, setPlayerCard] = useState(null);
  const [aiCard, setAiCard] = useState(null);
  const [playerHP, setPlayerHP] = useState(0);
  const [aiHP, setAiHP] = useState(0);
  const [phase, setPhase] = useState("draw");
  const [turn, setTurn] = useState(null);
  const [log, setLog] = useState("Tap your deck to draw a card!");
  const [effect, setEffect] = useState(null);
  const [matchResult, setMatchResult] = useState(null);
  const statsRef = useRef({});
  const busyRef = useRef(false);

  const recordStat = (cardId, field) => {
    if (!statsRef.current[cardId]) statsRef.current[cardId] = { winsVsBonus: 0, winsVsNonBonus: 0, gamesPlayed: 0 };
    statsRef.current[cardId][field] += 1;
  };

  const applyProgression = useCallback(
    async (winner, finalScore) => {
      setPhase("matchEnd");
      setMatchResult(winner);
      const cardsUsed = playerCards.filter((c) => statsRef.current[c.id]).map((c) => c.name);
      const updates = [];
      for (const card of playerCards) {
        const delta = statsRef.current[card.id];
        if (!delta) continue;
        let merged = {
          ...card,
          winsVsBonus: card.winsVsBonus + delta.winsVsBonus,
          winsVsNonBonus: card.winsVsNonBonus + delta.winsVsNonBonus,
          gamesPlayed: card.gamesPlayed + delta.gamesPlayed,
        };
        if (checkUpgradeEligible(merged)) {
          merged = upgradeCard(merged);
          merged.winsVsBonus = 0;
          merged.winsVsNonBonus = 0;
          merged.gamesPlayed = 0;
        }
        updates.push(merged);
      }
      if (updates.length) {
        await Promise.all(updates.map(({ id, ...rest }) => base44.entities.Card.update(id, rest)));
      }
      const me = await base44.auth.me();
      await base44.auth.updateMe({
        wins: (me.wins || 0) + (winner === "player" ? 1 : 0),
        losses: (me.losses || 0) + (winner === "ai" ? 1 : 0),
        gamesPlayed: (me.gamesPlayed || 0) + 1,
      });
      await base44.entities.BattleHistory.create({
        opponentName,
        outcome: winner === "player" ? "win" : "loss",
        cardsUsed,
        playerScore: finalScore.player,
        aiScore: finalScore.ai,
      });
      if (onMatchEnd) onMatchEnd(winner);
    },
    [playerCards, onMatchEnd, opponentName]
  );

  const finishRound = useCallback(
    async (winnerSide, carryHP) => {
      setPhase("roundEnd");
      if (winnerSide === "player") recordStat(playerCard.id, aiCard.bonusDamage > 0 ? "winsVsBonus" : "winsVsNonBonus");
      recordStat(playerCard.id, "gamesPlayed");
      const newScore = { ...score, [winnerSide]: score[winnerSide] + 1 };
      setScore(newScore);
      setLog(winnerSide === "player" ? `You win round ${round}!` : `AI wins round ${round}!`);
      await sleep(1600);
      const matchOver = newScore.player >= 3 || newScore.ai >= 3;
      if (matchOver) {
        await applyProgression(newScore.player > newScore.ai ? "player" : "ai", newScore);
        return;
      }
      if (winnerSide === "player") {
        setAiCard(null);
        setAiHP(0);
        setPlayerHP(carryHP);
      } else {
        setPlayerCard(null);
        setPlayerHP(0);
        setAiHP(carryHP);
      }
      setRound((r) => r + 1);
      setPhase("draw");
      setLog("Tap your deck to draw a card!");
    },
    [playerCard, aiCard, score, round, applyProgression]
  );

  const attack = useCallback(
    async (attackerSide) => {
      if (busyRef.current || phase !== "battle") return;
      busyRef.current = true;
      const attacker = attackerSide === "player" ? playerCard : aiCard;
      const defender = attackerSide === "player" ? aiCard : playerCard;
      const attackerHP = attackerSide === "player" ? playerHP : aiHP;
      const defenderHP = attackerSide === "player" ? aiHP : playerHP;
      const dmg = computeDamage(attacker, defender);
      setEffect({ side: attackerSide, value: dmg, blocked: dmg === 0, key: Date.now() });
      await sleep(600);
      const newDefHP = Math.max(0, defenderHP - dmg);
      if (attackerSide === "player") setAiHP(newDefHP);
      else setPlayerHP(newDefHP);
      await sleep(500);
      if (newDefHP <= 0) {
        await finishRound(attackerSide, attackerHP);
        busyRef.current = false;
        return;
      }
      setTurn(attackerSide === "player" ? "ai" : "player");
      setLog(attackerSide === "player" ? "AI's turn..." : "Your turn — attack!");
      busyRef.current = false;
    },
    [phase, playerCard, aiCard, playerHP, aiHP, finishRound]
  );

  useEffect(() => {
    if (phase === "battle" && turn === "ai" && !busyRef.current) {
      const t = setTimeout(() => attack("ai"), 900);
      return () => clearTimeout(t);
    }
  }, [phase, turn, attack]);

  const draw = useCallback(() => {
    if (phase !== "draw" || busyRef.current) return;
    let pCard = playerCard;
    let pool = playerPool;
    if (!pCard) {
      pCard = pool[0];
      pool = pool.slice(1);
      setPlayerPool(pool);
      setPlayerCard(pCard);
      setPlayerHP(maxHealth(pCard));
    }
    let aCard = aiCard;
    let apool = aiPool;
    if (!aCard) {
      aCard = apool[0];
      apool = apool.slice(1);
      setAiPool(apool);
      setAiCard(aCard);
      setAiHP(maxHealth(aCard));
    }
    const first = rollDice();
    setTurn(first);
    setPhase("battle");
    setLog(first === "player" ? `Round ${round}: Dice roll — you strike first!` : `Round ${round}: Dice roll — AI strikes first!`);
  }, [phase, playerCard, playerPool, aiCard, aiPool, round]);

  return {
    round,
    score,
    opponentName,
    playerCard,
    aiCard,
    playerHP,
    aiHP,
    phase,
    turn,
    log,
    effect,
    matchResult,
    draw,
    attack,
    playerRemaining: playerPool.length,
  };
}