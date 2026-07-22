import { useEffect, useRef, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { computeDamage, maxHealth } from "@/lib/battleEngine";
import { TYPES } from "@/lib/gameConstants";

const randomFrom = (arr) => arr[Math.floor(Math.random() * arr.length)];
const RPS_BEATS = { rock: "scissors", scissors: "paper", paper: "rock" };

// Real-time, synced 1v1 PvP duel. Both clients read the same PvpMatch record and
// each only ever writes their own side's fields, except player1 (the host) also
// drives shared phase transitions (draw->rps->battle) to avoid write races.
export default function usePvpMatch(matchCode) {
  const [match, setMatch] = useState(null);
  const [myId, setMyId] = useState(null);

  useEffect(() => {
    (async () => {
      const me = await base44.auth.me();
      setMyId(me.id);
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

  // Auto-draw my next card whenever it's my turn to draw.
  useEffect(() => {
    if (!match || !myRole || match.status !== "active" || match.phase !== "draw") return;
    const myCard = match[`${myRole}Card`];
    const myPool = match[`${myRole}Pool`] || [];
    if (!myCard?.id && myPool.length > 0) {
      const [next, ...rest] = myPool;
      const finalCard = next.isHybrid ? { ...next, type: randomFrom(TYPES) } : next;
      base44.entities.PvpMatch.update(match.id, {
        [`${myRole}Card`]: finalCard,
        [`${myRole}Pool`]: rest,
        [`${myRole}Hp`]: maxHealth(finalCard),
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

  const attack = useCallback(async () => {
    if (!match || match.phase !== "battle" || match.turn !== myRole) return;
    const attacker = match[`${myRole}Card`];
    const defender = match[`${oppRole}Card`];
    const result = computeDamage(attacker, defender);

    if (result.tie) {
      await base44.entities.PvpMatch.update(match.id, {
        player1Card: {},
        player2Card: {},
        player1Hp: 0,
        player2Hp: 0,
        phase: "draw",
        log: "It's a tie! Both cards are destroyed.",
      });
      return;
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
        const winnerId = roundWinner === "player1" ? match.player1Id : match.player2Id;
        await base44.entities.PvpMatch.update(match.id, {
          scoreP1: newScoreP1,
          scoreP2: newScoreP2,
          [`${targetRole}Hp`]: 0,
          phase: "matchEnd",
          log: `${winnerName} wins the match!`,
        });
        await base44.functions.invoke("finishPvpMatch", { matchCode: match.code, winnerId });
        return;
      }

      await base44.entities.PvpMatch.update(match.id, {
        scoreP1: newScoreP1,
        scoreP2: newScoreP2,
        [`${targetRole}Card`]: {},
        [`${targetRole}Hp`]: 0,
        round: match.round + 1,
        turn: roundWinner,
        phase: "draw",
        log: `${winnerName} wins round ${match.round}!`,
      });
      return;
    }

    await base44.entities.PvpMatch.update(match.id, {
      [`${targetRole}Hp`]: newHp,
      turn: oppRole,
      log: `${myRole === "player1" ? match.player1Name : match.player2Name} deals ${result.damage} damage!`,
    });
  }, [match, myRole, oppRole]);

  const forfeit = useCallback(async () => {
    if (!match || !myRole) return;
    const winnerId = myRole === "player1" ? match.player2Id : match.player1Id;
    await base44.entities.PvpMatch.update(match.id, { phase: "matchEnd", log: "Your opponent forfeited!" });
    await base44.functions.invoke("finishPvpMatch", { matchCode: match.code, winnerId });
  }, [match, myRole]);

  return { match, myRole, oppRole, pickRps, attack, forfeit };
}