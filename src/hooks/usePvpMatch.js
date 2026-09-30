import { useEffect, useState, useCallback, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { computeDamage, maxHealth } from "@/lib/battleEngine";
import { TIER_RANGES, DEFAULT_ACTIVE_POWERUPS, TURN_TIME_LIMIT_SECONDS, MAX_CONSECUTIVE_TURN_TIMEOUTS } from "@/lib/gameConstants";
import { isTimestampReady, dailyMultiRemaining, DAY_MS, WEEK_MS } from "@/lib/powerUps";
import { play } from "@/lib/soundEngine";
import { getRankIndex } from "@/lib/rankSystem";

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

// How long an optimistic write stays overlaid on incoming server snapshots
// before we give up waiting for a confirming echo and trust the server instead.
// Covers a dropped socket / failed persist without permanently desyncing state.
const PENDING_TIMEOUT_MS = 6000;

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
  const [effect, setEffect] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const prevHpRef = useRef({ my: null, opp: null, round: null });
  const finalizedRef = useRef(false);
  // Mirror of `match` for use inside event callbacks (subscribe/poll) so they
  // always read the latest committed state without stale closures.
  const matchRef = useRef(null);
  // Per-field optimistic writes awaiting server confirmation: { fieldName: { value, issuedAt } }.
  // Lets us overlay our own pending values on top of a stale server snapshot so
  // an out-of-order poll can never revert HP/score/turn/card fields we just wrote.
  const pendingWritesRef = useRef({});
  // Guards `attack` against a rapid second tap re-entering with a stale `match`
  // (turn still reads as mine) before the first call flips the turn — which would
  // compute damage a second time against the old HP and double-apply it.
  const attackInFlightRef = useRef(false);

  useEffect(() => {
    (async () => {
      const me = await base44.auth.me();
      setMyId(me.id);
      setUser(me);
      const matches = await base44.entities.PvpMatch.filter({ code: matchCode });
      const initial = matches[0] || null;
      matchRef.current = initial;
      setMatch(initial);
    })();
  }, [matchCode]);

  // Keep matchRef in sync with the latest committed match state so event
  // callbacks (subscribe/poll) always read current values without stale closures.
  useEffect(() => {
    matchRef.current = match;
  }, [match]);

  // Reconcile an incoming server snapshot against any optimistic writes we have
  // outstanding. A realtime push and the 1.5s poll can land out of order, and a
  // poll in flight can resolve with a snapshot taken BEFORE a write we already
  // applied locally. Naively replacing state with that snapshot makes HP/card
  // fields briefly revert — which the hit-detection effect misreads as a real
  // attack (bogus damage number) and can re-trigger a drop a second time once
  // the correct snapshot arrives (duplicate effect). We instead overlay every
  // still-pending optimistic field on top of the server snapshot, so our own
  // unconfirmed writes can never be reverted. A pending field is dropped the
  // moment the server echoes back the same value (confirmed), or after
  // PENDING_TIMEOUT_MS if no echo ever arrives (lost write — trust the server).
  const applyIncoming = useCallback((incoming) => {
    if (!incoming) return;
    const prev = matchRef.current;
    if (!prev || prev.id !== incoming.id) {
      pendingWritesRef.current = {};
      setSyncing(false);
      matchRef.current = incoming;
      setMatch(incoming);
      return;
    }
    const pending = pendingWritesRef.current;
    if (Object.keys(pending).length === 0) {
      const prevTime = new Date(prev.updated_date || prev.created_date).getTime();
      const incTime = new Date(incoming.updated_date || incoming.created_date).getTime();
      if (incTime < prevTime) return; // stale snapshot, ignore
      matchRef.current = incoming;
      setMatch(incoming);
      return;
    }
    const now = Date.now();
    const reconciled = { ...incoming };
    const remaining = {};
    for (const [k, entry] of Object.entries(pending)) {
      const confirmed = JSON.stringify(incoming[k]) === JSON.stringify(entry.value);
      const expired = now - entry.issuedAt > PENDING_TIMEOUT_MS;
      if (confirmed || expired) continue; // server caught up (or gave up) — drop overlay
      reconciled[k] = entry.value; // keep our optimistic value on top of the stale snapshot
      remaining[k] = entry;
    }
    pendingWritesRef.current = remaining;
    setSyncing(Object.keys(remaining).length > 0);
    matchRef.current = reconciled;
    setMatch(reconciled);
  }, []);

  useEffect(() => {
    const unsubscribe = base44.entities.PvpMatch.subscribe((event) => {
      if (event.data?.code === matchCode) applyIncoming(event.data);
    });
    return unsubscribe;
  }, [matchCode, applyIncoming]);

  // Realtime events can occasionally be missed by a client (dropped socket, tab
  // backgrounded, etc). Poll as a fallback so the match keeps moving without
  // requiring a manual page refresh.
  useEffect(() => {
    const interval = setInterval(async () => {
      const matches = await base44.entities.PvpMatch.filter({ code: matchCode });
      if (matches[0]) applyIncoming(matches[0]);
    }, 1500);
    return () => clearInterval(interval);
  }, [matchCode, applyIncoming]);

  // Applies a change to the match instantly in local state (so the acting player
  // sees the result immediately, with no round-trip wait), records each field as a
  // pending optimistic write, then persists it in the background. applyIncoming
  // later drops a field from the pending overlay once the server echoes the same
  // value back — a harmless no-op re-render — or after the pending timeout.
  const updateMatch = useCallback((matchId, updates) => {
    const keys = Object.keys(updates);
    if (keys.length > 0) {
      const issuedAt = Date.now();
      const pending = { ...pendingWritesRef.current };
      for (const k of keys) pending[k] = { value: updates[k], issuedAt };
      pendingWritesRef.current = pending;
      setSyncing(true);
    }
    setMatch((prev) => (prev && prev.id === matchId ? { ...prev, ...updates } : prev));
    return base44.entities.PvpMatch.update(matchId, updates).catch((err) => {
      // The write failed (network/server) — drop these fields from the overlay so
      // the server's truth wins instead of holding a phantom optimistic value.
      const cur = { ...pendingWritesRef.current };
      for (const k of keys) delete cur[k];
      pendingWritesRef.current = cur;
      setSyncing(Object.keys(cur).length > 0);
      throw err;
    });
  }, []);

  // A single client may only finalize a match once per session — guards against a
  // double-tap or a retried invoke double-granting rewards. The server also gates on
  // PvpMatch.status; this prevents the redundant call entirely.
  const finalizeOnce = useCallback(async () => {
    if (finalizedRef.current) return;
    finalizedRef.current = true;
    try {
      await base44.functions.invoke("finishPvpMatch", { matchCode });
    } catch (e) {
      finalizedRef.current = false;
    }
  }, [matchCode]);

  const myRole = match && myId ? (match.player1Id === myId ? "player1" : "player2") : null;
  const oppRole = myRole === "player1" ? "player2" : "player1";

  const myCard = match?.[`${myRole}Card`];
  const oppCard = match?.[`${oppRole}Card`];
  const myHand = match?.[`${myRole}Hand`] || [];
  const myPool = match?.[`${myRole}Pool`] || [];
  const oppPool = match?.[`${oppRole}Pool`] || [];
  const pendingHybrid = match?.[`${myRole}PendingHybrid`];

  // Detect HP drops between renders to trigger attack/hit animations — works for
  // both the attacker's and defender's clients since both read the same match state.
  useEffect(() => {
    if (!match || !myRole) return;
    const myHpNow = match[`${myRole}Hp`] || 0;
    const oppHpNow = match[`${oppRole}Hp`] || 0;
    const prev = prevHpRef.current;
    // Only ever show the hit animation while a battle is actually in progress — otherwise
    // a card drawn/selected during the "draw" phase (Hp going from 0 up to its max) can
    // race with a late-arriving update and get misread as a hit.
    if (match.phase === "battle" && prev.my !== null && prev.opp !== null) {
      if (oppHpNow < prev.opp) {
        setEffect({ key: Date.now(), side: "opp", value: prev.opp - oppHpNow });
      } else if (myHpNow < prev.my) {
        setEffect({ key: Date.now(), side: "me", value: prev.my - myHpNow });
      }
    }
    prevHpRef.current = { my: myHpNow, opp: oppHpNow, round: match.round };
  }, [match?.[myRole ? `${myRole}Hp` : ""], match?.[oppRole ? `${oppRole}Hp` : ""], match?.round, myRole, oppRole, match?.phase]);

  // Auto-clear the hit effect (attack arrow + damage number) after it plays, so it
  // doesn't stay stuck on screen.
  useEffect(() => {
    if (!effect) return;
    const t = setTimeout(() => setEffect(null), 1200);
    return () => clearTimeout(t);
  }, [effect?.key]);

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
      updateMatch(match.id, {
        [`${myRole}Hand`]: [...myHand, ...myPool.slice(0, needed)],
        [`${myRole}Pool`]: myPool.slice(needed),
      });
    }
  }, [match, myRole, updateMatch]);

  // Host drives the phase transition once both cards are drawn.
  useEffect(() => {
    if (!match || myRole !== "player1" || match.status !== "active" || match.phase !== "draw") return;
    if (match.player1Card?.id && match.player2Card?.id) {
      if (!match.rpsDone) {
        updateMatch(match.id, { phase: "rps", log: "Pick rock, paper, or scissors!" });
      } else {
        updateMatch(match.id, {
          phase: "battle",
          turnStartedAt: new Date().toISOString(),
          log: match.turn === "player1" ? `${match.player1Name} attacks first!` : `${match.player2Name} attacks first!`,
        });
      }
    }
  }, [match, myRole, updateMatch]);

  // If I have no active card, no cards left in hand, and no cards left in my deck to draw,
  // I have no way to continue and forfeit — the safe finishPvpMatch fallback treats the
  // caller as the forfeiter (loser) whenever the score hasn't legitimately reached 3.
  useEffect(() => {
    if (!match || !myRole || match.status !== "active" || match.phase !== "draw") return;
    if (myCard?.id || pendingHybrid?.id || myHand.length > 0 || myPool.length > 0) return;
    updateMatch(match.id, { phase: "matchEnd", log: "Ran out of cards!" }).then(() => {
      finalizeOnce();
    });
  }, [match, myRole, myCard, myHand, myPool, pendingHybrid, updateMatch]);

  // Host resolves RPS once both players have picked.
  useEffect(() => {
    if (!match || myRole !== "player1" || match.phase !== "rps") return;
    if (match.player1Rps && match.player2Rps) {
      if (match.player1Rps === match.player2Rps) {
        updateMatch(match.id, { player1Rps: "", player2Rps: "", log: "Tie! Pick again." });
        return;
      }
      const winner = RPS_BEATS[match.player1Rps] === match.player2Rps ? "player1" : "player2";
      updateMatch(match.id, {
        turn: winner,
        rpsDone: true,
        phase: "battle",
        turnStartedAt: new Date().toISOString(),
        player1Rps: "",
        player2Rps: "",
        log: winner === "player1" ? `${match.player1Name} attacks first!` : `${match.player2Name} attacks first!`,
      }).then(() => {
        if (match.matchType === "offline") base44.functions.invoke("notifyTurnChange", { matchCode: match.code });
      });
    }
  }, [match, myRole, updateMatch]);

  const pickRps = useCallback(
    (choice) => {
      if (!match || match.phase !== "rps" || !myRole) return;
      updateMatch(match.id, { [`${myRole}Rps`]: choice });
    },
    [match, myRole, updateMatch]
  );

  const playCard = useCallback(
    (card) => {
      if (!match || match.phase !== "draw" || !myRole || myCard?.id || pendingHybrid?.id) return;
      if (card.isHybrid) {
        updateMatch(match.id, {
          [`${myRole}Hand`]: myHand.filter((c) => c.id !== card.id),
          [`${myRole}PendingHybrid`]: card,
        });
        return;
      }
      updateMatch(match.id, {
        [`${myRole}Hand`]: myHand.filter((c) => c.id !== card.id),
        [`${myRole}Card`]: card,
        [`${myRole}Hp`]: maxHealth(card),
      });
    },
    [match, myRole, myCard, myHand, pendingHybrid, updateMatch]
  );

  const chooseHybridType = useCallback(
    (type) => {
      if (!match || !myRole || !pendingHybrid?.id) return;
      const finalCard = { ...pendingHybrid, type };
      updateMatch(match.id, {
        [`${myRole}Card`]: finalCard,
        [`${myRole}Hp`]: maxHealth(finalCard),
        [`${myRole}PendingHybrid`]: {},
      });
    },
    [match, myRole, pendingHybrid, updateMatch]
  );

  const attack = useCallback(async (timingMultiplier = 1) => {
    if (!match || match.phase !== "battle" || match.turn !== myRole) return;
    // Block a second tap from re-entering with this same (stale) `match` before
    // the first call flips the turn optimistically — prevents double damage.
    if (attackInFlightRef.current) return;
    attackInFlightRef.current = true;
    try {
    play("attack");
    let attacker = match[`${myRole}Card`];
    const defender = match[`${oppRole}Card`];
    if (!attacker?.id || !defender?.id) return;
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
      : computeDamage(attacker, defender, (usingDoubleAttack ? 2 : 1) * timingMultiplier, usingTripleDefense ? 3 : 1);

    const buffUpdates = {};
    if (usingDoubleAttack) buffUpdates[`${myRole}DoubleAttackActive`] = false;
    if (usingTierBoost) buffUpdates[`${myRole}TempTierBoost`] = {};
    if (usingHalfAttack) buffUpdates[`${myRole}AttackHalvedTurns`] = Math.max(0, (match[`${myRole}AttackHalvedTurns`] || 0) - 1);
    if (usingTripleDefense) buffUpdates[`${oppRole}TripleDefenseActive`] = false;
    if (usingBlock) buffUpdates[`${oppRole}BlockActive`] = false;

    if (result.tie) {
      updateMatch(match.id, {
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
    if (result.isCrit && !result.recoil) play("critical_hit");

    const targetRole = result.recoil ? myRole : oppRole;
    const targetHp = match[`${targetRole}Hp`] || 0;
    const newHp = Math.max(0, targetHp - result.damage);

    if (newHp <= 0) {
      play("card_defeat");
      const roundWinner = targetRole === myRole ? oppRole : myRole;
      const newScoreP1 = match.scoreP1 + (roundWinner === "player1" ? 1 : 0);
      const newScoreP2 = match.scoreP2 + (roundWinner === "player2" ? 1 : 0);
      const matchOver = newScoreP1 >= 3 || newScoreP2 >= 3;
      const winnerName = roundWinner === "player1" ? match.player1Name : match.player2Name;

      // Show the finishing hit (damage number + arrow) first, before swapping cards/round,
      // so the destroy animation actually gets a chance to play.
      await updateMatch(match.id, {
        [`${targetRole}Hp`]: 0,
        log: matchOver ? `${winnerName} wins the match!` : `${winnerName} wins round ${match.round}!`,
        ...buffUpdates,
      });
      await new Promise((resolve) => setTimeout(resolve, 900));

      if (matchOver) {
        await updateMatch(match.id, { scoreP1: newScoreP1, scoreP2: newScoreP2, phase: "matchEnd" });
        await finalizeOnce();
        return;
      }

      // The loser of the round goes first next round (unless an extra-turn power grants another attack within the round).
      const roundLoser = roundWinner === "player1" ? "player2" : "player1";
      updateMatch(match.id, {
        scoreP1: newScoreP1,
        scoreP2: newScoreP2,
        [`${targetRole}Card`]: {},
        round: match.round + 1,
        turn: roundLoser,
        phase: "draw",
        [`${myRole}Timeouts`]: 0,
        ...CLEARED_BUFFS(targetRole),
      }).then(() => {
        if (match.matchType === "offline") base44.functions.invoke("notifyTurnChange", { matchCode: match.code });
      });
      return;
    }

    updateMatch(match.id, {
      [`${targetRole}Hp`]: newHp,
      turn: oppRole,
      turnStartedAt: new Date().toISOString(),
      log: `${myRole === "player1" ? match.player1Name : match.player2Name} deals ${result.damage} damage!`,
      [`${myRole}Timeouts`]: 0,
      ...buffUpdates,
    }).then(() => {
      if (match.matchType === "offline") base44.functions.invoke("notifyTurnChange", { matchCode: match.code });
    });
    } finally {
      attackInFlightRef.current = false;
    }
  }, [match, myRole, oppRole, updateMatch]);

  // Turn timer for 'live' matches only ('offline' matches have no time limit).
  // Derives the countdown from the shared turnStartedAt so both clients agree,
  // and only the player whose turn it is drives the timeout action.
  const [turnTimeLeft, setTurnTimeLeft] = useState(TURN_TIME_LIMIT_SECONDS);
  const timeoutFiredRef = useRef(null);

  useEffect(() => {
    if (!match || match.matchType !== "live" || match.phase !== "battle" || !match.turnStartedAt) {
      setTurnTimeLeft(TURN_TIME_LIMIT_SECONDS);
      return;
    }
    const tick = () => {
      const elapsed = Math.floor((Date.now() - new Date(match.turnStartedAt).getTime()) / 1000);
      const left = Math.max(0, TURN_TIME_LIMIT_SECONDS - elapsed);
      setTurnTimeLeft(left);
      if (left === 0 && match.turn === myRole && timeoutFiredRef.current !== match.turnStartedAt) {
        timeoutFiredRef.current = match.turnStartedAt;
        const timeouts = (match[`${myRole}Timeouts`] || 0) + 1;
        if (timeouts >= MAX_CONSECUTIVE_TURN_TIMEOUTS) {
          updateMatch(match.id, {
            phase: "matchEnd",
            log: "You ran out of time 3 times in a row — you forfeit the match!",
          }).then(() => finalizeOnce());
        } else {
          updateMatch(match.id, {
            turn: oppRole,
            turnStartedAt: new Date().toISOString(),
            [`${myRole}Timeouts`]: timeouts,
            log: `Time's up! You lost your turn (${timeouts}/${MAX_CONSECUTIVE_TURN_TIMEOUTS} timeouts).`,
          });
        }
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [match, myRole, oppRole, updateMatch]);

  // Record this player's own Battle History entry once the match finishes.
  // BattleHistory's created_by_id can only ever be the calling user, so each
  // client must write its own record — a server function can't do this for
  // both sides at once.
  const historyRecordedRef = useRef(false);
  useEffect(() => {
    if (!match || !myRole || match.status !== "finished" || historyRecordedRef.current) return;
    historyRecordedRef.current = true;
    const won = match.winnerId === (myRole === "player1" ? match.player1Id : match.player2Id);
    const myScore = myRole === "player1" ? match.scoreP1 : match.scoreP2;
    const oppScore = myRole === "player1" ? match.scoreP2 : match.scoreP1;
    const oppName = oppRole === "player1" ? match.player1Name : match.player2Name;
    base44.entities.BattleHistory.create({
      opponentName: oppName,
      outcome: won ? "win" : "loss",
      source: "pvp",
      cardsUsed: [],
      playerScore: myScore || 0,
      aiScore: oppScore || 0,
      durationSeconds: Math.round((Date.now() - new Date(match.created_date).getTime()) / 1000),
    });
    play(won ? "win" : "lose");
    if (won) {
      const preRp = (myRole === "player1" ? match.player1Rp : match.player2Rp) || 0;
      base44.auth.me().then((fresh) => {
        if (getRankIndex(fresh.rankPoints || 0) > getRankIndex(preRp)) play("rank_up");
      }).catch(() => {});
    }
  }, [match, myRole, oppRole]);

  const forfeit = useCallback(async () => {
    if (!match || !myRole) return;
    await updateMatch(match.id, { phase: "matchEnd", log: "Your opponent forfeited!" });
    await finalizeOnce();
  }, [match, myRole, updateMatch]);

  // ---- Power-ups (shared user cooldown fields, same as AI battles) ----
  const activatePower = useCallback(
    async (field, effectFn) => {
      if (powerUsedThisTurn || !user || !isTimestampReady(user[field], DAY_MS)) return;
      const now = new Date().toISOString();
      setUser((prev) => (prev ? { ...prev, [field]: now } : prev));
      setPowerUsedThisTurn(true);
      const updatedUserPromise = base44.auth.updateMe({ [field]: now });
      await effectFn();
      const updatedUser = await updatedUserPromise;
      setUser(updatedUser);
    },
    [user, powerUsedThisTurn]
  );

  const activateWeeklyPower = useCallback(
    async (field, effectFn) => {
      if (powerUsedThisTurn || !user || !isTimestampReady(user[field], WEEK_MS)) return;
      const now = new Date().toISOString();
      setUser((prev) => (prev ? { ...prev, [field]: now } : prev));
      setPowerUsedThisTurn(true);
      const updatedUserPromise = base44.auth.updateMe({ [field]: now });
      await effectFn();
      const updatedUser = await updatedUserPromise;
      setUser(updatedUser);
    },
    [user, powerUsedThisTurn]
  );

  const activateDailyMultiPower = useCallback(
    async (usesField, resetField, max, effectFn) => {
      if (powerUsedThisTurn || !user || dailyMultiRemaining(user, usesField, resetField, max) <= 0) return;
      const reset = isTimestampReady(user[resetField], DAY_MS);
      const newUses = reset ? 1 : (user[usesField] || 0) + 1;
      const newResetAt = reset ? new Date().toISOString() : user[resetField];
      setUser((prev) => (prev ? { ...prev, [usesField]: newUses, [resetField]: newResetAt } : prev));
      setPowerUsedThisTurn(true);
      const updatedUserPromise = base44.auth.updateMe({ [usesField]: newUses, [resetField]: newResetAt });
      await effectFn();
      const updatedUser = await updatedUserPromise;
      setUser(updatedUser);
    },
    [user, powerUsedThisTurn]
  );

  const burnPower = useCallback(() => {
    if (!match || !oppCard?.id || oppPool.length === 0 || match.phase !== "battle" || match.turn !== myRole) return;
    activatePower("burnPowerUsedAt", async () => {
      const newCard = oppPool[0];
      updateMatch(match.id, {
        [`${oppRole}Card`]: newCard,
        [`${oppRole}Hp`]: maxHealth(newCard),
        [`${oppRole}Pool`]: oppPool.slice(1),
        ...CLEARED_BUFFS(oppRole),
        log: "Burn! The opponent's card was destroyed and replaced — no life lost.",
      });
    });
  }, [activatePower, match, oppCard, oppPool, myRole, oppRole, updateMatch]);

  const openReshuffle = useCallback(() => setReshuffleModalOpen(true), []);
  const closeReshuffle = useCallback(() => setReshuffleModalOpen(false), []);

  const redrawHandPower = useCallback(() => {
    if (!match || myCard?.id || myHand.length === 0) return;
    activatePower("reshufflePowerUsedAt", async () => {
      const combined = shuffle([...myHand, ...myPool]);
      updateMatch(match.id, {
        [`${myRole}Hand`]: combined.slice(0, 5),
        [`${myRole}Pool`]: combined.slice(5),
        log: "You drew a new hand!",
      });
    });
    setReshuffleModalOpen(false);
  }, [activatePower, match, myCard, myHand, myPool, myRole, updateMatch]);

  const forceOpponentRedrawPower = useCallback(() => {
    if (!match || !oppCard?.id || oppPool.length === 0 || match.phase !== "battle" || match.turn !== myRole) return;
    activatePower("reshufflePowerUsedAt", async () => {
      const newCard = oppPool[0];
      updateMatch(match.id, {
        [`${oppRole}Card`]: newCard,
        [`${oppRole}Hp`]: maxHealth(newCard),
        [`${oppRole}Pool`]: oppPool.slice(1),
        ...CLEARED_BUFFS(oppRole),
        log: "You forced your opponent to redraw!",
      });
    });
    setReshuffleModalOpen(false);
  }, [activatePower, match, oppCard, oppPool, myRole, oppRole, updateMatch]);

  const doubleAttackPower = useCallback(() => {
    if (!match || match.phase !== "battle" || match.turn !== myRole) return;
    activatePower("doubleAttackPowerUsedAt", async () => {
      updateMatch(match.id, {
        [`${myRole}DoubleAttackActive`]: true,
        log: "Double Attack ready — your next strike deals double damage!",
      });
    });
  }, [activatePower, match, myRole, updateMatch]);

  const tripleDefensePower = useCallback(() => {
    if (!match || match.phase !== "battle" || match.turn !== myRole) return;
    activatePower("defensePowerUsedAt", async () => {
      updateMatch(match.id, {
        [`${myRole}TripleDefenseActive`]: true,
        log: "Triple Defense ready — your card will block the next hit with 3x defense!",
      });
    });
  }, [activatePower, match, myRole, updateMatch]);

  const blockPower = useCallback(() => {
    if (!match || match.phase !== "battle" || match.turn !== myRole) return;
    activateDailyMultiPower("blockPowerUsesToday", "blockPowerResetAt", 5, async () => {
      updateMatch(match.id, {
        [`${myRole}BlockActive`]: true,
        log: "Block ready — you will completely block the opponent's next attack!",
      });
    });
  }, [activateDailyMultiPower, match, myRole, updateMatch]);

  const halfAttackPower = useCallback(() => {
    if (!match || !oppCard?.id || match.phase !== "battle" || match.turn !== myRole) return;
    activateDailyMultiPower("halfAttackPowerUsesToday", "halfAttackPowerResetAt", 2, async () => {
      updateMatch(match.id, {
        [`${oppRole}AttackHalvedTurns`]: 2,
        log: "Half Attack activated — the opponent's card deals half damage for its next 2 attacks!",
      });
    });
  }, [activateDailyMultiPower, match, oppCard, myRole, oppRole, updateMatch]);

  const randomTierStats = (tier) => {
    const { statMin, statMax, bonusMin, bonusMax } = TIER_RANGES[tier];
    return { attack: randomInt(statMin, statMax), defense: randomInt(statMin, statMax), bonusDamage: randomInt(bonusMin, bonusMax) };
  };

  const tierUpgradePower = useCallback(
    (tier, field) => {
      if (!match || match.phase !== "battle" || match.turn !== myRole || !myCard?.id) return;
      activateWeeklyPower(field, async () => {
        updateMatch(match.id, {
          [`${myRole}TempTierBoost`]: { tier, ...randomTierStats(tier) },
          log: `Tier ${tier} Upgrade activated — your card gets randomized T${tier} stats for your next attack!`,
        });
      });
    },
    [activateWeeklyPower, match, myRole, myCard, updateMatch]
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
    syncing,
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
    turnTimeLeft,
    effect,
  };
}