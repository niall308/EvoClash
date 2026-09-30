import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Trophy, Loader2, Flame, Calendar, RefreshCw } from "lucide-react";
import PullToRefresh from "@/components/common/PullToRefresh";

const TABS = [
  { key: "wins", label: "Most Wins", icon: Trophy },
  { key: "streak", label: "Win Streaks", icon: Flame },
  { key: "weekly", label: "This Week", icon: Calendar },
];

// How long a cached leaderboard is served fresh before a background refetch is
// triggered. Leaderboards change slowly, so a minute of freshness keeps
// returning players seeing the board instantly instead of staring at a spinner.
const STALE_TIME = 60 * 1000;
// Render the most relevant rows (the top of the board) first, then stream the
// rest in as the player scrolls — keeps the first paint fast even on slow
// networks and large result sets.
const PAGE_SIZE = 20;

export default function Leaderboards() {
  const [tab, setTab] = useState("wins");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef(null);
  const queryClient = useQueryClient();

  // Cached + stale-while-revalidate. On a returning visit the cached board
  // renders instantly; a refetch runs in the background and silently swaps in
  // fresh data — no blank screen, no full reload.
  const { data, isPending, isFetching, refetch } = useQuery({
    queryKey: ["leaderboard", tab],
    queryFn: async () => {
      const res = await base44.functions.invoke("getLeaderboard", { type: tab });
      return res.data.leaderboard || [];
    },
    staleTime: STALE_TIME,
    gcTime: 5 * 60 * 1000,
  });

  const leaderboard = data || [];
  const isFirstLoad = isPending && !data;
  const isRefetching = isFetching && !!data;

  // Reset the incremental render window whenever the tab (and thus the dataset) changes.
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [tab]);

  // Infinite-scroll sentinel: load the next page of rows when it scrolls into view.
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((c) => Math.min(c + PAGE_SIZE, leaderboard.length));
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [leaderboard.length]);

  const handleRefresh = async () => {
    await refetch();
    setVisibleCount(PAGE_SIZE);
  };

  // Manual refresh from the header — invalidates so a fresh fetch always runs.
  const forceRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["leaderboard", tab] });
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="text-white px-6 py-8">
        <Link to="/play" className="inline-flex items-center gap-1 text-white/60 text-sm mb-8 min-h-[44px] px-1 -ml-1">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-black flex items-center gap-2">
            <Trophy className="w-7 h-7 text-amber-400" /> Leaderboards
          </h1>
          <button
            onClick={forceRefresh}
            className="text-white/50 hover:text-white p-2 -mr-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Refresh leaderboard"
          >
            <RefreshCw className={`w-4 h-4 ${isRefetching ? "animate-spin" : ""}`} />
          </button>
        </div>
        <p className="text-white/60 mb-6 text-sm">Top 50 players — PvP battles only</p>

        <div className="flex gap-2 mb-6">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold min-h-[44px] transition-colors ${
                tab === key ? "bg-amber-500 text-black" : "bg-white/5 text-white/60"
              }`}
            >
              <Icon className="w-3.5 h-3.5" /> {label}
            </button>
          ))}
        </div>

        {/* Non-blocking refresh banner: keep the board visible while we update. */}
        {isRefetching && (
          <div className="flex items-center justify-center gap-2 text-white/50 text-xs mb-3">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Updating ranks…
          </div>
        )}

        {isFirstLoad ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-white/50" />
          </div>
        ) : leaderboard.length === 0 ? (
          <p className="text-white/50 text-sm text-center py-12">No players yet — be the first!</p>
        ) : (
          <div className="space-y-2">
            {leaderboard.slice(0, visibleCount).map((p, i) => (
              <div key={i} className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="w-6 text-center font-bold text-amber-400">{i + 1}</span>
                  <span className="font-semibold text-sm">{p.full_name}</span>
                </div>
                <div className="flex gap-4 text-xs text-white/60">
                  {tab === "streak" ? (
                    <span className="text-orange-400 font-bold flex items-center gap-1">
                      <Flame className="w-3 h-3" /> {p.streak}
                    </span>
                  ) : tab === "weekly" ? (
                    <span className="text-emerald-400 font-bold">{p.wins} W</span>
                  ) : (
                    <>
                      <span className="text-emerald-400 font-bold">{p.wins} W</span>
                      <span>{p.losses} L</span>
                    </>
                  )}
                </div>
              </div>
            ))}
            {visibleCount < leaderboard.length && (
              <div ref={sentinelRef} className="flex justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-white/30" />
              </div>
            )}
          </div>
        )}
      </div>
    </PullToRefresh>
  );
}