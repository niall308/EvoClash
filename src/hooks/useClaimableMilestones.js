import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

function timesEarned(milestone, user) {
  const value = user[milestone.metric] || 0;
  if (milestone.repeatable) return Math.floor(value / milestone.target);
  return value >= milestone.target ? 1 : 0;
}

// True when the user has at least one milestone reward available to claim.
export default function useClaimableMilestones(user) {
  const [hasClaimable, setHasClaimable] = useState(false);

  useEffect(() => {
    if (!user) return;
    base44.entities.Milestone.list("-created_date").then((milestones) => {
      const claimCounts = user.milestoneClaimCounts || {};
      const claimable = milestones.some((m) => timesEarned(m, user) > (claimCounts[m.id] || 0));
      setHasClaimable(claimable);
    });
  }, [user]);

  return hasClaimable;
}