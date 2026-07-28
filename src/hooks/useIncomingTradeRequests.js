import { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";

export default function useIncomingTradeRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);

  const refresh = useCallback(async () => {
    if (!user) return;
    const pending = await base44.entities.TradeRequest.filter({ toUserId: user.id, status: "pending" }, "-created_date");
    setRequests(pending);
  }, [user?.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = base44.entities.TradeRequest.subscribe((event) => {
      if (event.data?.toUserId === user.id) refresh();
    });
    return unsubscribe;
  }, [user?.id, refresh]);

  return { requests, refresh };
}