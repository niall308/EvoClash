import { useState, useRef, useEffect, useCallback } from "react";
import { generateRandomCard, upgradeCard } from "@/lib/cardGenerator";
import { computeDamage, maxHealth } from "@/lib/battleEngine";
import { checkUpgradeEligible } from "@/lib/upgradeCheck";
import { AI_OPPONENT_NAMES } from "@/lib/gameConstants";
import { base44 } from "@/api/base44Client";

const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const randomFrom = (arr) => arr[Math.floor(Math.random() * arr.length)];
const RPS_OPTIONS = ["rock", "paper", "scissors"];
const RPS_BEATS = { rock: "scissors", scissors: "paper", paper: "rock" };

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
  const [playerHand, setPlayerHand] = useState([]);
  const [aiCard, setAiCard] = useState(null);
  const [playerHP, setPlayerHP] = useState(0);
  const [aiHP, setAiHP] = useState(0);
  const [phase, setPhase] = useState("draw");
  const [turn, setTurn] = useState(null);
  const [log, setLog] = useState("Tap your deck to draw a card!");
  const [effect, setEffect] = useState(null);
  const [matchResult, setMatchResult] = useState(null);
  const [graveyard, setGraveyard] = useState(0);
  const [rpsDone, setRpsDone] = useState(false);
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
      setTurn(winnerSide);
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
      const result = computeDamage(attacker, defender);

      if (result.isCrit && !result.tie && !result.recoil) {
        const newDefense = Math.max(0, Math.round(defender.defense * 0.8));
        if (attackerSide === "player") setAiCard((c) => ({ ...c, defense: newDefense }));
        else setPlayerCard((c) => ({ ...c, defense: newDefense }));
      }

      if (result.tie) {
        setEffect({ side: attackerSide, value: 0, tie: true, key: Date.now() });
        await sleep(3000);
        setEffect(null);
        setLog("It's a tie! Both cards are destroyed.");
        setGraveyard((g) => g + 2);
        await sleep(1000);
        setPlayerCard(null);
        setAiCard(null);
        setPlayerHP(0);
        setAiHP(0);
        setPhase("draw");
        setLog("Tap your deck to draw a card!");
        busyRef.current = false;
        return;
      }

      const targetSide = result.recoil ? attackerSide : attackerSide === "player" ? "ai" : "player";
      const targetHP = targetSide === "player" ? playerHP : aiHP;
      setEffect({ side: attackerSide, value: result.damage, blocked: false, recoil: result.recoil, crit: result.isCrit, key: Date.now() });
      await sleep(600);
      const newTargetHP = Math.max(0, targetHP - result.damage);
      if (targetSide === "player") setPlayerHP(newTargetHP);
      else setAiHP(newTargetHP);
      await sleep(3000);
      setEffect(null);
      if (newTargetHP <= 0) {
        const winnerSide = targetSide === "player" ? "ai" : "player";
        const survivorHP = winnerSide === "player" ? playerHP : aiHP;
        setGraveyard((g) => g + 1);
        await finishRound(winnerSide, survivorHP);
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

  const drawHand = useCallback(() => {
    if (phase !== "draw" || busyRef.current || playerCard || playerHand.length > 0 || playerPool.length === 0) return;
    const hand = playerPool.slice(0, 5);
    setPlayerPool(playerPool.slice(hand.length));
    setPlayerHand(hand);
  }, [phase, playerCard, playerHand, playerPool]);

  // keep the hand topped up to 5 cards whenever a card leaves it (played or defeated)
  useEffect(() => {
    if (phase === "draw" && !playerCard && playerHand.length > 0 && playerHand.length < 5 && playerPool.length > 0) {
      setPlayerHand((h) => [...h, playerPool[0]]);
      setPlayerPool((p) => p.slice(1));
    }
  }, [phase, playerCard, playerHand, playerPool]);

  const playCard = useCallback(
    (card) => {
      if (phase !== "draw" || busyRef.current || playerCard) return;
      setPlayerHand((h) => h.filter((c) => c.id !== card.id));
      setPlayerCard(card);
      setPlayerHP(maxHealth(card));
    },
    [phase, playerCard]
  );

  useEffect(() => {
    if (phase === "draw" && !aiCard && aiPool.length > 0) {
      const aCard = aiPool[0];
      setAiPool((p) => p.slice(1));
      setAiCard(aCard);
      setAiHP(maxHealth(aCard));
    }
  }, [phase, aiCard, aiPool]);

  useEffect(() => {
    if (phase === "draw" && playerCard && aiCard) {
      if (!rpsDone) {
        setPhase("rps");
        setLog("Pick rock, paper, or scissors to decide who goes first!");
      } else {
        setPhase("battle");
        setLog(turn === "player" ? "Your turn — attack!" : "AI's turn...");
      }
    }
  }, [phase, playerCard, aiCard, rpsDone, turn]);

  const pickRps = useCallback(
    (choice) => {
      if (phase !== "rps") return;
      const aiChoice = randomFrom(RPS_OPTIONS);
      if (choice === aiChoice) {
        setLog(`Both picked ${choice} — tie! Pick again.`);
        return;
      }
      const winner = RPS_BEATS[choice] === aiChoice ? "player" : "ai";
      setTurn(winner);
      setRpsDone(true);
      setPhase("battle");
      setLog(winner === "player" ? "You won the draw — you strike first!" : "AI won the draw — AI strikes first!");
    },
    [phase]
  );

  return {
    round,
    score,
    opponentName,
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
    pickRps,
    graveyard,
    playerRemaining: playerPool.length + playerHand.length,
  };
}