import { useState, useRef, useEffect, useCallback } from "react";
import { generateRandomCard } from "@/lib/cardGenerator";
import { computeDamage, maxHealth } from "@/lib/battleEngine";
import { AI_OPPONENT_NAMES, COINS_PER_CARD_DEFEATED, COINS_PER_WIN } from "@/lib/gameConstants";
import { checkCardMilestones } from "@/lib/coinRewards";
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
  const [log, setLog] = useState("Tap Start Game to begin!");
  const [effect, setEffect] = useState(null);
  const [matchResult, setMatchResult] = useState(null);
  const [graveyard, setGraveyard] = useState(0);
  const [rpsDone, setRpsDone] = useState(false);
  const [user, setUser] = useState(null);
  const [doubleAttackActive, setDoubleAttackActive] = useState(false);
  const [reshuffleModalOpen, setReshuffleModalOpen] = useState(false);
  const statsRef = useRef({});
  const busyRef = useRef(false);
  const defeatedCountRef = useRef(0);

  useEffect(() => {
    (async () => {
      const me = await base44.auth.me();
      setUser(me);
    })();
  }, []);

  const recordRoundResult = (cardId, won, vsBonus) => {
    if (!statsRef.current[cardId]) statsRef.current[cardId] = { winsVsBonus: 0, winsVsNonBonus: 0, gamesPlayed: 0, totalWins: 0 };
    statsRef.current[cardId].gamesPlayed += 1;
    if (won) {
      statsRef.current[cardId][vsBonus ? "winsVsBonus" : "winsVsNonBonus"] += 1;
      statsRef.current[cardId].totalWins += 1;
    }
  };

  const applyProgression = useCallback(
    async (winner, finalScore) => {
      setPhase("matchEnd");
      setMatchResult(winner);
      const cardsUsed = playerCards.filter((c) => statsRef.current[c.id]).map((c) => c.name);
      const updates = [];
      let milestoneCoins = 0;
      for (const card of playerCards) {
        const delta = statsRef.current[card.id];
        if (!delta) continue;
        const merged = {
          ...card,
          winsVsBonus: card.winsVsBonus + delta.winsVsBonus,
          winsVsNonBonus: card.winsVsNonBonus + delta.winsVsNonBonus,
          gamesPlayed: card.gamesPlayed + delta.gamesPlayed,
          totalWins: (card.totalWins || 0) + delta.totalWins,
          totalGames: (card.totalGames || 0) + delta.gamesPlayed,
        };
        const { coins, claimedCardMilestones } = checkCardMilestones(merged);
        merged.claimedCardMilestones = claimedCardMilestones;
        milestoneCoins += coins;
        updates.push(merged);
      }
      if (updates.length) {
        await Promise.all(updates.map(({ id, ...rest }) => base44.entities.Card.update(id, rest)));
      }
      const me = await base44.auth.me();
      const coinsEarned = defeatedCountRef.current * COINS_PER_CARD_DEFEATED + (winner === "player" ? COINS_PER_WIN : 0) + milestoneCoins;
      await base44.auth.updateMe({
        wins: (me.wins || 0) + (winner === "player" ? 1 : 0),
        losses: (me.losses || 0) + (winner === "ai" ? 1 : 0),
        gamesPlayed: (me.gamesPlayed || 0) + 1,
        coins: (me.coins || 0) + coinsEarned,
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
      recordRoundResult(playerCard.id, winnerSide === "player", aiCard.bonusDamage > 0);
      if (winnerSide === "player") defeatedCountRef.current += 1;
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
      setLog("Choose a card to play!");
    },
    [playerCard, aiCard, score, round, applyProgression]
  );

  const attack = useCallback(
    async (attackerSide) => {
      if (busyRef.current || phase !== "battle") return;
      busyRef.current = true;
      const attacker = attackerSide === "player" ? playerCard : aiCard;
      const defender = attackerSide === "player" ? aiCard : playerCard;
      const usingDoubleAttack = attackerSide === "player" && doubleAttackActive;
      const result = computeDamage(attacker, defender, usingDoubleAttack ? 2 : 1);
      if (usingDoubleAttack) setDoubleAttackActive(false);

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
        setLog("Choose a card to play!");
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
    [phase, playerCard, aiCard, playerHP, aiHP, finishRound, doubleAttackActive]
  );

  const canUsePowerTimestamp = (ts) => !ts || Date.now() - new Date(ts).getTime() >= 24 * 60 * 60 * 1000;

  const activatePower = useCallback(
    async (field, effectFn) => {
      if (!user || !canUsePowerTimestamp(user[field])) return;
      const now = new Date().toISOString();
      const updatedUser = await base44.auth.updateMe({ [field]: now });
      setUser(updatedUser);
      effectFn();
    },
    [user]
  );

  const burnPower = useCallback(() => {
    if (!aiCard || aiPool.length === 0 || phase !== "battle") return;
    activatePower("burnPowerUsedAt", () => {
      const newCard = aiPool[0];
      setAiPool((p) => p.slice(1));
      setAiCard(newCard);
      setAiHP(maxHealth(newCard));
      setLog("Burn! The opponent's card was destroyed and replaced — no life lost.");
    });
  }, [activatePower, aiCard, aiPool, phase]);

  const openReshuffle = useCallback(() => setReshuffleModalOpen(true), []);
  const closeReshuffle = useCallback(() => setReshuffleModalOpen(false), []);

  const redrawHandPower = useCallback(() => {
    if (playerCard || playerHand.length === 0) return;
    activatePower("reshufflePowerUsedAt", () => {
      const combined = shuffle([...playerHand, ...playerPool]);
      setPlayerHand(combined.slice(0, 5));
      setPlayerPool(combined.slice(5));
      setLog("You drew a new hand!");
    });
    setReshuffleModalOpen(false);
  }, [activatePower, playerHand, playerPool, playerCard]);

  const forceOpponentRedrawPower = useCallback(() => {
    if (!aiCard || aiPool.length === 0 || phase !== "battle") return;
    activatePower("reshufflePowerUsedAt", () => {
      const newCard = aiPool[0];
      setAiPool((p) => p.slice(1));
      setAiCard(newCard);
      setAiHP(maxHealth(newCard));
      setLog("You forced your opponent to redraw!");
    });
    setReshuffleModalOpen(false);
  }, [activatePower, aiCard, aiPool, phase]);

  const doubleAttackPower = useCallback(() => {
    if (phase !== "battle" || turn !== "player") return;
    activatePower("doubleAttackPowerUsedAt", () => {
      setDoubleAttackActive(true);
      setLog("Double Attack ready — your next strike deals double damage!");
    });
  }, [activatePower, phase, turn]);

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
    setLog("Choose a card to play!");
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
    rpsDone,
    doubleAttackActive,
    powerCooldowns: {
      burnPowerUsedAt: user?.burnPowerUsedAt,
      reshufflePowerUsedAt: user?.reshufflePowerUsedAt,
      doubleAttackPowerUsedAt: user?.doubleAttackPowerUsedAt,
    },
    canBurn: phase === "battle" && !!aiCard && aiPool.length > 0,
    canReshuffle: (!playerCard && playerHand.length > 0) || (phase === "battle" && !!aiCard && aiPool.length > 0),
    canDoubleAttack: phase === "battle" && turn === "player",
    canRedrawHand: !playerCard && playerHand.length > 0,
    canForceOpponentRedraw: phase === "battle" && !!aiCard && aiPool.length > 0,
    burnPower,
    reshuffleModalOpen,
    openReshuffle,
    closeReshuffle,
    redrawHandPower,
    forceOpponentRedrawPower,
    doubleAttackPower,
  };
}