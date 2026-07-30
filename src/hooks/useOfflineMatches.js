import { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";

// Returns this user's active offline PvP matches, kept live via realtime
// subscription so "whose turn" status updates instantly without a page reload.
export default function useOfflineMatches() {
  const { user } = useAuth();
  const [matches, setMatches] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) return;
    const [asP1, asP2] = await Promise.all([
      base44.entities.PvpMatch.filter({ player1Id: user.id, matchType: "offline", status: "active" }),
      base44.entities.PvpMatch.filter({ player2Id: user.id, matchType: "offline", status: "active" }),
    ]);
    setMatches([...asP1, ...asP2]);
    setLoaded(true);
  }, [user?.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = base44.entities.PvpMatch.subscribe((event) => {
      if (event.data?.player1Id === user.id || event.data?.player2Id === user.id) refresh();
    });
    return unsubscribe;
  }, [user?.id, refresh]);

  return { matches, loaded, refresh };
}

export function isMyTurnInMatch(match, userId) {
  const role = match.player1Id === userId ? "player1" : "player2";
  return match.turn === role;
}