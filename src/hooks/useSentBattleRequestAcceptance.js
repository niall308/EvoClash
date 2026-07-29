import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";

// The player who SENDS a battle request only learns it was accepted via this watcher —
// respondBattleRequest only hands the matchCode back to the accepting player, so without
// this the sender is stuck on "Requested" forever while their opponent is already in the match.
export default function useSentBattleRequestAcceptance(pendingRequestIds, matchType) {
  const navigate = useNavigate();
  const navigatedRef = useRef(false);

  useEffect(() => {
    if (pendingRequestIds.length === 0) return;

    const checkAccepted = (request) => {
      if (navigatedRef.current || !request) return;
      if (pendingRequestIds.includes(request.id) && request.status === "accepted" && request.matchCode) {
        navigatedRef.current = true;
        navigate(`/pvp-battle/${request.matchCode}`);
      }
    };

    const unsubscribe = base44.entities.BattleRequest.subscribe((event) => checkAccepted(event.data));

    // Realtime events can be missed, so poll as a fallback too.
    const interval = setInterval(async () => {
      const accepted = await base44.entities.BattleRequest.filter({ status: "accepted", matchType });
      accepted.forEach(checkAccepted);
    }, 3000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [pendingRequestIds, matchType, navigate]);
}