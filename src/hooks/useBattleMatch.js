import { useState, useRef, useEffect, useCallback } from "react";
import { generateRandomCard } from "@/lib/cardGenerator";
import { computeDamage, maxHealth } from "@/lib/battleEngine";
import {
  AI_OPPONENT_NAMES,
  COINS_PER_CARD_DEFEATED,
  COINS_WIN_AI,
  COINS_LOSS_AI,
  AI_DIFFICULTY_WIN_BONUS,
  AI_DIFFICULTY_TIERS,
  STYLE_REFERENCE_URL,
  TIER_RANGES,
  DEFAULT_ACTIVE_POWERUPS,
} from "@/lib/gameConstants";
import { isTimestampReady, dailyMultiRemaining, DAY_MS, WEEK_MS } from "@/lib/powerUps";
import { checkCardMilestones } from "@/lib/coinRewards";
import { base44 } from "@/api/base44Client";

const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const randomFrom = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const RPS_OPTIONS = ["rock", "paper", "scissors"];
const RPS_BEATS = { rock: "scissors", scissors: "paper", paper: "rock" };

export default function useBattleMatch(playerCards, onMatchEnd, difficulty = "Normal") {
  const [opponentName] = useState(() => randomFrom(AI_OPPONENT_NAMES));
  const [aiPool, setAiPool] = useState(() => {
    const tiers = AI_DIFFICULTY_TIERS[difficulty] || AI_DIFFICULTY_TIERS.Normal;
    return shuffle(Array.from({ length: 15 }, () => generateRandomCard(randomFrom(tiers))));
  });
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
  const [tripleDefenseActive, setTripleDefenseActive] = useState(false);
  const [blockActive, setBlockActive] = useState(false);
  const [halfAttackTurnsLeft, setHalfAttackTurnsLeft] = useState(0);
  const [tempTierBoost, setTempTierBoost] = useState(null);
  const [reshuffleModalOpen, setReshuffleModalOpen] = useState(false);
  const [playerEffects, setPlayerEffects] = useState([]);
  const [aiEffects, setAiEffects] = useState([]);
  const statsRef = useRef({});
  const busyRef = useRef(false);
  const defeatedCountRef = useRef(0);
  const halfAttackCardRef = useRef(null);
  const aiImageLoadingRef = useRef(null);

  useEffect(() => {
    (async () => {
      const me = await base44.auth.me();
      setUser(me);
    })();
  }, []);

  // give every AI-drawn card a generated creature picture (once it becomes the active card)
  useEffect(() => {
    if (!aiCard || aiCard.imageUrl || aiImageLoadingRef.current === aiCard) return;
    aiImageLoadingRef.current = aiCard;
    (async () => {
      const { url } = await base44.integrations.Core.GenerateImage({
        prompt: `A ${aiCard.type}-type ${aiCard.baseName}, dynamic full-body creature illustration, matching the exact art style, color palette, lighting, and mystical trading-card aesthetic of the reference image, centered on a plain background, no text, no border, no frame`,
        existing_image_urls: [STYLE_REFERENCE_URL],
      });
      setAiCard((c) => (c === aiCard ? { ...c, imageUrl: url } : c));
    })();
  }, [aiCard]);

  // cancel an in-progress Half Attack effect once the targeted AI card leaves play
  useEffect(() => {
    if (halfAttackCardRef.current !== aiCard) {
      halfAttackCardRef.current = null;
      setHalfAttackTurnsLeft(0);
    }
  }, [aiCard]);

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
      const outcomeCoins =
        winner === "player" ? COINS_WIN_AI + (AI_DIFFICULTY_WIN_BONUS[difficulty] || 0) : COINS_LOSS_AI;
      const coinsEarned = defeatedCountRef.current * COINS_PER_CARD_DEFEATED + outcomeCoins + milestoneCoins;
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
    [playerCards, onMatchEnd, opponentName, difficulty]
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
        setAiEffects([]);
        setPlayerHP(carryHP);
      } else {
        setPlayerCard(null);
        setPlayerHP(0);
        setPlayerEffects([]);
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
      let attacker = attackerSide === "player" ? playerCard : aiCard;
      const defender = attackerSide === "player" ? aiCard : playerCard;
      const usingDoubleAttack = attackerSide === "player" && doubleAttackActive;
      const usingTripleDefense = attackerSide === "ai" && tripleDefenseActive;
      const usingTierBoost = attackerSide === "player" && !!tempTierBoost;
      const usingHalfAttack = attackerSide === "ai" && halfAttackTurnsLeft > 0 && halfAttackCardRef.current === aiCard;
      const usingBlock = attackerSide === "ai" && blockActive;

      if (usingTierBoost) attacker = { ...attacker, ...tempTierBoost };
      if (usingHalfAttack) attacker = { ...attacker, attack: Math.round(attacker.attack * 0.5) };

      const result = usingBlock
        ? { tie: false, recoil: false, damage: 0, isCrit: false }
        : computeDamage(attacker, defender, usingDoubleAttack ? 2 : 1, usingTripleDefense ? 3 : 1);

      if (usingDoubleAttack) setDoubleAttackActive(false);
      if (usingTripleDefense) setTripleDefenseActive(false);
      if (usingTierBoost) setTempTierBoost(null);
      if (usingHalfAttack) setHalfAttackTurnsLeft((n) => n - 1);
      if (usingBlock) setBlockActive(false);

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
        setPlayerEffects([]);
        setAiEffects([]);
        setPhase("draw");
        setLog("Choose a card to play!");
        busyRef.current = false;
        return;
      }

      const targetSide = result.recoil ? attackerSide : attackerSide === "player" ? "ai" : "player";
      const targetHP = targetSide === "player" ? playerHP : aiHP;
      setEffect({ side: attackerSide, value: result.damage, blocked: usingBlock, recoil: result.recoil, crit: result.isCrit, key: Date.now() });
      if (result.damage > 0) {
        const setTargetEffects = targetSide === "player" ? setPlayerEffects : setAiEffects;
        setTargetEffects((e) => (e.includes(attacker.type) ? e : [...e, attacker.type]));
      }
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
    [phase, playerCard, aiCard, playerHP, aiHP, finishRound, doubleAttackActive, tripleDefenseActive, blockActive, halfAttackTurnsLeft, tempTierBoost]
  );

  // Only one power-up may be activated per player turn — reset the moment it becomes the player's turn.
  const [powerUsedThisTurn, setPowerUsedThisTurn] = useState(false);
  useEffect(() => {
    if (turn === "player") setPowerUsedThisTurn(false);
  }, [turn]);

  const activatePower = useCallback(
    async (field, effectFn) => {
      if (powerUsedThisTurn || !user || !isTimestampReady(user[field], DAY_MS)) return;
      const now = new Date().toISOString();
      const updatedUser = await base44.auth.updateMe({ [field]: now });
      setUser(updatedUser);
      setPowerUsedThisTurn(true);
      effectFn();
    },
    [user, powerUsedThisTurn]
  );

  const activateWeeklyPower = useCallback(
    async (field, effectFn) => {
      if (powerUsedThisTurn || !user || !isTimestampReady(user[field], WEEK_MS)) return;
      const now = new Date().toISOString();
      const updatedUser = await base44.auth.updateMe({ [field]: now });
      setUser(updatedUser);
      setPowerUsedThisTurn(true);
      effectFn();
    },
    [user, powerUsedThisTurn]
  );

  const activateDailyMultiPower = useCallback(
    async (usesField, resetField, max, effectFn) => {
      if (powerUsedThisTurn || !user || dailyMultiRemaining(user, usesField, resetField, max) <= 0) return;
      const reset = isTimestampReady(user[resetField], DAY_MS);
      const newUses = reset ? 1 : (user[usesField] || 0) + 1;
      const newResetAt = reset ? new Date().toISOString() : user[resetField];
      const updatedUser = await base44.auth.updateMe({ [usesField]: newUses, [resetField]: newResetAt });
      setUser(updatedUser);
      setPowerUsedThisTurn(true);
      effectFn();
    },
    [user, powerUsedThisTurn]
  );

  const burnPower = useCallback(() => {
    if (!aiCard || aiPool.length === 0 || phase !== "battle" || turn !== "player") return;
    activatePower("burnPowerUsedAt", () => {
      const newCard = aiPool[0];
      setAiPool((p) => p.slice(1));
      setAiCard(newCard);
      setAiHP(maxHealth(newCard));
      setAiEffects([]);
      setLog("Burn! The opponent's card was destroyed and replaced — no life lost.");
    });
  }, [activatePower, aiCard, aiPool, phase, turn]);

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
    if (!aiCard || aiPool.length === 0 || phase !== "battle" || turn !== "player") return;
    activatePower("reshufflePowerUsedAt", () => {
      const newCard = aiPool[0];
      setAiPool((p) => p.slice(1));
      setAiCard(newCard);
      setAiHP(maxHealth(newCard));
      setAiEffects([]);
      setLog("You forced your opponent to redraw!");
    });
    setReshuffleModalOpen(false);
  }, [activatePower, aiCard, aiPool, phase, turn]);

  const doubleAttackPower = useCallback(() => {
    if (phase !== "battle" || turn !== "player") return;
    activatePower("doubleAttackPowerUsedAt", () => {
      setDoubleAttackActive(true);
      setLog("Double Attack ready — your next strike deals double damage!");
    });
  }, [activatePower, phase, turn]);

  const tripleDefensePower = useCallback(() => {
    if (phase !== "battle" || turn !== "player") return;
    activatePower("defensePowerUsedAt", () => {
      setTripleDefenseActive(true);
      setLog("Triple Defense ready — your card will block the next hit with 3x defense!");
    });
  }, [activatePower, phase, turn]);

  const blockPower = useCallback(() => {
    if (phase !== "battle" || turn !== "player") return;
    activateDailyMultiPower("blockPowerUsesToday", "blockPowerResetAt", 5, () => {
      setBlockActive(true);
      setLog("Block ready — you will completely block the opponent's next attack!");
    });
  }, [activateDailyMultiPower, phase, turn]);

  const halfAttackPower = useCallback(() => {
    if (phase !== "battle" || turn !== "player" || !aiCard) return;
    activateDailyMultiPower("halfAttackPowerUsesToday", "halfAttackPowerResetAt", 2, () => {
      halfAttackCardRef.current = aiCard;
      setHalfAttackTurnsLeft(2);
      setLog("Half Attack activated — the opponent's card deals half damage for its next 2 attacks!");
    });
  }, [activateDailyMultiPower, phase, turn, aiCard]);

  const randomTierStats = (tier) => {
    const { statMin, statMax, bonusMin, bonusMax } = TIER_RANGES[tier];
    return { attack: randomInt(statMin, statMax), defense: randomInt(statMin, statMax), bonusDamage: randomInt(bonusMin, bonusMax) };
  };

  const tierUpgradePower = useCallback(
    (tier, field) => {
      if (phase !== "battle" || turn !== "player" || !playerCard) return;
      activateWeeklyPower(field, () => {
        setTempTierBoost({ tier, ...randomTierStats(tier) });
        setLog(`Tier ${tier} Upgrade activated — your card gets randomized T${tier} stats for your next attack!`);
      });
    },
    [activateWeeklyPower, phase, turn, playerCard]
  );

  const t2UpgradePower = useCallback(() => tierUpgradePower(2, "t2UpgradePowerUsedAt"), [tierUpgradePower]);
  const t3UpgradePower = useCallback(() => tierUpgradePower(3, "t3UpgradePowerUsedAt"), [tierUpgradePower]);
  const t4UpgradePower = useCallback(() => tierUpgradePower(4, "t4UpgradePowerUsedAt"), [tierUpgradePower]);

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
      setPlayerEffects([]);
    },
    [phase, playerCard]
  );

  useEffect(() => {
    if (phase === "draw" && !aiCard && aiPool.length > 0) {
      const aCard = aiPool[0];
      setAiPool((p) => p.slice(1));
      setAiCard(aCard);
      setAiHP(maxHealth(aCard));
      setAiEffects([]);
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

  const forfeitMatch = useCallback(async () => {
    const me = await base44.auth.me();
    await base44.auth.updateMe({ losses: (me.losses || 0) + 1, gamesPlayed: (me.gamesPlayed || 0) + 1 });
    await base44.entities.BattleHistory.create({
      opponentName,
      outcome: "loss",
      cardsUsed: [],
      playerScore: score.player,
      aiScore: score.ai,
    });
  }, [opponentName, score]);

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
    user,
    activePowerUps: user?.activePowerUps?.length ? user.activePowerUps : DEFAULT_ACTIVE_POWERUPS,
    doubleAttackActive,
    tripleDefenseActive,
    blockActive,
    halfAttackTurnsLeft,
    tempTierBoost,
    boostPreview: tempTierBoost
      ? { tier: tempTierBoost.tier, attack: tempTierBoost.attack, defense: tempTierBoost.defense }
      : doubleAttackActive
      ? { attack: (playerCard?.attack || 0) * 2 }
      : tripleDefenseActive
      ? { defense: (playerCard?.defense || 0) * 3 }
      : null,
    powerUsedThisTurn,
    playerEffects,
    aiEffects,
    playerHpRatio: playerCard ? Math.max(0, playerHP / maxHealth(playerCard)) : 1,
    aiHpRatio: aiCard ? Math.max(0, aiHP / maxHealth(aiCard)) : 1,
    canUseMap: {
      burn: !powerUsedThisTurn && phase === "battle" && turn === "player" && !!aiCard && aiPool.length > 0,
      reshuffle:
        !powerUsedThisTurn &&
        ((!playerCard && playerHand.length > 0) || (phase === "battle" && turn === "player" && !!aiCard && aiPool.length > 0)),
      doubleAttack: !powerUsedThisTurn && phase === "battle" && turn === "player",
      defense: !powerUsedThisTurn && phase === "battle" && turn === "player",
      block: !powerUsedThisTurn && phase === "battle" && turn === "player",
      halfAttack: !powerUsedThisTurn && phase === "battle" && turn === "player" && !!aiCard,
      t2Upgrade: !powerUsedThisTurn && phase === "battle" && turn === "player" && !!playerCard,
      t3Upgrade: !powerUsedThisTurn && phase === "battle" && turn === "player" && !!playerCard,
      t4Upgrade: !powerUsedThisTurn && phase === "battle" && turn === "player" && !!playerCard,
    },
    handlers: {
      burn: burnPower,
      reshuffle: openReshuffle,
      doubleAttack: doubleAttackPower,
      defense: tripleDefensePower,
      block: blockPower,
      halfAttack: halfAttackPower,
      t2Upgrade: t2UpgradePower,
      t3Upgrade: t3UpgradePower,
      t4Upgrade: t4UpgradePower,
    },
    canRedrawHand: !playerCard && playerHand.length > 0,
    canForceOpponentRedraw: phase === "battle" && turn === "player" && !!aiCard && aiPool.length > 0,
    reshuffleModalOpen,
    openReshuffle,
    closeReshuffle,
    redrawHandPower,
    forceOpponentRedrawPower,
    forfeitMatch,
  };
}