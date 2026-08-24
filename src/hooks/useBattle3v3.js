import { useState, useRef, useEffect, useCallback } from "react";
import { computeDamage, maxHealth } from "@/lib/battleEngine";
import { generateRandomCard } from "@/lib/cardGenerator";
import {
  AI_OPPONENT_NAMES,
  AI_DIFFICULTY_TIERS,
  DEFAULT_ACTIVE_POWERUPS,
  TURN_TIME_LIMIT_SECONDS,
  MAX_CONSECUTIVE_TURN_TIMEOUTS,
} from "@/lib/gameConstants";
import { isTimestampReady, DAY_MS } from "@/lib/powerUps";
import { base44 } from "@/api/base44Client";
import { play } from "@/lib/soundEngine";

const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const randomFrom = (arr) => arr[Math.floor(Math.random() * arr.length)];
const STARTING_LIVES = 5;
const ACTIVE_SLOTS = 3;
const INITIAL_HAND = 5;

// Power-ups supported in 3v3. Others in a user's loadout are hidden (not available
// in this mode) so the bar only ever shows working buttons.
export const SUPPORTED_3V3_POWERS = ["burn", "doubleAttack", "defense", "block", "heal20"];

function makeHp(card) {
  return { card, hp: maxHealth(card), maxHp: maxHealth(card) };
}

