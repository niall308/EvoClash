import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Lock, Check, Crown, BookOpen, Trophy, Gift, Egg } from "lucide-react";
import { STORY_STAGES, getOrCreateStoryProgress } from "@/lib/storyConfig";

export default function StoryMap() {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(null);

  const load = async () => {
    const p = await getOrCreateStoryProgress();
    setProgress(p);
  };
  useEffect(() => {
    load();
  }, []);

  const currentKey = progress ? `${progress.currentStage}-${progress.currentMatch}` : null;
  const storyCompleted = progress?.storyCompleted;

  return (
    <div className="text-white px-5 py-6">
      <Link to="/" className="inline-flex items-center gap-1 text-white/60 text-sm mb-4 min-h-[44px]">
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>
      <div className="flex items-center gap-2 mb-1">
        <BookOpen className="w-6 h-6 text-purple-400" />
        <h1 className="text-2xl font-black">Story Mode</h1>
      </div>
      <p className="text-white/50 text-xs mb-6">10 stages · 8 matches each · Beat every boss to complete the story!</p>

      {!progress ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-white/20 border-t-purple-500 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-5">
          {STORY_STAGES.map((stage) => {
            const stageDone = progress.stageCompleted?.includes(stage.stage);
            return (
              <div key={stage.stage} className="bg-white/5 rounded-2xl p-4 border border-white/10">
                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-[10px] font-black px-2 py-1 rounded-full ${stageDone ? "bg-emerald-500/30 text-emerald-300" : "bg-purple-500/30 text-purple-300"}`}>
                    Stage {stage.stage}
                  </span>
                  <Crown className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-white/70 truncate">{stage.bossName}</span>
                  {stageDone && <Check className="w-4 h-4 text-emerald-400 ml-auto" />}
                </div>
                {(stage.stage === 5 || stage.stage === 10) && (
                  <div className="flex items-center gap-1 mb-3 text-[10px] font-bold">
                    {stage.stage === 5 ? (
                      <span className="inline-flex items-center gap-1 bg-gradient-to-r from-fuchsia-500/40 to-amber-400/40 text-amber-200 px-2 py-1 rounded-full border border-amber-400/40">
                        <Gift className="w-3 h-3" /> Boss Reward: Hybrid Card
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-gradient-to-r from-cyan-500/40 to-emerald-400/40 text-cyan-100 px-2 py-1 rounded-full border border-cyan-400/40">
                        <Egg className="w-3 h-3" /> Boss Reward: Creature Egg
                      </span>
                    )}
                  </div>
                )}
                <div className="grid grid-cols-4 gap-2">
                  {stage.matches.map((mt) => {
                    const key = `${stage.stage}-${mt.matchNumber}`;
                    const completed = storyCompleted || progress.completedMatches.includes(key);
                    const current = key === currentKey && !completed;
                    const locked = !completed && !current;
                    const boss = mt.isBoss;
                    return (
                      <button
                        key={mt.matchNumber}
                        disabled={locked}
                        onClick={() => current && navigate(`/story-battle/${stage.stage}/${mt.matchNumber}`)}
                        className={`relative aspect-square rounded-xl flex flex-col items-center justify-center text-xs font-bold transition-all
                          ${completed ? "bg-emerald-600/80 text-white" : current ? "bg-purple-600 text-white ring-2 ring-amber-400 animate-pulse" : "bg-white/5 text-white/30"}
                          ${boss ? "ring-1 ring-amber-400/50" : ""}`}
                      >
                        {boss ? <Crown className="w-4 h-4 mb-0.5" /> : <span>{mt.matchNumber}</span>}
                        {boss && <span className="text-[8px] leading-none mt-0.5">BOSS</span>}
                        {completed && <Check className="w-3.5 h-3.5 absolute top-1 right-1" />}
                        {locked && <Lock className="w-3.5 h-3.5 absolute top-1 right-1 opacity-70" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {storyCompleted && (
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-4 text-center">
              <Trophy className="w-6 h-6 mx-auto mb-1 text-black" />
              <p className="font-black text-black text-sm">Story Complete! You've conquered all 10 stages.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}