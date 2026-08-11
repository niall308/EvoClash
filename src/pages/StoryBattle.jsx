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
    async (winner, details = {}) => {
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

        // Story Mode milestone tracking. Per-match signals come from the battle hook:
        // flawless = AI scored 0 rounds; powerUpsUsed = any tactical power activated this match.
        const flawless = !!details.flawless;
        const noPowerUps = !details.powerUpsUsed;
        const userUpdate = { coins: (me.coins || 0) + coins };
        userUpdate.storyMatchesWon = (me.storyMatchesWon || 0) + 1;
        if (matchData.isBoss) {
          userUpdate.bossFightsWon = (me.bossFightsWon || 0) + 1;
          userUpdate.highestStoryStage = Math.max(me.highestStoryStage || 0, matchData.stageNumber);
          if (flawless) userUpdate.bossFlawlessWins = (me.bossFlawlessWins || 0) + 1;
          if (noPowerUps) userUpdate.stagesCompletedNoPowerUps = (me.stagesCompletedNoPowerUps || 0) + 1;
          const lostStages = me.storyBossLostStages || [];
          if (!lostStages.includes(matchData.stageNumber)) {
            userUpdate.bossFirstAttemptWins = (me.bossFirstAttemptWins || 0) + 1;
          }
          if (matchData.stageNumber === 10) userUpdate.finalBossDefeated = 1;
          const cur = (me.currentStagesNoLossStreak || 0) + 1;
          userUpdate.currentStagesNoLossStreak = cur;
          userUpdate.maxStagesNoLossStreak = Math.max(me.maxStagesNoLossStreak || 0, cur);
        }
        await base44.auth.updateMe(userUpdate);

        await advanceStoryProgress(matchData.stageNumber, matchData.matchNumber);
        await base44.entities.BattleHistory.create({
          opponentName,
          outcome: "win",
          source: "ai",
          cardsUsed: [],
          playerScore: details.score?.player ?? 0,
          aiScore: details.score?.ai ?? 0,
        });
        setEndState({ win: true, coins, stageDone, allDone, bossName: matchData.bossName });
      } else {
        // A loss breaks the no-loss stage streak; losing a boss marks that stage so a
        // later win doesn't count as a first-attempt victory.
        const me = await base44.auth.me();
        const userUpdate = { currentStagesNoLossStreak: 0 };
        if (matchData.isBoss) {
          const lostStages = me.storyBossLostStages || [];
          if (!lostStages.includes(matchData.stageNumber)) {
            userUpdate.storyBossLostStages = [...lostStages, matchData.stageNumber];
          }
        }
        await base44.auth.updateMe(userUpdate);
        await base44.entities.BattleHistory.create({
          opponentName,
          outcome: "loss",
          source: "ai",
          cardsUsed: [],
          playerScore: details.score?.player ?? 0,
          aiScore: details.score?.ai ?? 0,
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