export default function useBattle3v3(playerCards, onMatchEnd, difficulty = "Normal", options = {}) {
  const { skipRewards = false, aiPoolOverride } = options;
  const [opponentName] = useState(() => randomFrom(AI_OPPONENT_NAMES));

  const [playerPool, setPlayerPool] = useState(() => shuffle(playerCards));
  const [aiPool, setAiPool] = useState([]);
  const [aiPoolLoaded, setAiPoolLoaded] = useState(false);

  const [selectionHand, setSelectionHand] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [playerSlots, setPlayerSlots] = useState([null, null, null]);
  const [aiSlots, setAiSlots] = useState([null, null, null]);
  const [playerLives, setPlayerLives] = useState(STARTING_LIVES);
  const [aiLives, setAiLives] = useState(STARTING_LIVES);

  const [phase, setPhase] = useState("setup"); // setup | battle | replace | matchEnd
  const [turn, setTurn] = useState(null);
  const [attackerIdx, setAttackerIdx] = useState(null);
  const [targetIdx, setTargetIdx] = useState(null);
  const [effect, setEffect] = useState(null);
  const [log, setLog] = useState("Choose 3 cards to bring into battle!");
  const [matchResult, setMatchResult] = useState(null);
  const [coinsBreakdown, setCoinsBreakdown] = useState(null);
  const [replaceSlotIdx, setReplaceSlotIdx] = useState(null);
  const [replaceChoices, setReplaceChoices] = useState([]);
  const [aiThinking, setAiThinking] = useState(false);
  const [turnTimeLeft, setTurnTimeLeft] = useState(TURN_TIME_LIMIT_SECONDS);

  const [user, setUser] = useState(null);
  const [doubleAttackActive, setDoubleAttackActive] = useState(false);
  // per-slot reactive buffs: { defenseMult, block, shield }
  const [playerBuffs, setPlayerBuffs] = useState([{}, {}, {}]);
  // per-enemy-slot debuffs: { halfAttackTurns }
  const [aiDebuffs, setAiDebuffs] = useState([{}, {}, {}]);

  const [powerUsedThisTurn, setPowerUsedThisTurn] = useState(false);

  const busyRef = useRef(false);
  const playerPoolRef = useRef([]);
  useEffect(() => { playerPoolRef.current = playerPool; }, [playerPool]);
  const matchIdRef = useRef(null);
  const settledRef = useRef(false);
  const consecutiveTimeoutsRef = useRef(0);
  const timeoutFiredRef = useRef(false);
  const statsRef = useRef({});
  const matchStartRef = useRef(Date.now());
  const matchDamageRef = useRef(0);
  const matchTypesRef = useRef(new Set());
  const summonCountRef = useRef(0);
  const defeatedCountRef = useRef(0);
  const matchBlocksRef = useRef(0);

  // ---- Load user + AI pool ----
  useEffect(() => {
    (async () => {
      const me = await base44.auth.me();
      setUser(me);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (aiPoolOverride) {
        const p = shuffle(aiPoolOverride).slice(0, 15);
        setAiPool(p);
        setAiPoolLoaded(true);
        dealInitialHands(shuffle(playerCards), p);
        return;
      }
      let deck = await base44.entities.AiDeckCard.filter({ difficulty });
      if (deck.length === 0) {
        const tiers = AI_DIFFICULTY_TIERS[difficulty] || AI_DIFFICULTY_TIERS.Normal;
        deck = Array.from({ length: 15 }, () => generateRandomCard(randomFrom(tiers)));
      }
      const p = shuffle(deck).slice(0, 15);
      setAiPool(p);
      setAiPoolLoaded(true);
      dealInitialHands(shuffle(playerCards), p);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [difficulty, aiPoolOverride]);

  // deal 5 to each side for the opening selection; remaining stay in the pools
  const dealInitialHands = (playerFull, aiFull) => {
    setSelectionHand(playerFull.slice(0, INITIAL_HAND));
    setPlayerPool(playerFull.slice(INITIAL_HAND));
    // Keep the full 15-card AI deck; 5 are dealt and 3 chosen when the player confirms.
    setAiPool(aiFull);
    setAiSlots([null, null, null]);
  };

  // ---- Start server-side AI match session (idempotency key for finalize) ----
  useEffect(() => {
    if (skipRewards) return;
    let cancelled = false;
    (async () => {
      try {
        const id = crypto.randomUUID();
        matchIdRef.current = id;
        await base44.functions.invoke("startAiMatch", {
          matchId: id,
          difficulty,
          opponentName,
          gameMode: "3v3",
        });
      } catch (e) {
        /* best-effort */
      }
      cancelled = true;
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [difficulty, opponentName, skipRewards]);

  const recordStat = (cardId, won) => {
    if (!statsRef.current[cardId]) statsRef.current[cardId] = { gamesPlayed: 0, totalWins: 0 };
    statsRef.current[cardId].gamesPlayed += 1;
    if (won) statsRef.current[cardId].totalWins += 1;
  };

  // ---- Open selection: toggle / confirm ----
  const toggleSelect = useCallback((id) => {
    setSelectedIds((ids) => {
      if (ids.includes(id)) return ids.filter((x) => x !== id);
      if (ids.length >= ACTIVE_SLOTS) return ids;
      return [...ids, id];
    });
  }, []);

  const confirmSelect3 = useCallback(() => {
    if (selectedIds.length !== ACTIVE_SLOTS) return;
    const chosen = selectionHand.filter((c) => selectedIds.includes(c.id));
    const returned = selectionHand.filter((c) => !selectedIds.includes(c.id));
    setPlayerPool((p) => [...returned, ...p]);
    const slots = chosen.map(makeHp);
    setPlayerSlots(slots);
    summonCountRef.current = ACTIVE_SLOTS;
    chosen.forEach((c) => matchTypesRef.current.add(c.type));

    // AI picks 3 of its first 5 at random; the 2 un-chosen return to its pool so they
    // are not duplicated as replacements later.
    const aiHand = aiPool.slice(0, INITIAL_HAND);
    const aiChosen = shuffle(aiHand).slice(0, ACTIVE_SLOTS);
    const aiReturned = aiHand.filter((c) => !aiChosen.includes(c));
    const aiThree = aiChosen.map(makeHp);
    setAiSlots(aiThree);
    setAiPool([...aiReturned, ...aiPool.slice(INITIAL_HAND)]);

    const first = Math.random() < 0.5 ? "player" : "ai";
    setTurn(first);
    setPhase("battle");
    setLog(first === "player" ? "You strike first! Select a card to attack with." : "AI strikes first...");
    play("card_flip");
  }, [selectedIds, selectionHand, aiPool, aiPoolOverride]);

  // ---- Targeting ----
  const selectAttacker = useCallback((idx) => {
    if (phase !== "battle" || turn !== "player" || busyRef.current) return;
    if (!playerSlots[idx]) return;
    setAttackerIdx((cur) => (cur === idx ? null : idx));
    setTargetIdx(null);
  }, [phase, turn, playerSlots]);

  const selectTarget = useCallback((idx) => {
    if (phase !== "battle" || turn !== "player" || busyRef.current) return;
    if (attackerIdx === null || !aiSlots[idx]) return;
    setTargetIdx(idx);
  }, [phase, turn, attackerIdx, aiSlots]);

  // ---- Settlement ----
  const applyProgression = useCallback(
    async (winner) => {
      if (settledRef.current) return;
      settledRef.current = true;
      setPhase("matchEnd");
      setMatchResult(winner);
      // Win/lose SFX is played by the shared MatchEndModal when it mounts, so the
      // sound lines up with the popup appearing (and stays consistent across
      // 1v1 + 3v3). Story mode (skipRewards, which uses its own end screen, not
      // MatchEndModal) still gets its audio via the match-end hook for 1v1 story.
      if (skipRewards) play(winner === "player" ? "win" : "lose");
      if (skipRewards) {
        setCoinsBreakdown(null);
        if (onMatchEnd) onMatchEnd(winner);
        return;
      }
      const cardDeltas = [];
      for (const card of playerCards) {
        const d = statsRef.current[card.id];
        if (!d) continue;
        cardDeltas.push({
          cardId: card.id,
          gamesPlayed: Math.min(5, d.gamesPlayed),
          winsVsBonus: 0,
          winsVsNonBonus: Math.min(5, d.totalWins),
          totalWins: d.totalWins,
          matchWin: winner === "player",
        });
      }
      try {
        const { data } = await base44.functions.invoke("finalizeAIBattle", {
          matchId: matchIdRef.current,
          winner,
          difficulty,
          score: { player: STARTING_LIVES - aiLives, ai: STARTING_LIVES - playerLives },
          cardsDefeated: defeatedCountRef.current,
          damageDealt: matchDamageRef.current,
          blocksUsed: matchBlocksRef.current,
          distinctTypes: matchTypesRef.current.size,
          durationSeconds: Math.round((Date.now() - matchStartRef.current) / 1000),
          summonCount: summonCountRef.current,
          finalWinHP: null,
          comeback: false,
          higherTierDefeat: false,
          cardDeltas,
          forfeited: false,
          gameMode: "3v3",
        });
        if (data?.user) {
          setUser(data.user);
          if (winner === "player") window.dispatchEvent(new CustomEvent("coins-claimed", { detail: { newTotal: data.user.coins } }));
        }
        setCoinsBreakdown(data?.breakdown || null);
      } catch (err) {
        setCoinsBreakdown(null);
      }
      if (onMatchEnd) onMatchEnd(winner);
    },
    [playerCards, onMatchEnd, difficulty, skipRewards, aiLives, playerLives]
  );

  // ---- Refill an empty AI slot from its pool (best-stats pick) ----
  const refillAiSlot = useCallback((idx) => {
    setAiPool((pool) => {
      if (pool.length === 0) return pool;
      const bestIdx = pool.reduce((bi, c, i, a) => (c.attack + c.defense > a[bi].attack + a[bi].defense ? i : bi), 0);
      const picked = pool[bestIdx];
      setAiSlots((slots) => {
        const next = [...slots];
        next[idx] = makeHp(picked);
        return next;
      });
      setAiDebuffs((d) => {
        const next = [...d];
        next[idx] = {};
        return next;
      });
      return pool.filter((_, i) => i !== bestIdx);
    });
  }, []);

  // ---- Core attack resolver ----
  const executeAttack = useCallback(
    async (attackerSide, timingMultiplier = 1) => {
      if (busyRef.current) return;
      busyRef.current = true;
      setAiThinking(false);
      play("attack");
      if (attackerSide === "player") consecutiveTimeoutsRef.current = 0;

      const aIdx = attackerSide === "player" ? attackerIdx : null;
      const tIdx = attackerSide === "player" ? targetIdx : null;
      // For AI, pick attacker + target now
      let aiAttackerIdx = null;
      let aiTargetIdx = null;
      if (attackerSide === "ai") {
        const aLive = aiSlots.map((s, i) => (s ? i : -1)).filter((i) => i >= 0);
        // weighted strongest
        aiAttackerIdx = aLive.reduce((bi, i) => {
          if (bi === -1) return i;
          return aiSlots[i].card.attack + aiSlots[i].card.defense > aiSlots[bi].card.attack + aiSlots[bi].card.defense ? i : bi;
        }, -1);
        if (aiAttackerIdx === -1) { busyRef.current = false; return; }
        const pLive = playerSlots.map((s, i) => (s ? i : -1)).filter((i) => i >= 0);
        // 70% weakest hp, 30% random
        if (Math.random() < 0.7) {
          aiTargetIdx = pLive.reduce((bi, i) => (playerSlots[i].hp < playerSlots[bi].hp ? i : bi), pLive[0]);
        } else {
          aiTargetIdx = randomFrom(pLive);
        }
      }

      const aSlot = attackerSide === "player" ? playerSlots[aIdx] : aiSlots[aiAttackerIdx];
      const tSlot = attackerSide === "player" ? aiSlots[tIdx] : playerSlots[aiTargetIdx];
      if (!aSlot || !tSlot) { busyRef.current = false; return; }

      let attacker = aSlot.card;
      let defender = tSlot.card;

      const usingDouble = attackerSide === "player" && doubleAttackActive;
      const halfTurns = attackerSide === "ai" ? (aiDebuffs[aiAttackerIdx]?.halfAttackTurns || 0) : 0;
      if (halfTurns > 0) attacker = { ...attacker, attack: Math.round(attacker.attack * 0.5) };

      // player defensive buffs on the targeted card
      let defenseMultiplier = 1;
      let blocked = false;
      if (attackerSide === "ai") {
        const buff = playerBuffs[aiTargetIdx] || {};
        if (buff.block) blocked = true;
        else if (buff.defenseMult) defenseMultiplier = buff.defenseMult;
      }

      const result = blocked
        ? { tie: false, recoil: false, damage: 0, isCrit: false }
        : computeDamage(attacker, defender, usingDouble ? 2 : 1, defenseMultiplier, {});

      if (usingDouble) setDoubleAttackActive(false);
      if (attackerSide === "ai" && halfTurns > 0) {
        setAiDebuffs((d) => {
          const next = [...d];
          next[aiAttackerIdx] = { ...next[aiAttackerIdx], halfAttackTurns: halfTurns - 1 };
          return next;
        });
      }
      if (attackerSide === "ai") {
        const buff = playerBuffs[aiTargetIdx] || {};
        if (buff.block) {
          setPlayerBuffs((b) => {
            const next = [...b];
            next[aiTargetIdx] = { ...next[aiTargetIdx], block: false };
            return next;
          });
          matchBlocksRef.current += 1;
        } else if (buff.defenseMult) {
          setPlayerBuffs((b) => {
            const next = [...b];
            next[aiTargetIdx] = { ...next[aiTargetIdx], defenseMult: 0 };
            return next;
          });
        }
      }

      const damage = result.damage;
      const targetSide = result.recoil ? attackerSide : attackerSide === "player" ? "ai" : "player";
      const effFrom = attackerSide === "player" ? aIdx : aiAttackerIdx;
      const effTo = attackerSide === "player" ? tIdx : aiTargetIdx;
      setEffect({ from: effFrom, to: effTo, side: attackerSide, value: damage, blocked, crit: result.isCrit, recoil: result.recoil, key: Date.now() });

      if (attackerSide === "player") recordStat(attacker.id, false);
      if (damage > 0 && attackerSide === "player") matchDamageRef.current += damage;

      await sleep(700);
      setEffect(null);

      const newTargetHp = Math.max(0, tSlot.hp - damage);
      const targetSlotsSet = attackerSide === "player" ? setAiSlots : setPlayerSlots;
      targetSlotsSet((slots) => {
        const next = [...slots];
        const ti = attackerSide === "player" ? tIdx : aiTargetIdx;
        if (next[ti]) next[ti] = { ...next[ti], hp: newTargetHp };
        return next;
      });

      await sleep(400);

      if (newTargetHp <= 0) {
        play("card_defeat");
        defeatedCountRef.current += 1;
        const defeatedSide = attackerSide === "player" ? "ai" : "player";
        const defeatedSlotIdx = attackerSide === "player" ? tIdx : aiTargetIdx;
        if (attackerSide === "player") recordStat(attacker.id, true);
        if (attackerSide === "ai" && defeatedSide === "player") matchBlocksRef.current += 0;

        if (defeatedSide === "ai") {
          // remove card, lose a life, AI auto-replaces
          setAiLives((l) => l - 1);
          setAiSlots((slots) => {
            const next = [...slots];
            next[defeatedSlotIdx] = null;
            return next;
          });
          setAiDebuffs((d) => {
            const next = [...d];
            next[defeatedSlotIdx] = {};
            return next;
          });
          await sleep(500);
          refillAiSlot(defeatedSlotIdx);
        } else {
          // player card defeated: lose a life, open replacement picker
          setPlayerLives((l) => l - 1);
          setPlayerSlots((slots) => {
            const next = [...slots];
            next[defeatedSlotIdx] = null;
            return next;
          });
          setPlayerBuffs((b) => {
            const next = [...b];
            next[defeatedSlotIdx] = {};
            return next;
          });
          const ended = playerLives - 1 <= 0;
          if (!ended) {
            // Offer replacement choices now (from the ref) so the modal is populated
            // the moment it appears — avoids an effect race that skipped the picker.
            const pool = playerPoolRef.current || [];
            const choices = shuffle(pool).slice(0, 3);
            setPlayerPool(pool.filter((c) => !choices.includes(c)));
            setReplaceChoices(choices);
            setReplaceSlotIdx(defeatedSlotIdx);
            setPhase("replace");
            setLog("A card was defeated — choose a replacement!");
            busyRef.current = false;
            return;
          }
        }
      }

      // Check match end
      const pLivesAfter = attackerSide === "ai" && newTargetHp <= 0 ? playerLives - 1 : playerLives;
      const aLivesAfter = attackerSide === "player" && newTargetHp <= 0 ? aiLives - 1 : aiLives;
      if (pLivesAfter <= 0) { await applyProgression("ai"); busyRef.current = false; return; }
      if (aLivesAfter <= 0) { await applyProgression("player"); busyRef.current = false; return; }

      // Double Attack: player gets a second attack on the same turn
      if (attackerSide === "player" && doubleAttackActive === false && false) {
        /* placeholder */
      }

      setAttackerIdx(null);
      setTargetIdx(null);
      setTurn(attackerSide === "player" ? "ai" : "player");
      setLog(attackerSide === "player" ? "AI's turn..." : "Your turn — select a card to attack with!");
      busyRef.current = false;
    },
    [attackerIdx, targetIdx, playerSlots, aiSlots, playerBuffs, aiDebuffs, doubleAttackActive, aiLives, playerLives, applyProgression, refillAiSlot]
  );

  const playerAttack = useCallback(
    (timingMultiplier = 1) => {
      if (attackerIdx === null || targetIdx === null) return;
      executeAttack("player", timingMultiplier);
    },
    [attackerIdx, targetIdx, executeAttack]
  );

  // ---- Replacement picker (player) ----
  const pickReplacement = useCallback(
    (card) => {
      setPlayerSlots((slots) => {
        const next = [...slots];
        if (card) next[replaceSlotIdx] = makeHp(card);
        return next;
      });
      if (card) {
        matchTypesRef.current.add(card.type);
        summonCountRef.current += 1;
      }
      setReplaceSlotIdx(null);
      setReplaceChoices([]);
      setPhase("battle");
      setTurn("player");
      setLog(card ? "Replacement deployed! Your turn — attack!" : "No reinforcements left — your turn!");
    },
    [replaceSlotIdx]
  );

  // ---- AI turn driver ----
  useEffect(() => {
    if (phase === "battle" && turn === "ai" && !busyRef.current) {
      setAiThinking(true);
      const t = setTimeout(() => executeAttack("ai", 1), 900);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, turn, executeAttack]);

  // ---- Turn timer (player) ----
  const handleTurnTimeout = useCallback(() => {
    if (phase !== "battle" || turn !== "player") return;
    const to = consecutiveTimeoutsRef.current + 1;
    consecutiveTimeoutsRef.current = to;
    if (to >= MAX_CONSECUTIVE_TURN_TIMEOUTS) {
      setLog("You ran out of time 3 times — you forfeit the match!");
      applyProgression("ai");
    } else {
      setLog(`Time's up! Turn skipped (${to}/${MAX_CONSECUTIVE_TURN_TIMEOUTS}).`);
      setAttackerIdx(null);
      setTargetIdx(null);
      setTurn("ai");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, turn, applyProgression]);

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

  useEffect(() => {
    if (turn === "player") setPowerUsedThisTurn(false);
  }, [turn]);

  // ---- Power-ups (3v3 supported set) ----
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

  const canUse = (req) => !powerUsedThisTurn && phase === "battle" && turn === "player" && req;

  const burnPower = useCallback(() => {
    if (targetIdx === null || !aiSlots[targetIdx]) return;
    activatePower("burnPowerUsedAt", () => {
      setAiLives((l) => l); // no life lost
      setAiSlots((slots) => {
        const next = [...slots];
        next[targetIdx] = null;
        return next;
      });
      setAiDebuffs((d) => {
        const next = [...d];
        next[targetIdx] = {};
        return next;
      });
      setLog("Burn! The targeted enemy card was destroyed (no life lost).");
      setTimeout(() => refillAiSlot(targetIdx), 500);
    });
  }, [activatePower, targetIdx, aiSlots, refillAiSlot]);

  const doubleAttackPower = useCallback(() => {
    if (!canUse(attackerIdx !== null)) return;
    activatePower("doubleAttackPowerUsedAt", () => {
      setDoubleAttackActive(true);
      setLog("Double Attack ready — your next strike deals double damage!");
    });
  }, [activatePower, attackerIdx, phase, turn, powerUsedThisTurn]);

  const defensePower = useCallback(() => {
    if (!canUse(attackerIdx !== null)) return;
    activatePower("defensePowerUsedAt", () => {
      setPlayerBuffs((b) => {
        const next = [...b];
        next[attackerIdx] = { ...next[attackerIdx], defenseMult: 3 };
        return next;
      });
      setLog("Triple Defense ready on your selected card!");
    });
  }, [activatePower, attackerIdx, phase, turn, powerUsedThisTurn]);

  const blockPower = useCallback(() => {
    if (!canUse(attackerIdx !== null)) return;
    activatePower("blockPowerUsedAt", () => {
      setPlayerBuffs((b) => {
        const next = [...b];
        next[attackerIdx] = { ...next[attackerIdx], block: true };
        return next;
      });
      setLog("Block ready on your selected card!");
    });
  }, [activatePower, attackerIdx, phase, turn, powerUsedThisTurn]);

  const heal20Power = useCallback(() => {
    if (!canUse(attackerIdx !== null && playerSlots[attackerIdx])) return;
    activatePower("heal20PowerUsedAt", () => {
      setPlayerSlots((slots) => {
        const next = [...slots];
        const s = next[attackerIdx];
        next[attackerIdx] = { ...s, hp: Math.min(s.maxHp, s.hp + Math.round(s.maxHp * 0.2)) };
        return next;
      });
      setLog("Healed 20% HP on your selected card!");
    });
  }, [activatePower, attackerIdx, playerSlots, phase, turn, powerUsedThisTurn]);

  const forfeitMatch = useCallback(async () => {
    if (skipRewards || settledRef.current) return;
    settledRef.current = true;
    play("lose");
    try {
      const { data } = await base44.functions.invoke("finalizeAIBattle", {
        matchId: matchIdRef.current,
        winner: "ai",
        forfeited: true,
        difficulty,
        score: { player: STARTING_LIVES - aiLives, ai: STARTING_LIVES - playerLives },
        cardsDefeated: defeatedCountRef.current,
        damageDealt: matchDamageRef.current,
        blocksUsed: matchBlocksRef.current,
        distinctTypes: matchTypesRef.current.size,
        durationSeconds: Math.round((Date.now() - matchStartRef.current) / 1000),
        summonCount: summonCountRef.current,
        cardDeltas: [],
        gameMode: "3v3",
      });
      if (data?.user) setUser(data.user);
    } catch (e) {
      /* best-effort */
    }
  }, [skipRewards, difficulty, aiLives, playerLives]);

  const handlers = {
    burn: burnPower,
    doubleAttack: doubleAttackPower,
    defense: defensePower,
    block: blockPower,
    heal20: heal20Power,
  };

  // 3v3 always exposes the full supported power-up set for this mode, independent
  // of the 4-card loadout the user picked for 1v1 on the Power Ups screen (that
  // loadout is a 1v1 concept). Each power is still subject to its own daily /
  // multi-use cooldown via PowerButtons' availability check, so used powers show
  // disabled & greyed until they reset — matching the enabled/disabled UX in 1v1.
  const finalActive = [...SUPPORTED_3V3_POWERS];

  const noReq = !powerUsedThisTurn && phase === "battle" && turn === "player";
  const canUseMap = {
    burn: noReq && targetIdx !== null && !!aiSlots[targetIdx],
    doubleAttack: noReq && attackerIdx !== null,
    defense: noReq && attackerIdx !== null && !!playerSlots[attackerIdx],
    block: noReq && attackerIdx !== null && !!playerSlots[attackerIdx],
    heal20: noReq && attackerIdx !== null && !!playerSlots[attackerIdx],
  };

  return {
    phase, turn, log, effect,
    selectionHand, selectedIds, toggleSelect, confirmSelect3,
    playerSlots, aiSlots, playerLives, aiLives,
    playerBuffs, aiDebuffs,
    attackerIdx, targetIdx, selectAttacker, selectTarget,
    playerAttack, aiThinking,
    matchResult, coinsBreakdown,
    user, activePowerUps: finalActive, canUseMap, handlers,
    powerUsedThisTurn, doubleAttackActive,
    replaceSlotIdx, replaceChoices, pickReplacement,
    turnTimeLeft, forfeitMatch, opponentName,
    playerRemaining: playerPool.length,
  };
}