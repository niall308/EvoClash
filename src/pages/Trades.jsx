import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeftRight, Loader2, ChevronLeft } from "lucide-react";
import { base44 } from "@/api/base44Client";
import TradeRequestCard from "@/components/trades/TradeRequestCard";
import PullToRefresh from "@/components/common/PullToRefresh";

export default function Trades() {
  const [trades, setTrades] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    const { data } = await base44.functions.invoke("getMyTrades", {});
    setTrades(data);
  };

  useEffect(() => {
    load();
  }, []);

  const handleAccept = async (tradeId) => {
    setBusyId(tradeId);
    await base44.functions.invoke("respondTrade", { tradeId, action: "accept" });
    await load();
    setBusyId(null);
  };

  const handleDecline = async (tradeId) => {
    setBusyId(tradeId);
    await base44.functions.invoke("respondTrade", { tradeId, action: "decline" });
    await load();
    setBusyId(null);
  };

  const handleCancel = async (tradeId) => {
    setBusyId(tradeId);
    await base44.functions.invoke("respondTrade", { tradeId, action: "cancel" });
    await load();
    setBusyId(null);
  };

  const handleClaim = async (tradeId) => {
    setBusyId(tradeId);
    const { data } = await base44.functions.invoke("respondTrade", { tradeId, action: "claimCard" });
    if (data?.error) window.alert(data.error);
    await load();
    setBusyId(null);
  };

  const handleCounter = async (tradeId, coins) => {
    setBusyId(tradeId);
    const { data } = await base44.functions.invoke("respondTrade", { tradeId, action: "counter", coins });
    if (data?.error) window.alert(data.error);
    await load();
    setBusyId(null);
  };

  return (
    <PullToRefresh onRefresh={load}>
    <div className="min-h-screen bg-[#0D1B2A] text-white px-6 py-6 pb-24">
      <Link to="/profile" className="inline-flex items-center gap-1 text-white/60 text-sm font-semibold mb-4">
        <ChevronLeft className="w-4 h-4" /> Back
      </Link>
      <h1 className="text-2xl font-black mb-1 flex items-center gap-2">
        <ArrowLeftRight className="w-6 h-6 text-amber-400" /> Trade Requests
      </h1>
      <p className="text-white/50 text-xs mb-6">Propose trades to friends from your Profile.</p>

      {trades === null ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-white/50" />
        </div>
      ) : (
        <>
          <h2 className="text-sm font-bold text-white/70 mb-2">Incoming</h2>
          {trades.incoming.length === 0 ? (
            <p className="text-white/40 text-sm mb-6">No incoming trade requests.</p>
          ) : (
            <div className="mb-6">
              {trades.incoming.map((t) => (
                <TradeRequestCard
                  key={t.id}
                  trade={t}
                  direction="incoming"
                  onAccept={handleAccept}
                  onDecline={handleDecline}
                  onClaim={handleClaim}
                  onCounter={handleCounter}
                  busy={busyId === t.id}
                />
              ))}
            </div>
          )}

          <h2 className="text-sm font-bold text-white/70 mb-2">Sent</h2>
          {trades.outgoing.length === 0 ? (
            <p className="text-white/40 text-sm">No sent trade requests.</p>
          ) : (
            <div>
              {trades.outgoing.map((t) => (
                <TradeRequestCard
                  key={t.id}
                  trade={t}
                  direction="outgoing"
                  onAccept={handleAccept}
                  onDecline={handleDecline}
                  onCancel={handleCancel}
                  onClaim={handleClaim}
                  onCounter={handleCounter}
                  busy={busyId === t.id}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
    </PullToRefresh>
  );
}