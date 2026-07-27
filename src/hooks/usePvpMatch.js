import { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { computeDamage, maxHealth } from "@/lib/battleEngine";
import { TIER_RANGES, DEFAULT_ACTIVE_POWERUPS } from "@/lib/gameConstants";
import { isTimestampReady, dailyMultiRemaining, DAY_MS, WEEK_MS } from "@/lib/powerUps";

const randomFrom = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);
const RPS_BEATS = { rock: "scissors", scissors: "paper", paper: "rock" };
const CLEARED_BUFFS = (role) => ({
  [`${role}AttackHalvedTurns`]: 0,
  [`${role}DoubleAttackActive`]: false,
  [`${role}TripleDefenseActive`]: false,
  [`${role}BlockActive`]: false,
  [`${role}TempTierBoost`]: {},
});

// Real-time, synced 1v1 PvP duel. Both clients read the same PvpMatch record and
// each only ever writes their own side's fields, except player1 (the host) also
// drives shared phase transitions (draw->rps->battle) to avoid write races.
// Power-ups write to whichever side's fields they affect (self-buffs or
// opponent debuffs) — allowed because PvpMatch RLS grants both participants
// update access to the whole record.
export default function usePvpMatch(matchCode) {
  const [match, setMatch] = useState(null);
  const [myId, setMyId] = useState(null);
  const [user, setUser] = useState(null);
  const [powerUsedThisTurn, setPowerUsedThisTurn] = useState(false);
  const [reshuffleModalOpen, setReshuffleModalOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const me = await base44.auth.me();
      setMyId(me.id);
      setUser(me);
      const matches = await base44.entities.PvpMatch.filter({ code: matchCode });
      setMatch(matches[0] || null);
    })();
  }, [matchCode]);

  useEffect(() => {
    const unsubscribe = base44.entities.PvpMatch.subscribe((event) => {
      if (event.data?.code === matchCode) setMatch(event.data);
    });
    return unsubscribe;
  }, [matchCode]);

  const myRole = match && myId ? (match.player1Id === myId ? "player1" : "player2") : null;
  const oppRole = myRole === "player1" ? "player2" : "player1";

  const myCard = match?.[`${myRole}Card`];
  const oppCard = match?.[`${oppRole}Card`];
  const myHand = match?.[`${myRole}Hand`] || [];
  const myPool = match?.[`${myRole}Pool`] || [];
  const oppPool = match?.[`${oppRole}Pool`] || [];
  const pendingHybrid = match?.[`${myRole}PendingHybrid`];

  // Only one power-up per turn — reset the moment it becomes my turn.
  useEffect(() => {
    if (match?.turn === myRole) setPowerUsedThisTurn(false);
  }, [match?.turn, myRole]);

  // Auto-deal my hand up to 5 cards whenever I have no active card and no pending choice.
  useEffect(() => {
    if (!match || !myRole || match.status !== "active" || match.phase !== "draw") return;
    if (myCard?.id || pendingHybrid?.id) return;
    if (myHand.length < 5 && myPool.length > 0) {
      const needed = Math.min(5 - myHand.length, myPool.length);
      base44.entities.PvpMatch.update(match.id, {
        [`${myRole}Hand`]: [...myHand, ...myPool.slice(0, needed)],
        [`${myRole}Pool`]: myPool.slice(needed),
      });
    }
  }, [match, myRole]);

  // Host drives the phase transition once both cards are drawn.
  useEffect(() => {
    if (!match || myRole !== "player1" || match.status !== "active" || match.phase !== "draw") return;
    if (match.player1Card?.id && match.player2Card?.id) {
      if (!match.rpsDone) {
        base44.entities.PvpMatch.update(match.id, { phase: "rps", log: "Pick rock, paper, or scissors!" });
      } else {
        base44.entities.PvpMatch.update(match.id, {
          phase: "battle",
          log: match.turn === "player1" ? `${match.player1Name} attacks first!` : `${match.player2Name} attacks first!`,
        });
      }
    }
  }, [match, myRole]);

  // If I have no active card, no cards left in hand, and no cards left in my deck to draw,
  // I have no way to continue and forfeit — the safe finishPvpMatch fallback treats the
  // caller as the forfeiter (loser) whenever the score hasn't legitimately reached 3.
  useEffect(() => {
    if (!match || !myRole || match.status !== "active" || match.phase !== "draw") return;
    if (myCard?.id || pendingHybrid?.id || myHand.length > 0 || myPool.length > 0) return;
    base44.entities.PvpMatch.update(match.id, { phase: "matchEnd", log: "Ran out of cards!" }).then(() => {
      base44.functions.invoke("finishPvpMatch", { matchCode: match.code });
    });
  }, [match, myRole, myCard, myHand, myPool, pendingHybrid]);

  // Host resolves RPS once both players have picked.
  useEffect(() => {
    if (!match || myRole !== "player1" || match.phase !== "rps") return;
    if (match.player1Rps && match.player2Rps) {
      if (match.player1Rps === match.player2Rps) {
        base44.entities.PvpMatch.update(match.id, { player1Rps: "", player2Rps: "", log: "Tie! Pick again." });
        return;
      }
      const winner = RPS_BEATS[match.player1Rps] === match.player2Rps ? "player1" : "player2";
      base44.entities.PvpMatch.update(match.id, {
        turn: winner,
        rpsDone: true,
        phase: "battle",
        player1Rps: "",
        player2Rps: "",
        log: winner === "player1" ? `${match.player1Name} attacks first!` : `${match.player2Name} attacks first!`,
      });
    }
  }, [match, myRole]);

  const pickRps = useCallback(
    (choice) => {
      if (!match || match.phase !== "rps" || !myRole) return;
      base44.entities.PvpMatch.update(match.id, { [`${myRole}Rps`]: choice });
    },
    [match, myRole]
  );

  const playCard = useCallback(
    (card) => {
      if (!match || match.phase !== "draw" || !myRole || myCard?.id || pendingHybrid?.id) return;
      if (card.isHybrid) {
        base44.entities.PvpMatch.update(match.id, {
          [`${myRole}Hand`]: myHand.filter((c) => c.id !== card.id),
          [`${myRole}PendingHybrid`]: card,
        });
        return;
      }
      base44.entities.PvpMatch.update(match.id, {
        [`${myRole}Hand`]: myHand.filter((c) => c.id !== card.id),
        [`${myRole}Card`]: card,
        [`${myRole}Hp`]: maxHealth(card),
      });
    },
    [match, myRole, myCard, myHand, pendingHybrid]
  );

  const chooseHybridType = useCallback(
    (type) => {
      if (!match || !myRole || !pendingHybrid?.id) return;
      const finalCard = { ...pendingHybrid, type };
      base44.entities.PvpMatch.update(match.id, {
        [`${myRole}Card`]: finalCard,
        [`${myRole}Hp`]: maxHealth(finalCard),
        [`${myRole}PendingHybrid`]: {},
      });
    },
    [match, myRole, pendingHybrid]
  );

  const attack = useCallback(async () => {
    if (!match || match.phase !== "battle" || match.turn !== myRole) return;
    let attacker = match[`${myRole}Card`];
    const defender = match[`${oppRole}Card`];
    const usingDoubleAttack = !!match[`${myRole}DoubleAttackActive`];
    const usingTripleDefense = !!match[`${oppRole}TripleDefenseActive`];
    const usingBlock = !!match[`${oppRole}BlockActive`];
    const usingHalfAttack = (match[`${myRole}AttackHalvedTurns`] || 0) > 0;
    const tierBoost = match[`${myRole}TempTierBoost`];
    const usingTierBoost = !!tierBoost?.tier;

    if (usingTierBoost) attacker = { ...attacker, ...tierBoost };
    if (usingHalfAttack) attacker = { ...attacker, attack: Math.round(attacker.attack * 0.5) };

    const result = usingBlock
      ? { tie: false, recoil: false, damage: 0, isCrit: false }
      : computeDamage(attacker, defender, usingDoubleAttack ? 2 : 1, usingTripleDefense ? 3 : 1);

    const buffUpdates = {};
    if (usingDoubleAttack) buffUpdates[`${myRole}DoubleAttackActive`] = false;
    if (usingTierBoost) buffUpdates[`${myRole}TempTierBoost`] = {};
    if (usingHalfAttack) buffUpdates[`${myRole}AttackHalvedTurns`] = Math.max(0, (match[`${myRole}AttackHalvedTurns`] || 0) - 1);
    if (usingTripleDefense) buffUpdates[`${oppRole}TripleDefenseActive`] = false;
    if (usingBlock) buffUpdates[`${oppRole}BlockActive`] = false;

    if (result.tie) {
      await base44.entities.PvpMatch.update(match.id, {
        player1Card: {},
        player2Card: {},
        player1Hp: 0,
        player2Hp: 0,
        phase: "draw",
        log: "It's a tie! Both cards are destroyed.",
        ...buffUpdates,
      });
      return;
    }

    if (result.isCrit && !result.recoil) {
      buffUpdates[`${oppRole}Card`] = { ...defender, defense: Math.max(0, Math.round(defender.defense * 0.8)) };
    }

    const targetRole = result.recoil ? myRole : oppRole;
    const targetHp = match[`${targetRole}Hp`] || 0;
    const newHp = Math.max(0, targetHp - result.damage);

    if (newHp <= 0) {
      const roundWinner = targetRole === myRole ? oppRole : myRole;
      const newScoreP1 = match.scoreP1 + (roundWinner === "player1" ? 1 : 0);
      const newScoreP2 = match.scoreP2 + (roundWinner === "player2" ? 1 : 0);
      const matchOver = newScoreP1 >= 3 || newScoreP2 >= 3;
      const winnerName = roundWinner === "player1" ? match.player1Name : match.player2Name;

      if (matchOver) {
        await base44.entities.PvpMatch.update(match.id, {
          scoreP1: newScoreP1,
          scoreP2: newScoreP2,
          [`${targetRole}Hp`]: 0,
          phase: "matchEnd",
          log: `${winnerName} wins the match!`,
          ...buffUpdates,
        });
        await base44.functions.invoke("finishPvpMatch", { matchCode: match.code });
        return;
      }

      // The loser of the round goes first next round (unless an extra-turn power grants another attack within the round).
      const roundLoser = roundWinner === "player1" ? "player2" : "player1";
      await base44.entities.PvpMatch.update(match.id, {
        scoreP1: newScoreP1,
        scoreP2: newScoreP2,
        [`${targetRole}Card`]: {},
        [`${targetRole}Hp`]: 0,
        round: match.round + 1,
        turn: roundLoser,
        phase: "draw",
        log: `${winnerName} wins round ${match.round}!`,
        ...buffUpdates,
        ...CLEARED_BUFFS(targetRole),
      });
      return;
    }

    await base44.entities.PvpMatch.update(match.id, {
      [`${targetRole}Hp`]: newHp,
      turn: oppRole,
      log: `${myRole === "player1" ? match.player1Name : match.player2Name} deals ${result.damage} damage!`,
      ...buffUpdates,
    });
  }, [match, myRole, oppRole]);

  const forfeit = useCallback(async () => {
    if (!match || !myRole) return;
    await base44.entities.PvpMatch.update(match.id, { phase: "matchEnd", log: "Your opponent forfeited!" });
    await base44.functions.invoke("finishPvpMatch", { matchCode: match.code });
  }, [match, myRole]);

  // ---- Power-ups (shared user cooldown fields, same as AI battles) ----
  const activatePower = useCallback(
    async (field, effectFn) => {
      if (powerUsedThisTurn || !user || !isTimestampReady(user[field], DAY_MS)) return;
      const now = new Date().toISOString();
      const updatedUser = await base44.auth.updateMe({ [field]: now });
      setUser(updatedUser);
      setPowerUsedThisTurn(true);
      await effectFn();
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
      await effectFn();
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
      await effectFn();
    },
    [user, powerUsedThisTurn]
  );

  const burnPower = useCallback(() => {
    if (!match || !oppCard?.id || oppPool.length === 0 || match.phase !== "battle" || match.turn !== myRole) return;
    activatePower("burnPowerUsedAt", async () => {
      const newCard = oppPool[0];
      await base44.entities.PvpMatch.update(match.id, {
        [`${oppRole}Card`]: newCard,
        [`${oppRole}Hp`]: maxHealth(newCard),
        [`${oppRole}Pool`]: oppPool.slice(1),
        ...CLEARED_BUFFS(oppRole),
        log: "Burn! The opponent's card was destroyed and replaced — no life lost.",
      });
    });
  }, [activatePower, match, oppCard, oppPool, myRole, oppRole]);

  const openReshuffle = useCallback(() => setReshuffleModalOpen(true), []);
  const closeReshuffle = useCallback(() => setReshuffleModalOpen(false), []);

  const redrawHandPower = useCallback(() => {
    if (!match || myCard?.id || myHand.length === 0) return;
    activatePower("reshufflePowerUsedAt", async () => {
      const combined = shuffle([...myHand, ...myPool]);
      await base44.entities.PvpMatch.update(match.id, {
        [`${myRole}Hand`]: combined.slice(0, 5),
        [`${myRole}Pool`]: combined.slice(5),
        log: "You drew a new hand!",
      });
    });
    setReshuffleModalOpen(false);
  }, [activatePower, match, myCard, myHand, myPool, myRole]);

  const forceOpponentRedrawPower = useCallback(() => {
    if (!match || !oppCard?.id || oppPool.length === 0 || match.phase !== "battle" || match.turn !== myRole) return;
    activatePower("reshufflePowerUsedAt", async () => {
      const newCard = oppPool[0];
      await base44.entities.PvpMatch.update(match.id, {
        [`${oppRole}Card`]: newCard,
        [`${oppRole}Hp`]: maxHealth(newCard),
        [`${oppRole}Pool`]: oppPool.slice(1),
        ...CLEARED_BUFFS(oppRole),
        log: "You forced your opponent to redraw!",
      });
    });
    setReshuffleModalOpen(false);
  }, [activatePower, match, oppCard, oppPool, myRole, oppRole]);

  const doubleAttackPower = useCallback(() => {
    if (!match || match.phase !== "battle" || match.turn !== myRole) return;
    activatePower("doubleAttackPowerUsedAt", async () => {
      await base44.entities.PvpMatch.update(match.id, {
        [`${myRole}DoubleAttackActive`]: true,
        log: "Double Attack ready — your next strike deals double damage!",
      });
    });
  }, [activatePower, match, myRole]);

  const tripleDefensePower = useCallback(() => {
    if (!match || match.phase !== "battle" || match.turn !== myRole) return;
    activatePower("defensePowerUsedAt", async () => {
      await base44.entities.PvpMatch.update(match.id, {
        [`${myRole}TripleDefenseActive`]: true,
        log: "Triple Defense ready — your card will block the next hit with 3x defense!",
      });
    });
  }, [activatePower, match, myRole]);

  const blockPower = useCallback(() => {
    if (!match || match.phase !== "battle" || match.turn !== myRole) return;
    activateDailyMultiPower("blockPowerUsesToday", "blockPowerResetAt", 5, async () => {
      await base44.entities.PvpMatch.update(match.id, {
        [`${myRole}BlockActive`]: true,
        log: "Block ready — you will completely block the opponent's next attack!",
      });
    });
  }, [activateDailyMultiPower, match, myRole]);

  const halfAttackPower = useCallback(() => {
    if (!match || !oppCard?.id || match.phase !== "battle" || match.turn !== myRole) return;
    activateDailyMultiPower("halfAttackPowerUsesToday", "halfAttackPowerResetAt", 2, async () => {
      await base44.entities.PvpMatch.update(match.id, {
        [`${oppRole}AttackHalvedTurns`]: 2,
        log: "Half Attack activated — the opponent's card deals half damage for its next 2 attacks!",
      });
    });
  }, [activateDailyMultiPower, match, oppCard, myRole, oppRole]);

  const randomTierStats = (tier) => {
    const { statMin, statMax, bonusMin, bonusMax } = TIER_RANGES[tier];
    return { attack: randomInt(statMin, statMax), defense: randomInt(statMin, statMax), bonusDamage: randomInt(bonusMin, bonusMax) };
  };

  const tierUpgradePower = useCallback(
    (tier, field) => {
      if (!match || match.phase !== "battle" || match.turn !== myRole || !myCard?.id) return;
      activateWeeklyPower(field, async () => {
        await base44.entities.PvpMatch.update(match.id, {
          [`${myRole}TempTierBoost`]: { tier, ...randomTierStats(tier) },
          log: `Tier ${tier} Upgrade activated — your card gets randomized T${tier} stats for your next attack!`,
        });
      });
    },
    [activateWeeklyPower, match, myRole, myCard]
  );

  const t2UpgradePower = useCallback(() => tierUpgradePower(2, "t2UpgradePowerUsedAt"), [tierUpgradePower]);
  const t3UpgradePower = useCallback(() => tierUpgradePower(3, "t3UpgradePowerUsedAt"), [tierUpgradePower]);
  const t4UpgradePower = useCallback(() => tierUpgradePower(4, "t4UpgradePowerUsedAt"), [tierUpgradePower]);

  const canUseMap = {
    burn: !powerUsedThisTurn && match?.phase === "battle" && match?.turn === myRole && !!oppCard?.id && oppPool.length > 0,
    reshuffle:
      !powerUsedThisTurn &&
      ((!myCard?.id && myHand.length > 0) || (match?.phase === "battle" && match?.turn === myRole && !!oppCard?.id && oppPool.length > 0)),
    doubleAttack: !powerUsedThisTurn && match?.phase === "battle" && match?.turn === myRole,
    defense: !powerUsedThisTurn && match?.phase === "battle" && match?.turn === myRole,
    block: !powerUsedThisTurn && match?.phase === "battle" && match?.turn === myRole,
    halfAttack: !powerUsedThisTurn && match?.phase === "battle" && match?.turn === myRole && !!oppCard?.id,
    t2Upgrade: !powerUsedThisTurn && match?.phase === "battle" && match?.turn === myRole && !!myCard?.id,
    t3Upgrade: !powerUsedThisTurn && match?.phase === "battle" && match?.turn === myRole && !!myCard?.id,
    t4Upgrade: !powerUsedThisTurn && match?.phase === "battle" && match?.turn === myRole && !!myCard?.id,
  };

  const handlers = {
    burn: burnPower,
    reshuffle: openReshuffle,
    doubleAttack: doubleAttackPower,
    defense: tripleDefensePower,
    block: blockPower,
    halfAttack: halfAttackPower,
    t2Upgrade: t2UpgradePower,
    t3Upgrade: t3UpgradePower,
    t4Upgrade: t4UpgradePower,
  };

  const myTierBoost = match?.[`${myRole}TempTierBoost`];
  const boostPreview = myTierBoost?.tier
    ? { tier: myTierBoost.tier, attack: myTierBoost.attack, defense: myTierBoost.defense }
    : match?.[`${myRole}DoubleAttackActive`]
    ? { attack: (myCard?.attack || 0) * 2 }
    : match?.[`${myRole}TripleDefenseActive`]
    ? { defense: (myCard?.defense || 0) * 3 }
    : null;

  return {
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
    activePowerUps: user?.activePowerUps?.length ? user.activePowerUps : DEFAULT_ACTIVE_POWERUPS,
    canUseMap,
    handlers,
    reshuffleModalOpen,
    openReshuffle,
    closeReshuffle,
    canRedrawHand: !myCard?.id && myHand.length > 0,
    canForceOpponentRedraw: match?.phase === "battle" && match?.turn === myRole && !!oppCard?.id && oppPool.length > 0,
    redrawHandPower,
    forceOpponentRedrawPower,
    boostPreview,
  };
}