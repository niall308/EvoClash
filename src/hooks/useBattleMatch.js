import { useState, useRef, useEffect, useCallback } from "react";
import { generateRandomCard } from "@/lib/cardGenerator";
import { computeDamage, maxHealth } from "@/lib/battleEngine";
import {
  AI_OPPONENT_NAMES,
  AI_DIFFICULTY_TIERS,
  STYLE_REFERENCE_URL,
  TIER_RANGES,
  DEFAULT_ACTIVE_POWERUPS,
  TURN_TIME_LIMIT_SECONDS,
  MAX_CONSECUTIVE_TURN_TIMEOUTS,
} from "@/lib/gameConstants";
import { isTimestampReady, dailyMultiRemaining, DAY_MS, WEEK_MS } from "@/lib/powerUps";
import { base44 } from "@/api/base44Client";

const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const randomFrom = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const RPS_OPTIONS = ["rock", "paper", "scissors"];
const RPS_BEATS = { rock: "scissors", scissors: "paper", paper: "rock" };

export default function useBattleMatch(playerCards, onMatchEnd, difficulty = "Normal", options = {}) {
  const { skipRewards = false, aiPoolOverride } = options;
  const [opponentName] = useState(() => randomFrom(AI_OPPONENT_NAMES));
  const [aiPool, setAiPool] = useState([]);
  const [aiPoolLoaded, setAiPoolLoaded] = useState(false);

  // Draw the AI's 15-card pool from the pre-generated 100-card deck for this difficulty
  // (falls back to live generation if that deck hasn't been seeded yet by an admin).
  useEffect(() => {
    (async () => {
      if (aiPoolOverride) {
        setAiPool(shuffle(aiPoolOverride).slice(0, 15));
        setAiPoolLoaded(true);
        return;
      }
      const deckCards = await base44.entities.AiDeckCard.filter({ difficulty });
      if (deckCards.length > 0) {
        setAiPool(shuffle(deckCards).slice(0, 15));
      } else {
        const tiers = AI_DIFFICULTY_TIERS[difficulty] || AI_DIFFICULTY_TIERS.Normal;
        setAiPool(shuffle(Array.from({ length: 15 }, () => generateRandomCard(randomFrom(tiers)))));
      }
      setAiPoolLoaded(true);
    })();
  }, [difficulty, aiPoolOverride]);
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
  const [coinsBreakdown, setCoinsBreakdown] = useState(null);
  const [graveyardCards, setGraveyardCards] = useState([]);
  const [turnTimeLeft, setTurnTimeLeft] = useState(TURN_TIME_LIMIT_SECONDS);
  const consecutiveTimeoutsRef = useRef(0);
  const timeoutFiredRef = useRef(false);
  const [rpsDone, setRpsDone] = useState(false);
  const [user, setUser] = useState(null);
  const [doubleAttackActive, setDoubleAttackActive] = useState(false);
  const [tripleDefenseActive, setTripleDefenseActive] = useState(false);
  const [blockActive, setBlockActive] = useState(false);
  const [halfAttackTurnsLeft, setHalfAttackTurnsLeft] = useState(0);
  const [tempTierBoost, setTempTierBoost] = useState(null);
  const [reshuffleModalOpen, setReshuffleModalOpen] = useState(false);
  const [pendingHybridCard, setPendingHybridCard] = useState(null);
  const hybridChoicesRef = useRef({});
  const [playerEffects, setPlayerEffects] = useState([]);
  const [aiEffects, setAiEffects] = useState([]);
  const statsRef = useRef({});
  const busyRef = useRef(false);
  const defeatedCountRef = useRef(0);
  const halfAttackCardRef = useRef(null);
  const aiImageLoadingRef = useRef(null);
  const matchTypesRef = useRef(new Set());
  const matchDamageRef = useRef(0);
  const matchBlocksRef = useRef(0);
  const matchStartRef = useRef(Date.now());
  const roundMinHpRatioRef = useRef(1);
  const matchComebackRef = useRef(false);
  const matchHigherTierDefeatRef = useRef(false);
  const summonCountRef = useRef(0);
  const finalWinHPRef = useRef(null);
  const matchPowerUsedRef = useRef(false);
  const matchIdRef = useRef(null);
  const settledRef = useRef(false);

  // Extra tactical power-up state (all the powers beyond the original 9), grouped in one object
  // so battle logic can read/consume any of them without a state variable per power.
  const [pfx, setPfx] = useState({});
  const patchPfx = useCallback((patch) => setPfx((p) => (typeof patch === "function" ? patch(p) : { ...p, ...patch })), []);

  useEffect(() => {
    (async () => {
      const me = await base44.auth.me();
      setUser(me);
    })();
  }, []);

  // Start a server-side AI match session (single-active per user). The session is
  // the idempotency + concurrency key for finalizeAIBattle — only one AI match can
  // be active at a time, and each matchId is finalized exactly once.
  useEffect(() => {
    if (skipRewards) return; // story mode manages its own rewards separately
    let cancelled = false;
    (async () => {
      try {
        const id = crypto.randomUUID();
        matchIdRef.current = id;
        await base44.functions.invoke("startAiMatch", { matchId: id, difficulty, opponentName });
      } catch (e) {
        // best-effort: match continues; finalize becomes a no-op if start failed
      }
      cancelled = true;
    })();
    return () => { cancelled = true; };
  }, [difficulty, opponentName, skipRewards]);

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
      if (settledRef.current) return; // idempotent: only one progression per match
      settledRef.current = true;
      setPhase("matchEnd");
      setMatchResult(winner);
      if (skipRewards) {
        setCoinsBreakdown(null);
        if (onMatchEnd) onMatchEnd(winner, { flawless: winner === "player" && finalScore.ai === 0, powerUpsUsed: matchPowerUsedRef.current, score: finalScore });
        return;
      }
      // Build per-card stat deltas for the server to apply. finalizeAIBattle
      // re-validates ownership, recomputes the coin reward, grants card milestones,
      // and writes User/Card/BattleHistory atomically — the client no longer writes
      // any of those directly (closes coin-mint, lost-update, double-count).
      const cardDeltas = [];
      const cardsUsed = [];
      for (const card of playerCards) {
        const d = statsRef.current[card.id];
        if (!d) continue;
        cardsUsed.push(card.name);
        cardDeltas.push({
          cardId: card.id,
          winsVsBonus: d.winsVsBonus,
          winsVsNonBonus: d.winsVsNonBonus,
          gamesPlayed: d.gamesPlayed,
          totalWins: d.totalWins,
          matchWin: winner === "player",
        });
      }
      try {
        const { data } = await base44.functions.invoke("finalizeAIBattle", {
          matchId: matchIdRef.current,
          winner,
          difficulty,
          score: finalScore,
          cardsDefeated: defeatedCountRef.current,
          damageDealt: matchDamageRef.current,
          blocksUsed: matchBlocksRef.current,
          distinctTypes: matchTypesRef.current.size,
          durationSeconds: Math.round((Date.now() - matchStartRef.current) / 1000),
          summonCount: summonCountRef.current,
          finalWinHP: finalWinHPRef.current,
          comeback: matchComebackRef.current,
          higherTierDefeat: matchHigherTierDefeatRef.current,
          cardDeltas,
          forfeited: false,
        });
        if (data?.user) {
          setUser(data.user);
          window.dispatchEvent(new CustomEvent("coins-claimed", { detail: { newTotal: data.user.coins } }));
        }
        setCoinsBreakdown(data?.breakdown || null);
      } catch (err) {
        setCoinsBreakdown(null);
      }
      if (onMatchEnd) onMatchEnd(winner);
    },
    [playerCards, onMatchEnd, opponentName, difficulty, skipRewards]
  );

  const finishRound = useCallback(
    async (winnerSide, carryHP) => {
      setPhase("roundEnd");
      recordRoundResult(playerCard.id, winnerSide === "player", aiCard.bonusDamage > 0);
      if (winnerSide === "player") {
        defeatedCountRef.current += 1;
        if (aiCard.tier > playerCard.tier) matchHigherTierDefeatRef.current = true;
        if (roundMinHpRatioRef.current <= 0.5) matchComebackRef.current = true;
        finalWinHPRef.current = carryHP;
        if (pfx.restoreOnDefeatActive) {
          const healed = Math.round(maxHealth(playerCard) * 0.2);
          carryHP = Math.min(maxHealth(playerCard) + (pfx.maxHPBonus || 0), carryHP + healed);
        }
      }
      roundMinHpRatioRef.current = 1;
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
      // The loser of the round goes first next round (unless an extra-turn power like
      // Double Strike or Time Freeze grants another attack within the same round).
      setTurn(winnerSide === "player" ? "ai" : "player");
      setRound((r) => r + 1);
      setPhase("draw");
      setLog("Choose a card to play!");
    },
    [playerCard, aiCard, score, round, applyProgression, pfx.restoreOnDefeatActive, pfx.maxHPBonus]
  );

  const attack = useCallback(
    async (attackerSide, timingMultiplier = 1) => {
      if (busyRef.current || phase !== "battle") return;
      busyRef.current = true;
      if (attackerSide === "player") consecutiveTimeoutsRef.current = 0;
      let attacker = attackerSide === "player" ? playerCard : aiCard;
      let defender = attackerSide === "player" ? aiCard : playerCard;
      const usingDoubleAttack = attackerSide === "player" && doubleAttackActive;
      const usingTripleDefense = attackerSide === "ai" && tripleDefenseActive;
      const usingTierBoost = attackerSide === "player" && !!tempTierBoost;
      const usingHalfAttack = attackerSide === "ai" && halfAttackTurnsLeft > 0 && halfAttackCardRef.current === aiCard;
      const usingBlock = attackerSide === "ai" && blockActive;

      // player-outgoing one-shot buffs
      const usingIgnoreDefense = attackerSide === "player" && !!pfx.ignoreDefensePercent;
      const usingTrueDamage = attackerSide === "player" && !!pfx.trueDamage;
      const usingGuaranteedCrit = attackerSide === "player" && !!pfx.guaranteedCrit;
      const usingDoubleBonusDamage = attackerSide === "player" && !!pfx.doubleBonusDamage;
      const usingMaximizeAttack = attackerSide === "player" && !!pfx.maximizeAttackReady;

      // player-defending (ai attacking) buffs
      const usingDoubleDefenseTurns = attackerSide === "ai" && (pfx.doubleDefenseTurns || 0) > 0;
      const usingMaximizeDefense = attackerSide === "ai" && !!pfx.maximizeDefenseReady;
      const usingNegate = attackerSide === "ai" && !!pfx.negateNextAttack;
      const usingReduceDamage = attackerSide === "ai" && (pfx.reduceDamageTurns || 0) > 0;
      const usingReflect = attackerSide === "ai" && !!pfx.reflectNextAttack;
      const usingDivineProtection = attackerSide === "ai" && (pfx.divineProtectionTurns || 0) > 0;

      if (usingTierBoost) attacker = { ...attacker, ...tempTierBoost };
      if (usingHalfAttack) attacker = { ...attacker, attack: Math.round(attacker.attack * 0.5) };
      if (usingMaximizeAttack) attacker = { ...attacker, attack: TIER_RANGES[attacker.tier || 1].statMax };
      if (usingDoubleBonusDamage) attacker = { ...attacker, bonusDamage: (attacker.bonusDamage || 0) * 2 };
      if (usingMaximizeDefense) defender = { ...defender, defense: TIER_RANGES[defender.tier || 1].statMax };

      let defenseMultiplier = usingTripleDefense ? 3 : 1;
      if (usingDoubleDefenseTurns) defenseMultiplier *= 2;

      const result = usingBlock || usingNegate || usingDivineProtection
        ? { tie: false, recoil: false, damage: 0, isCrit: false }
        : computeDamage(attacker, defender, (usingDoubleAttack ? 2 : 1) * (attackerSide === "player" ? timingMultiplier : 1), defenseMultiplier, {
            ignoreDefensePercent: usingIgnoreDefense ? pfx.ignoreDefensePercent : 0,
            trueDamage: usingTrueDamage,
            forceCrit: usingGuaranteedCrit,
          });

      if (usingDoubleAttack) setDoubleAttackActive(false);
      if (usingTripleDefense) setTripleDefenseActive(false);
      if (usingTierBoost) setTempTierBoost(null);
      if (usingHalfAttack) setHalfAttackTurnsLeft((n) => n - 1);
      if (usingBlock) setBlockActive(false);
      if (usingIgnoreDefense || usingTrueDamage || usingGuaranteedCrit || usingDoubleBonusDamage || usingMaximizeAttack) {
        patchPfx({ ignoreDefensePercent: 0, trueDamage: false, guaranteedCrit: false, doubleBonusDamage: false, maximizeAttackReady: false });
      }
      if (usingDoubleDefenseTurns) patchPfx((p) => ({ ...p, doubleDefenseTurns: Math.max(0, (p.doubleDefenseTurns || 0) - 1) }));
      if (usingMaximizeDefense) patchPfx({ maximizeDefenseReady: false });
      if (usingNegate) patchPfx({ negateNextAttack: false });
      if (usingReduceDamage) patchPfx((p) => ({ ...p, reduceDamageTurns: Math.max(0, (p.reduceDamageTurns || 0) - 1) }));
      if (usingDivineProtection) patchPfx((p) => ({ ...p, divineProtectionTurns: Math.max(0, (p.divineProtectionTurns || 0) - 1) }));

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
        setGraveyardCards((g) => [...g, playerCard, aiCard]);
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
      let damage = result.damage;
      // apply incoming-damage-reduction buffs when the player is the one taking the hit
      if (targetSide === "player" && damage > 0) {
        if (usingReduceDamage) damage = Math.round(damage * 0.5);
      }
      const targetHP = targetSide === "player" ? playerHP : aiHP;
      let shieldAbsorbed = 0;
      if (targetSide === "player" && damage > 0 && (pfx.shield || 0) > 0) {
        shieldAbsorbed = Math.min(pfx.shield, damage);
        damage -= shieldAbsorbed;
        patchPfx((p) => ({ ...p, shield: Math.max(0, (p.shield || 0) - shieldAbsorbed) }));
      }
      setEffect({ side: attackerSide, value: damage, blocked: usingBlock || usingNegate || usingDivineProtection, recoil: result.recoil, crit: result.isCrit, key: Date.now() });
      if (damage > 0) {
        const setTargetEffects = targetSide === "player" ? setPlayerEffects : setAiEffects;
        setTargetEffects((e) => (e.includes(attacker.type) ? e : [...e, attacker.type]));
      }
      if (usingReflect && damage > 0) {
        patchPfx({ reflectNextAttack: false });
        const reflected = Math.round(damage * 0.25);
        setAiHP((h) => Math.max(0, h - reflected));
      }
      await sleep(600);
      let newTargetHP = Math.max(0, targetHP - damage);
      if (targetSide === "player" && newTargetHP <= 0 && pfx.surviveWith1HP) {
        newTargetHP = 1;
        patchPfx({ surviveWith1HP: false });
        setLog("Last Breath saved you — you survive with 1 HP!");
      }
      if (targetSide === "player" && newTargetHP <= 0 && pfx.phoenixRebirthAvailable) {
        newTargetHP = Math.round(maxHealth(playerCard) * 0.75) + (pfx.maxHPBonus || 0);
        patchPfx({ phoenixRebirthAvailable: false });
        setLog("Phoenix Rebirth! Your card revives with 75% HP!");
      }
      if (targetSide === "player" && newTargetHP <= 0 && pfx.lastStandActive && attacker) {
        patchPfx({ lastStandActive: false });
        const finalHit = computeDamage(playerCard, attacker);
        if (!finalHit.tie && !finalHit.recoil && finalHit.damage > 0) setAiHP((h) => Math.max(0, h - finalHit.damage));
        setLog("Last Stand! Your card strikes one final time before falling!");
        await sleep(800);
      }
      if (targetSide === "player") {
        setPlayerHP(newTargetHP);
        const ratio = maxHealth(playerCard) > 0 ? newTargetHP / (maxHealth(playerCard) + (pfx.maxHPBonus || 0)) : 0;
        if (ratio < roundMinHpRatioRef.current) roundMinHpRatioRef.current = ratio;
      } else setAiHP(newTargetHP);
      if (attackerSide === "player" && !result.recoil && damage > 0) {
        matchDamageRef.current += damage;
        if ((pfx.healOnDamageTurns || 0) > 0) {
          const healed = Math.round(maxHealth(playerCard) * 0.1);
          setPlayerHP((hp) => Math.min(maxHealth(playerCard) + (pfx.maxHPBonus || 0), hp + healed));
          patchPfx((p) => ({ ...p, healOnDamageTurns: Math.max(0, (p.healOnDamageTurns || 0) - 1) }));
        }
      }
      if (attackerSide === "player" && pfx.berserkerRageActive) {
        setPlayerCard((c) => (c ? { ...c, attack: Math.round(c.attack * 1.1), defense: Math.round(c.defense * 0.95) } : c));
      }
      if ((usingBlock || usingNegate || usingDivineProtection) && damage === 0) matchBlocksRef.current += 1;
      await sleep(3000);
      setEffect(null);
      if (newTargetHP <= 0) {
        const winnerSide = targetSide === "player" ? "ai" : "player";
        const survivorHP = winnerSide === "player" ? playerHP : aiHP;
        setGraveyardCards((g) => [...g, defender]);
        await finishRound(winnerSide, survivorHP);
        busyRef.current = false;
        return;
      }
      // Double Strike: grants a second attack this turn. Keep the turn on the player
      // (like Time Freeze) instead of recursively calling attack() again — that recursion
      // used a stale closure whose attackTwiceReady flag never actually cleared, causing
      // an infinite attack loop.
      if (attackerSide === "player" && pfx.attackTwiceReady) {
        patchPfx({ attackTwiceReady: false });
        setLog("Double Strike! Attack again!");
        setTurn("player");
        busyRef.current = false;
        return;
      }
      if (attackerSide === "player" && pfx.timeFreezeQueued) {
        patchPfx({ timeFreezeQueued: false });
        setLog("Time Freeze! The opponent skips their turn — attack again!");
        setTurn("player");
        busyRef.current = false;
        return;
      }
      setTurn(attackerSide === "player" ? "ai" : "player");
      setLog(attackerSide === "player" ? "AI's turn..." : "Your turn — attack!");
      busyRef.current = false;
    },
    [phase, playerCard, aiCard, playerHP, aiHP, finishRound, doubleAttackActive, tripleDefenseActive, blockActive, halfAttackTurnsLeft, tempTierBoost, pfx, patchPfx]
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
      matchPowerUsedRef.current = true;
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
      matchPowerUsedRef.current = true;
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
      matchPowerUsedRef.current = true;
      effectFn();
    },
    [user, powerUsedThisTurn]
  );

  const activatePremiumPower = useCallback(
    async (field, effectFn) => {
      if (powerUsedThisTurn || !user || !user[field]) return;
      const updatedUser = await base44.auth.updateMe({ [field]: false });
      setUser(updatedUser);
      setPowerUsedThisTurn(true);
      matchPowerUsedRef.current = true;
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

  // ---- Attack category additions ----
  const ignoreDefensePower = useCallback(() => {
    if (phase !== "battle" || turn !== "player") return;
    activatePower("ignoreDefensePowerUsedAt", () => {
      patchPfx({ ignoreDefensePercent: 0.5 });
      setLog("Ignore Defense ready — your next attack ignores 50% of the opponent's defense!");
    });
  }, [activatePower, phase, turn, patchPfx]);

  const trueDamagePower = useCallback(() => {
    if (phase !== "battle" || turn !== "player") return;
    activatePower("trueDamagePowerUsedAt", () => {
      patchPfx({ trueDamage: true });
      setLog("True Damage ready — your next attack ignores all defense!");
    });
  }, [activatePower, phase, turn, patchPfx]);

  const critHitPower = useCallback(() => {
    if (phase !== "battle" || turn !== "player") return;
    activatePower("critHitPowerUsedAt", () => {
      patchPfx({ guaranteedCrit: true });
      setLog("Guaranteed Crit ready — your next attack will critically hit!");
    });
  }, [activatePower, phase, turn, patchPfx]);

  const doubleBonusDamagePower = useCallback(() => {
    if (phase !== "battle" || turn !== "player") return;
    activateDailyMultiPower("doubleBonusDamagePowerUsesToday", "doubleBonusDamagePowerResetAt", 5, () => {
      patchPfx({ doubleBonusDamage: true });
      setLog("Double Bonus Damage ready — your next attack's bonus damage is doubled!");
    });
  }, [activateDailyMultiPower, phase, turn, patchPfx]);

  const attackTwicePower = useCallback(() => {
    if (phase !== "battle" || turn !== "player") return;
    activateWeeklyPower("attackTwicePowerUsedAt", () => {
      patchPfx({ attackTwiceReady: true });
      setLog("Double Strike ready — you'll attack twice this turn!");
    });
  }, [activateWeeklyPower, phase, turn, patchPfx]);

  // ---- Defense category additions ----
  const tripleDefense1TurnPower = useCallback(() => {
    if (phase !== "battle" || turn !== "player") return;
    activatePower("tripleDefense1TurnPowerUsedAt", () => {
      setTripleDefenseActive(true);
      setLog("3x Defense ready — your card will block the next hit with triple defense!");
    });
  }, [activatePower, phase, turn]);

  const doubleDefense2TurnsPower = useCallback(() => {
    if (phase !== "battle" || turn !== "player") return;
    activatePower("doubleDefense2TurnsPowerUsedAt", () => {
      patchPfx({ doubleDefenseTurns: 2 });
      setLog("2x Defense active for your next 2 defenses!");
    });
  }, [activatePower, phase, turn, patchPfx]);

  const shield25Power = useCallback(() => {
    if (phase !== "battle" || turn !== "player" || !playerCard) return;
    activatePower("shield25PowerUsedAt", () => {
      const amount = Math.round(maxHealth(playerCard) * 0.25);
      patchPfx((p) => ({ ...p, shield: (p.shield || 0) + amount }));
      setLog("Shield up! You'll absorb the next hits.");
    });
  }, [activatePower, phase, turn, playerCard, patchPfx]);

  const negateNextAttackPower = useCallback(() => {
    if (phase !== "battle" || turn !== "player") return;
    activatePower("negateNextAttackPowerUsedAt", () => {
      patchPfx({ negateNextAttack: true });
      setLog("Negate Attack ready — the opponent's next attack will deal zero damage!");
    });
  }, [activatePower, phase, turn, patchPfx]);

  const reduceDamage50Power = useCallback(() => {
    if (phase !== "battle" || turn !== "player") return;
    activatePower("reduceDamage50PowerUsedAt", () => {
      patchPfx({ reduceDamageTurns: 2 });
      setLog("Damage Reduction active — incoming damage halved for 2 turns!");
    });
  }, [activatePower, phase, turn, patchPfx]);

  const reflectDamage25Power = useCallback(() => {
    if (phase !== "battle" || turn !== "player") return;
    activatePower("reflectDamagePowerUsedAt", () => {
      patchPfx({ reflectNextAttack: true });
      setLog("Reflect Damage ready — 25% of the opponent's next attack will bounce back!");
    });
  }, [activatePower, phase, turn, patchPfx]);

  const regenPower = useCallback(() => {
    if (phase !== "battle" || turn !== "player") return;
    activatePower("regenPowerUsedAt", () => {
      patchPfx({ regenTurns: 3 });
      setLog("Regeneration active — heal 10% max HP for your next 3 turns!");
    });
  }, [activatePower, phase, turn, patchPfx]);

  const surviveWith1HPPower = useCallback(() => {
    if (phase !== "battle" || turn !== "player") return;
    activateWeeklyPower("surviveWith1HPPowerUsedAt", () => {
      patchPfx({ surviveWith1HP: true });
      setLog("Last Breath ready — you'll survive a lethal hit with 1 HP!");
    });
  }, [activateWeeklyPower, phase, turn, patchPfx]);

  // Regeneration heals the player at the start of each of their own turns.
  useEffect(() => {
    if (turn === "player" && phase === "battle" && playerCard && (pfx.regenTurns || 0) > 0) {
      const healed = Math.round(maxHealth(playerCard) * 0.1);
      setPlayerHP((hp) => Math.min(maxHealth(playerCard) + (pfx.maxHPBonus || 0), hp + healed));
      patchPfx((p) => ({ ...p, regenTurns: Math.max(0, (p.regenTurns || 0) - 1) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turn]);

  // ---- Health category additions ----
  const heal20Power = useCallback(() => {
    if (phase !== "battle" || turn !== "player" || !playerCard) return;
    activatePower("heal20PowerUsedAt", () => {
      const max = maxHealth(playerCard) + (pfx.maxHPBonus || 0);
      setPlayerHP((hp) => Math.min(max, hp + Math.round(max * 0.2)));
      setLog("Healed 20% of your max HP!");
    });
  }, [activatePower, phase, turn, playerCard, pfx.maxHPBonus]);

  const heal50Power = useCallback(() => {
    if (phase !== "battle" || turn !== "player" || !playerCard) return;
    activatePower("heal50PowerUsedAt", () => {
      const max = maxHealth(playerCard) + (pfx.maxHPBonus || 0);
      setPlayerHP((hp) => Math.min(max, hp + Math.round(max * 0.5)));
      setLog("Healed 50% of your max HP!");
    });
  }, [activatePower, phase, turn, playerCard, pfx.maxHPBonus]);

  const fullRestorePower = useCallback(() => {
    if (phase !== "battle" || turn !== "player" || !playerCard) return;
    activateWeeklyPower("fullRestorePowerUsedAt", () => {
      setPlayerHP(maxHealth(playerCard) + (pfx.maxHPBonus || 0));
      setLog("Fully restored your card's HP!");
    });
  }, [activateWeeklyPower, phase, turn, playerCard, pfx.maxHPBonus]);

  const maxHPBoost25Power = useCallback(() => {
    if (phase !== "battle" || turn !== "player" || !playerCard) return;
    activatePower("maxHPBoostPowerUsedAt", () => {
      const extra = Math.round(maxHealth(playerCard) * 0.25);
      const newMax = maxHealth(playerCard) + (pfx.maxHPBonus || 0) + extra;
      patchPfx((p) => ({ ...p, maxHPBonus: (p.maxHPBonus || 0) + extra }));
      setPlayerHP(newMax);
      setLog("Max HP increased by 25% and fully restored for this battle!");
    });
  }, [activatePower, phase, turn, playerCard, pfx.maxHPBonus, patchPfx]);

  const restoreOnDefeatPower = useCallback(() => {
    if (phase !== "battle" || turn !== "player") return;
    activatePower("restoreOnDefeatPowerUsedAt", () => {
      patchPfx({ restoreOnDefeatActive: true });
      setLog("You'll now heal whenever you defeat an opponent's card!");
    });
  }, [activatePower, phase, turn, patchPfx]);

  const healOnDamagePower = useCallback(() => {
    if (phase !== "battle" || turn !== "player") return;
    activateWeeklyPower("healOnDamagePowerUsedAt", () => {
      patchPfx({ healOnDamageTurns: 3 });
      setLog("Vampiric Strikes active — heal 10% max HP for your next 3 hits!");
    });
  }, [activateWeeklyPower, phase, turn, patchPfx]);

  // ---- Control category additions ----
  const swapCardPower = useCallback(() => {
    if (phase !== "battle" || turn !== "player" || !playerCard) return;
    const nextCard = playerPool[0] || playerHand[0];
    if (!nextCard) return;
    activatePower("swapCardPowerUsedAt", () => {
      if (playerPool[0]) setPlayerPool((p) => [...p.slice(1), playerCard]);
      else setPlayerHand((h) => [...h.slice(1), playerCard]);
      setPlayerCard(nextCard);
      setPlayerHP(Math.round(maxHealth(nextCard) * 0.5));
      setPlayerEffects([]);
      setLog("Swapped your active card — the new card enters at 50% HP!");
    });
  }, [activatePower, phase, turn, playerCard, playerPool, playerHand]);

  const returnOpponentCardPower = useCallback(() => {
    if (phase !== "battle" || turn !== "player" || !aiCard) return;
    activatePower("returnOpponentCardPowerUsedAt", () => {
      const nextCard = aiPool[0];
      setAiPool((p) => (nextCard ? [...p.slice(1), aiCard] : p));
      setAiCard(nextCard || null);
      setAiHP(nextCard ? maxHealth(nextCard) : 0);
      setAiEffects([]);
      setLog("You returned the opponent's card to their deck!");
    });
  }, [activatePower, phase, turn, aiCard, aiPool]);

  const duplicateCardPower = useCallback(() => {
    if (phase !== "battle" || turn !== "player" || !playerCard) return;
    activateWeeklyPower("duplicateCardPowerUsedAt", () => {
      setPlayerPool((p) => [...p, { ...playerCard, id: `${playerCard.id}-dup-${Date.now()}` }]);
      setLog("Your card was duplicated into your deck!");
    });
  }, [activateWeeklyPower, phase, turn, playerCard]);

  // ---- Upgrade category additions ----
  const upgradeTierOneBattlePower = useCallback(() => {
    if (phase !== "battle" || turn !== "player" || !playerCard) return;
    activatePower("upgradeTierPowerUsedAt", () => {
      const newTier = Math.min(4, (playerCard.tier || 1) + 1);
      const stats = randomTierStats(newTier);
      setPlayerCard((c) => ({ ...c, tier: newTier, ...stats }));
      setLog(`Your card was upgraded to Tier ${newTier} for this battle!`);
    });
  }, [activatePower, phase, turn, playerCard]);

  const maximizeAttackPower = useCallback(() => {
    if (phase !== "battle" || turn !== "player" || !playerCard) return;
    activateWeeklyPower("maximizeAttackPowerUsedAt", () => {
      patchPfx({ maximizeAttackReady: true });
      setLog("Max Attack ready — your next attack uses maximum attack for its tier!");
    });
  }, [activateWeeklyPower, phase, turn, playerCard, patchPfx]);

  const maximizeDefensePower = useCallback(() => {
    if (phase !== "battle" || turn !== "player" || !playerCard) return;
    activateWeeklyPower("maximizeDefensePowerUsedAt", () => {
      patchPfx({ maximizeDefenseReady: true });
      setLog("Max Defense ready — your defense is maximized for the opponent's next attack!");
    });
  }, [activateWeeklyPower, phase, turn, playerCard, patchPfx]);

  const increaseAllStats20Power = useCallback(() => {
    if (phase !== "battle" || turn !== "player" || !playerCard) return;
    activatePremiumPower("increaseAllStatsOwned", () => {
      setPlayerCard((c) => (c ? { ...c, attack: Math.round(c.attack * 1.2), defense: Math.round(c.defense * 1.2) } : c));
      setLog("All stats increased by 20% for this battle!");
    });
  }, [activatePremiumPower, phase, turn, playerCard]);

  const increaseBonusDamage100Power = useCallback(() => {
    if (phase !== "battle" || turn !== "player" || !playerCard) return;
    activateDailyMultiPower("bonusDamage100PowerUsesToday", "bonusDamage100PowerResetAt", 5, () => {
      setPlayerCard((c) => (c ? { ...c, bonusDamage: (c.bonusDamage || 0) + 100 } : c));
      setLog("Bonus damage increased by 100!");
    });
  }, [activateDailyMultiPower, phase, turn, playerCard]);

  // ---- Legendary category additions ----
  const timeFreezePower = useCallback(() => {
    if (phase !== "battle" || turn !== "player") return;
    activatePremiumPower("timeFreezeOwned", () => {
      patchPfx({ timeFreezeQueued: true });
      setLog("Time Freeze activated — the opponent will skip their next turn!");
    });
  }, [activatePremiumPower, phase, turn, patchPfx]);

  const lastStandPower = useCallback(() => {
    if (phase !== "battle" || turn !== "player") return;
    activatePremiumPower("lastStandOwned", () => {
      patchPfx({ lastStandActive: true });
      setLog("Last Stand ready — if your card falls, it will strike one final time!");
    });
  }, [activatePremiumPower, phase, turn, patchPfx]);

  const berserkerRagePower = useCallback(() => {
    if (phase !== "battle" || turn !== "player") return;
    activatePremiumPower("berserkerRageOwned", () => {
      patchPfx({ berserkerRageActive: true });
      setLog("Berserker Rage activated — gain attack and lose defense each turn!");
    });
  }, [activatePremiumPower, phase, turn, patchPfx]);

  const divineProtectionPower = useCallback(() => {
    if (phase !== "battle" || turn !== "player") return;
    activatePremiumPower("divineProtectionOwned", () => {
      patchPfx({ divineProtectionTurns: 2 });
      setLog("Divine Protection active — immune to damage for 2 turns!");
    });
  }, [activatePremiumPower, phase, turn, patchPfx]);

  const phoenixRebirthPower = useCallback(() => {
    if (phase !== "battle" || turn !== "player") return;
    activatePremiumPower("phoenixRebirthOwned", () => {
      patchPfx({ phoenixRebirthAvailable: true });
      setLog("Phoenix Rebirth ready — you will revive with 75% HP if defeated!");
    });
  }, [activatePremiumPower, phase, turn, patchPfx]);

  const deckSurgePower = useCallback(() => {
    if (phase !== "battle" || turn !== "player") return;
    activatePremiumPower("deckSurgeOwned", () => {
      const boost = (c) => ({ ...c, attack: Math.round(c.attack * 1.1), defense: Math.round(c.defense * 1.1) });
      setPlayerPool((p) => p.map(boost));
      setPlayerHand((h) => h.map(boost));
      setLog("Deck Surge activated — all remaining cards gain +10% stats!");
    });
  }, [activatePremiumPower, phase, turn]);

  useEffect(() => {
    if (phase === "battle" && turn === "ai" && !busyRef.current) {
      const t = setTimeout(() => attack("ai"), 900);
      return () => clearTimeout(t);
    }
  }, [phase, turn, attack]);

  // Turn timer: the player has a limited time to attack, or they lose the turn.
  // Losing 3 turns in a row to the timer auto-forfeits the match.
  const handleTurnTimeout = useCallback(() => {
    if (phase !== "battle" || turn !== "player") return;
    const timeouts = consecutiveTimeoutsRef.current + 1;
    consecutiveTimeoutsRef.current = timeouts;
    if (timeouts >= MAX_CONSECUTIVE_TURN_TIMEOUTS) {
      setLog("You ran out of time 3 times in a row — you forfeit the match!");
      applyProgression("ai", score);
    } else {
      setLog(`Time's up! You lost your turn (${timeouts}/${MAX_CONSECUTIVE_TURN_TIMEOUTS} timeouts).`);
      setTurn("ai");
    }
  }, [phase, turn, score, applyProgression]);

  useEffect(() => {
    timeoutFiredRef.current = false;
    if (phase !== "battle" || turn !== "player") {
      setTurnTimeLeft(TURN_TIME_LIMIT_SECONDS);
      return;
    }
    setTurnTimeLeft(TURN_TIME_LIMIT_SECONDS);
    const interval = setInterval(() => {
      setTurnTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(interval);
          if (!timeoutFiredRef.current) {
            timeoutFiredRef.current = true;
            handleTurnTimeout();
          }
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [phase, turn, handleTurnTimeout]);

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
      if (card.isHybrid && !hybridChoicesRef.current[card.id]) {
        setPendingHybridCard(card);
        setPhase("chooseType");
        return;
      }
      const finalCard = card.isHybrid ? { ...card, type: hybridChoicesRef.current[card.id] } : card;
      setPlayerCard(finalCard);
      setPlayerHP(maxHealth(finalCard));
      setPlayerEffects([]);
      summonCountRef.current += 1;
      matchTypesRef.current.add(finalCard.type);
      roundMinHpRatioRef.current = 1;
    },
    [phase, playerCard]
  );

  // Hyper Rare (hybrid) cards let the player choose their elemental type once — locked for the rest of the match.
  const chooseHybridType = useCallback(
    (type) => {
      if (!pendingHybridCard) return;
      hybridChoicesRef.current[pendingHybridCard.id] = type;
      const finalCard = { ...pendingHybridCard, type };
      setPlayerCard(finalCard);
      setPlayerHP(maxHealth(finalCard));
      setPlayerEffects([]);
      summonCountRef.current += 1;
      matchTypesRef.current.add(type);
      roundMinHpRatioRef.current = 1;
      setPendingHybridCard(null);
      setPhase("draw");
    },
    [pendingHybridCard]
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

  // If either side has no active card, no cards left in hand, and no cards left in the
  // deck to draw, they have no way to continue and lose the match.
  useEffect(() => {
    if (phase !== "draw" || matchResult || !aiPoolLoaded) return;
    const playerOut = !playerCard && playerHand.length === 0 && playerPool.length === 0;
    const aiOut = !aiCard && aiPool.length === 0;
    if (playerOut) {
      setLog("You ran out of cards — you lose the match!");
      applyProgression("ai", score);
    } else if (aiOut) {
      setLog("The opponent ran out of cards — you win the match!");
      applyProgression("player", score);
    }
  }, [phase, playerCard, playerHand, playerPool, aiCard, aiPool, aiPoolLoaded, matchResult, score, applyProgression]);

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
    if (skipRewards || settledRef.current) return;
    settledRef.current = true;
    try {
      const { data } = await base44.functions.invoke("finalizeAIBattle", {
        matchId: matchIdRef.current,
        winner: "ai",
        forfeited: true,
        difficulty,
        score,
        cardsDefeated: defeatedCountRef.current,
        damageDealt: matchDamageRef.current,
        blocksUsed: matchBlocksRef.current,
        distinctTypes: matchTypesRef.current.size,
        durationSeconds: Math.round((Date.now() - matchStartRef.current) / 1000),
        summonCount: summonCountRef.current,
        cardDeltas: [],
      });
      if (data?.user) {
        setUser(data.user);
        window.dispatchEvent(new CustomEvent("coins-claimed", { detail: { newTotal: data.user.coins } }));
      }
    } catch (err) {
      // best-effort: the UI still navigates away after this returns
    }
  }, [skipRewards, difficulty, score]);

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

  const noReq = !powerUsedThisTurn && phase === "battle" && turn === "player";

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
    coinsBreakdown,
    drawHand,
    playCard,
    attack,
    pickRps,
    graveyardCards,
    turnTimeLeft,
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
    playerMaxHP: playerCard ? maxHealth(playerCard) + (pfx.maxHPBonus || 0) : 0,
    playerHpRatio: playerCard ? Math.max(0, playerHP / (maxHealth(playerCard) + (pfx.maxHPBonus || 0))) : 1,
    aiHpRatio: aiCard ? Math.max(0, aiHP / maxHealth(aiCard)) : 1,
    canUseMap: {
      burn: noReq && !!aiCard && aiPool.length > 0,
      reshuffle: !powerUsedThisTurn && ((!playerCard && playerHand.length > 0) || (phase === "battle" && turn === "player" && !!aiCard && aiPool.length > 0)),
      doubleAttack: noReq,
      defense: noReq,
      block: noReq,
      halfAttack: noReq && !!aiCard,
      t2Upgrade: noReq && !!playerCard,
      t3Upgrade: noReq && !!playerCard,
      t4Upgrade: noReq && !!playerCard,
      ignoreDefense: noReq,
      trueDamage: noReq,
      critHit: noReq,
      doubleBonusDamage: noReq,
      attackTwice: noReq,
      tripleDefense1Turn: noReq,
      doubleDefense2Turns: noReq,
      shield25: noReq && !!playerCard,
      negateNextAttack: noReq,
      reduceDamage50: noReq,
      reflectDamage25: noReq,
      regen10Percent3Turns: noReq,
      surviveWith1HP: noReq,
      heal20: noReq && !!playerCard,
      heal50: noReq && !!playerCard,
      fullRestore: noReq && !!playerCard,
      maxHPBoost25: noReq && !!playerCard,
      restoreOnDefeat: noReq,
      healOnDamage10_3Turns: noReq,
      swapActiveCard50HP: noReq && !!playerCard && (playerPool.length > 0 || playerHand.length > 0),
      returnOpponentCard: noReq && !!aiCard,
      duplicateCard: noReq && !!playerCard,
      upgradeTierOneBattle: noReq && !!playerCard,
      maximizeAttackTurn: noReq && !!playerCard,
      maximizeDefenseTurn: noReq && !!playerCard,
      increaseAllStats20: noReq && !!playerCard,
      increaseBonusDamage100: noReq && !!playerCard,
      timeFreeze: noReq,
      lastStand: noReq,
      berserkerRage: noReq,
      divineProtection: noReq,
      phoenixRebirth: noReq,
      deckSurge: noReq,
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
      ignoreDefense: ignoreDefensePower,
      trueDamage: trueDamagePower,
      critHit: critHitPower,
      doubleBonusDamage: doubleBonusDamagePower,
      attackTwice: attackTwicePower,
      tripleDefense1Turn: tripleDefense1TurnPower,
      doubleDefense2Turns: doubleDefense2TurnsPower,
      shield25: shield25Power,
      negateNextAttack: negateNextAttackPower,
      reduceDamage50: reduceDamage50Power,
      reflectDamage25: reflectDamage25Power,
      regen10Percent3Turns: regenPower,
      surviveWith1HP: surviveWith1HPPower,
      heal20: heal20Power,
      heal50: heal50Power,
      fullRestore: fullRestorePower,
      maxHPBoost25: maxHPBoost25Power,
      restoreOnDefeat: restoreOnDefeatPower,
      healOnDamage10_3Turns: healOnDamagePower,
      swapActiveCard50HP: swapCardPower,
      returnOpponentCard: returnOpponentCardPower,
      duplicateCard: duplicateCardPower,
      upgradeTierOneBattle: upgradeTierOneBattlePower,
      maximizeAttackTurn: maximizeAttackPower,
      maximizeDefenseTurn: maximizeDefensePower,
      increaseAllStats20: increaseAllStats20Power,
      increaseBonusDamage100: increaseBonusDamage100Power,
      timeFreeze: timeFreezePower,
      lastStand: lastStandPower,
      berserkerRage: berserkerRagePower,
      divineProtection: divineProtectionPower,
      phoenixRebirth: phoenixRebirthPower,
      deckSurge: deckSurgePower,
    },
    canRedrawHand: !playerCard && playerHand.length > 0,
    canForceOpponentRedraw: phase === "battle" && turn === "player" && !!aiCard && aiPool.length > 0,
    reshuffleModalOpen,
    openReshuffle,
    closeReshuffle,
    redrawHandPower,
    forceOpponentRedrawPower,
    forfeitMatch,
    pendingHybridCard,
    chooseHybridType,
  };
}