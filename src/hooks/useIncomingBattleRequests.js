import { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";

export default function useIncomingBattleRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);

  const refresh = useCallback(async () => {
    if (!user) return;
    const pending = await base44.entities.BattleRequest.filter({ toUserId: user.id, status: "pending" }, "-created_date");
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    setRequests(pending.filter((r) => new Date(r.created_date).getTime() > cutoff));
  }, [user?.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = base44.entities.BattleRequest.subscribe((event) => {
      if (event.data?.toUserId === user.id) refresh();
    });
    return unsubscribe;
  }, [user?.id, refresh]);

  return { requests, refresh };
}