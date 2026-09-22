import React, { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { getStoryMatch, buildStoryAiPool, getOrCreateStoryProgress } from "@/lib/storyConfig";
import { ensureActiveDeck } from "@/lib/decks";
import BattleScreen from "@/components/battle/BattleScreen";
import StoryMatchEnd from "@/components/story/StoryMatchEnd";
import { Loader2 } from "lucide-react";

export default function StoryBattle() {
  const { stage, match } = useParams();
  const navigate = useNavigate();
  const [ready, setReady] = useState(null);
  const [endState, setEndState] = useState(null);
  const [battleKey, setBattleKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const s = Number(stage);
      const m = Number(match);
      const matchData = getStoryMatch(s, m);
      if (!matchData) {
        navigate("/story");
        return;
      }
      const me = await base44.auth.me();
      const { active } = await ensureActiveDeck(me.id);
      const myCards = await base44.entities.Card.filter({ ownerId: me.id, deckId: active.id });
      if (myCards.length < 15) {
        navigate("/deck");
        return;
      }
      const progress = await getOrCreateStoryProgress();
      const key = `${s}-${m}`;
      if (progress.storyCompleted || progress.completedMatches.includes(key)) {
        navigate("/story");
        return;
      }
      const currentKey = `${progress.currentStage}-${progress.currentMatch}`;
      if (key !== currentKey) {
        navigate("/story");
        return;
      }
      const aiPool = await buildStoryAiPool(matchData);
      if (cancelled) return;
      setReady({ playerCards: myCards, aiPool, matchData });
    })();
    return () => {
      cancelled = true;
    };
  }, [stage, match, battleKey]);

  const handleEnd = useCallback(
    async (winner, details = {}) => {
      if (!ready) return;
      const matchData = ready.matchData;
      // Server-authoritative settlement: coins, story counters, progress, and
      // battle history are all written by finalizeStoryBattle (idempotent on the
      // stage-match key) — the client can no longer mint story rewards or skip stages.
      try {
        const { data } = await base44.functions.invoke("finalizeStoryBattle", {
          stage: matchData.stageNumber,
          match: matchData.matchNumber,
          win: winner === "player",
          flawless: !!details.flawless,
          noPowerUps: !details.powerUpsUsed,
          playerScore: details.score?.player ?? 0,
          aiScore: details.score?.ai ?? 0,
        });
        if (data?.alreadySettled) return;
        if (winner === "player" && data) {
          setEndState({
            win: true,
            coins: data.coins,
            stageDone: data.stageDone,
            allDone: data.allDone,
            bossName: matchData.bossName,
            bonusReward: data.bonusReward || null,
          });
        } else {
          setEndState({ win: false, bossName: matchData.bossName });
        }
      } catch (err) {
        setEndState({ win: winner === "player", bossName: matchData.bossName, coins: 0 });
      }
    },
    [ready]
  );

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0D1B2A]">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  return (
    <BattleScreen
      key={battleKey}
      playerCards={ready.playerCards}
      difficulty={ready.matchData.aiDeckType}
      options={{ aiPoolOverride: ready.aiPool, skipRewards: true, isBoss: ready.matchData.isBoss, forfeitTo: "/story" }}
      onMatchEnd={handleEnd}
      matchEnd={
        endState ? (
          <StoryMatchEnd
            {...endState}
            onRetry={() => {
              setEndState(null);
              setBattleKey((k) => k + 1);
            }}
          />
        ) : (
          <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
        )
      }
    />
  );
}