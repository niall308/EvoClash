import React, { useState, useRef, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { CheckCheck, Loader2, AlertCircle } from "lucide-react";
import CoinFlyAnimation from "@/components/profile/CoinFlyAnimation";
import { play } from "@/lib/soundEngine";

// How many times a milestone reward has been earned (claimed-or-not) by the user.
function timesEarned(m, user) {
  const v = user[m.metric] || 0;
  return m.repeatable ? Math.floor(v / m.target) : v >= m.target ? 1 : 0;
}

// Stagger between successive coin bursts in the unified animation timeline (ms).
// Kept above the SFX engine's same-key throttle (~70ms) so every burst plays its
// own coin sound clearly instead of being debounced into silence.
const BURST_STAGGER = 90;
const BURST_DURATION = 900;

// Always-visible "Claim All" control. Greyed + aria-disabled when nothing is
// claimable; plays ONLY the click SFX on tap, then a single atomic server call;
// on success runs one staggered coin-fly burst per confirmed reward with the coin
// SFX fired as each burst appears (never before animation starts). The in-flight
// ref + server idempotency make rapid double/triple taps safe.
export default function ClaimAllButton({ user, milestones, onUserUpdate }) {
  const [status, setStatus] = useState("idle"); // idle | claiming | animating | error
  const [bursts, setBursts] = useState([]);
  const inFlight = useRef(false);

  const claimable = useMemo(() => {
    if (!milestones || !user) return [];
    return milestones.filter(
      (m) => timesEarned(m, user) > ((user.milestoneClaimCounts || {})[m.id] || 0)
    );
  }, [milestones, user]);

  const anyClaimable = claimable.length > 0;
  const busy = status === "claiming" || status === "animating";
  const disabled = !anyClaimable || busy;

  const handleClaimAll = async (e) => {
    if (inFlight.current) return; // drop rapid repeats
    if (!anyClaimable) return;
    inFlight.current = true;
    const rect = e.currentTarget.getBoundingClientRect();
    const ox = rect.left + rect.width / 2;
    const oy = rect.top + rect.height / 2;
    // Click SFX ONLY — the coin sound must wait for the animation.
    play("button_tap");
    setStatus("claiming");
    try {
      const res = await base44.functions.invoke("claimAllMilestones", {});
      const data = res.data || {};
      const claimed = data.claimed || [];
      if (claimed.length === 0) {
        setStatus("idle");
        inFlight.current = false;
        return;
      }
      setStatus("animating");
      // Unified timeline: one burst per confirmed reward, coin SFX as it appears.
      claimed.forEach((g, i) => {
        setTimeout(() => {
          play("reward_claim");
          setBursts((b) => [...b, { key: `${Date.now()}-${i}`, origin: { x: ox, y: oy } }]);
        }, i * BURST_STAGGER);
      });
      const totalDelay = claimed.length * BURST_STAGGER + BURST_DURATION;
      setTimeout(async () => {
        const updated = await base44.auth.me();
        onUserUpdate(updated);
        window.dispatchEvent(new CustomEvent("coins-claimed", { detail: { newTotal: updated.coins } }));
        setBursts([]);
        setStatus("idle");
        inFlight.current = false;
      }, totalDelay);
    } catch (err) {
      // Failure: no coin audio, no animation — nothing was confirmed.
      setStatus("error");
      setTimeout(() => {
        setStatus("idle");
        inFlight.current = false;
      }, 2200);
    }
  };

  const tooltip = !anyClaimable
    ? "No milestone rewards to claim right now"
    : status === "claiming"
      ? "Claiming rewards…"
      : status === "animating"
        ? "Awarding rewards…"
        : `Claim ${claimable.length} milestone reward${claimable.length === 1 ? "" : "s"}`;

  return (
    <>
      <button
        type="button"
        onClick={handleClaimAll}
        disabled={busy}
        aria-disabled={disabled}
        aria-label={`Claim all milestone rewards${anyClaimable ? ` (${claimable.length})` : ""}`}
        title={tooltip}
        className={[
          "text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 transition-colors",
          disabled ? "bg-white/10 text-white/40 cursor-not-allowed" : "text-black bg-amber-400 animate-pulse",
        ].join(" ")}
      >
        {status === "claiming" ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Claiming…
          </>
        ) : status === "error" ? (
          <>
            <AlertCircle className="w-3.5 h-3.5" /> Retry
          </>
        ) : (
          <>
            <CheckCheck className="w-3.5 h-3.5" /> Claim All{anyClaimable ? ` (${claimable.length})` : ""}
          </>
        )}
      </button>
      {bursts.map((b) => (
        <CoinFlyAnimation
          key={b.key}
          origin={b.origin}
          onDone={() => setBursts((prev) => prev.filter((x) => x.key !== b.key))}
        />
      ))}
    </>
  );
}