import React, { useEffect, useState } from "react";
import { ArrowLeftRight, Loader2, Swords } from "lucide-react";
import { base44 } from "@/api/base44Client";
import TradeRequestCard from "@/components/trades/TradeRequestCard";
import RecentPlayersModal from "@/components/trades/RecentPlayersModal";
import ProposeTradeModal from "@/components/trades/ProposeTradeModal";
import PullToRefresh from "@/components/common/PullToRefresh";

export default function Trades() {
  const [trades, setTrades] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [showRecent, setShowRecent] = useState(false);
  const [tradeTarget, setTradeTarget] = useState(null);
  const [myCards, setMyCards] = useState(null);
  const [coins, setCoins] = useState(0);
  const [preparing, setPreparing] = useState(false);

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

  const openTradeWith = async (player) => {
    setShowRecent(false);
    setPreparing(true);
    setMyCards(null);
    try {
      const me = await base44.auth.me();
      const cards = await base44.entities.Card.filter({ ownerId: me.id }, "-created_date");
      setMyCards(cards);
      setCoins(me.coins || 0);
      setTradeTarget({ friendUserId: player.id, friendName: player.full_name });
    } catch {
      window.alert("Couldn't load your cards. Please try again.");
    } finally {
      setPreparing(false);
    }
  };

  return (
    <PullToRefresh onRefresh={load}>
    <div className="text-white px-6 py-6 pb-24">
      <h1 className="text-2xl font-black mb-1 flex items-center gap-2">
        <ArrowLeftRight className="w-6 h-6 text-amber-400" /> Trade Requests
      </h1>
      <p className="text-white/50 text-xs mb-4">Propose trades to friends from your Profile.</p>

      <button
        onClick={() => setShowRecent(true)}
        disabled={preparing}
        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-bold py-3 rounded-full mb-6 active:scale-95 transition-transform disabled:opacity-50"
      >
        <Swords className="w-5 h-5" /> Recent Players
      </button>

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
      {showRecent && (
        <RecentPlayersModal onSelect={openTradeWith} onClose={() => setShowRecent(false)} />
      )}
      {tradeTarget && myCards && (
        <ProposeTradeModal
          friend={tradeTarget}
          myCards={myCards}
          maxCoins={coins}
          onClose={() => setTradeTarget(null)}
          onProposed={() => {
            setTradeTarget(null);
            load();
          }}
        />
      )}
    </div>
    </PullToRefresh>
  );
}