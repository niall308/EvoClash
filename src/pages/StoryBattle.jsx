import React, { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { getStoryMatch, buildStoryAiPool, getOrCreateStoryProgress, advanceStoryProgress } from "@/lib/storyConfig";
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
    async (winner) => {
      if (!ready) return;
      const matchData = ready.matchData;
      const opponentName = matchData.isBoss
        ? matchData.bossName
        : `Stage ${matchData.stageNumber} Match ${matchData.matchNumber}`;
      if (winner === "player") {
        const me = await base44.auth.me();
        let coins = matchData.reward;
        const stageDone = matchData.matchNumber === 8;
        if (stageDone) coins += 1000;
        const allDone = stageDone && matchData.stageNumber === 10;
        if (allDone) coins += 50000;
        await base44.auth.updateMe({ coins: (me.coins || 0) + coins });
        await advanceStoryProgress(matchData.stageNumber, matchData.matchNumber);
        await base44.entities.BattleHistory.create({
          opponentName,
          outcome: "win",
          source: "ai",
          cardsUsed: [],
          playerScore: 0,
          aiScore: 0,
        });
        setEndState({ win: true, coins, stageDone, allDone, bossName: matchData.bossName });
      } else {
        await base44.entities.BattleHistory.create({
          opponentName,
          outcome: "loss",
          source: "ai",
          cardsUsed: [],
          playerScore: 0,
          aiScore: 0,
        });
        setEndState({ win: false, bossName: matchData.bossName });
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