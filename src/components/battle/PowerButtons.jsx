import React, { useState, useEffect, useMemo } from "react";
import { POWER_DEFINITIONS } from "@/lib/gameConstants";
import { getPowerBattleStatus } from "@/lib/powerUps";
import PowerButton from "@/components/battle/PowerButton";
import PowerInfoPopover from "@/components/battle/PowerInfoPopover";

// Container for the in-battle power-up buttons.
//
// Each button shows an explicit readiness state: a ready pulse when usable,
// a live cooldown countdown badge, a multi-use remaining counter, or a lock
// overlay with a tap-to-open popover that explains *why* the power can't be
// used right now (opponent's turn, used this turn, needs a card in play, on
// cooldown, not owned…). All of this is display-only — the underlying power
// balance, cooldown logic, and `canUseMap` gating from the battle hook are
// untouched.
//
// `battleContext` (optional) lets the UI explain battle-phase locks:
//   { isPlayerTurn, powerUsedThisTurn, hasPlayerCard, hasAiCard }
export default function PowerButtons({ user, activeKeys, canUseMap, handlers, battleContext }) {
  // Tick every 30s so cooldown badges and the popover countdown stay fresh.
  // The setter triggers a re-render; the value itself is unused (statuses are
  // recomputed inline below on every render).
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(id);
  }, []);
  const [inspectKey, setInspectKey] = useState(null);
  const inspectDef = useMemo(
    () => POWER_DEFINITIONS.find((d) => d.key === inspectKey) || null,
    [inspectKey]
  );
  const inspectStatus = useMemo(() => {
    if (!inspectDef) return null;
    return getPowerBattleStatus(user, inspectDef, {
      hasHandler: !!handlers[inspectDef.key],
      canUse: !!canUseMap[inspectDef.key],
      battleContext,
    });
  }, [user, inspectDef, canUseMap, handlers, battleContext]);

  return (
    <>
      <div className="flex flex-col gap-3 z-20">
        {activeKeys.map((key) => {
          const def = POWER_DEFINITIONS.find((d) => d.key === key);
          if (!def) return null;
          const status = getPowerBattleStatus(user, def, {
            hasHandler: !!handlers[key],
            canUse: !!canUseMap[key],
            battleContext,
          });
          return (
            <PowerButton
              key={key}
              powerKey={key}
              user={user}
              status={status}
              onActivate={handlers[key]}
              onInspect={() => setInspectKey(key)}
            />
          );
        })}
      </div>

      {inspectDef && (
        <PowerInfoPopover
          powerDef={inspectDef}
          status={inspectStatus}
          onClose={() => setInspectKey(null)}
        />
      )}
    </>
  );
}