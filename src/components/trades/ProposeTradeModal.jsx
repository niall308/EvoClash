import React, { useEffect, useState } from "react";
import { ArrowLeftRight, Loader2, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import GameCard from "@/components/cards/GameCard";

export default function ProposeTradeModal({ friend, myCards, maxCoins = 0, onClose, onProposed }) {
  const [friendCards, setFriendCards] = useState(null);
  const [myCardId, setMyCardId] = useState(null);
  const [friendCardId, setFriendCardId] = useState(null);
  const [coins, setCoins] = useState(0);
  const [step, setStep] = useState(1); // 1: pick cards, 2: confirm
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    base44.functions.invoke("getFriendCards", { friendUserId: friend.friendUserId }).then(({ data }) => {
      if (data?.error) setError(data.error);
      else setFriendCards(data.cards);
    });
  }, [friend.friendUserId]);

  const myCard = myCards.find((c) => c.id === myCardId);
  const friendCard = friendCards?.find((c) => c.id === friendCardId);

  const handlePropose = async () => {
    setSubmitting(true);
    setError("");
    const { data } = await base44.functions.invoke("proposeTrade", {
      toUserId: friend.friendUserId,
      toUserName: friend.friendName,
      fromCardId: myCardId,
      toCardId: friendCardId,
      coins,
    });
    setSubmitting(false);
    if (data?.error) {
      setError(data.error);
      return;
    }
    onProposed(data.trade);
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center px-4">
      <div className="bg-[#1A2E45] rounded-2xl p-5 max-w-md w-full border border-white/10 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-black text-lg flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-amber-400" /> Trade with {friend.friendName}
          </h2>
          <button onClick={onClose}>
            <X className="w-5 h-5 text-white/50" />
          </button>
        </div>

        {step === 1 ? (
          <>
            <p className="text-white/50 text-xs mb-2">Choose one of your cards to offer</p>
            <div className="grid grid-cols-3 gap-2 mb-4 max-h-40 overflow-y-auto">
              {myCards.map((c) => (
                <button key={c.id} onClick={() => setMyCardId(c.id)} className={myCardId === c.id ? "ring-2 ring-amber-400 rounded-2xl" : ""}>
                  <GameCard card={c} size="xs" />
                </button>
              ))}
            </div>

            <p className="text-white/50 text-xs mb-2">Choose a card you want from {friend.friendName}</p>
            {friendCards === null ? (
              <div className="flex justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-white/50" />
              </div>
            ) : friendCards.length === 0 ? (
              <p className="text-white/40 text-sm mb-4">This player has no cards to trade.</p>
            ) : (
              <div className="grid grid-cols-3 gap-2 mb-4 max-h-40 overflow-y-auto">
                {friendCards.map((c) => (
                  <button key={c.id} onClick={() => setFriendCardId(c.id)} className={friendCardId === c.id ? "ring-2 ring-amber-400 rounded-2xl" : ""}>
                    <GameCard card={c} size="xs" />
                  </button>
                ))}
              </div>
            )}

            {error && <p className="text-red-400 text-xs mb-3">{error}</p>}

            <div className="space-y-2">
              <button
                onClick={() => setStep(2)}
                disabled={!myCardId || !friendCardId}
                className="w-full bg-amber-500 text-black font-bold py-3 rounded-full disabled:opacity-40"
              >
                Review Trade
              </button>
              <button onClick={onClose} className="w-full bg-white/10 font-bold py-3 rounded-full">
                Cancel
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-white/70 text-sm mb-4 text-center">Confirm this trade proposal:</p>
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="text-center">
                <GameCard card={myCard} size="sm" />
                <p className="text-[10px] text-white/50 mt-1">You give</p>
              </div>
              <ArrowLeftRight className="w-5 h-5 text-amber-400 shrink-0" />
              <div className="text-center">
                <GameCard card={friendCard} size="sm" />
                <p className="text-[10px] text-white/50 mt-1">You receive</p>
              </div>
            </div>

            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <label className="text-white/50 text-xs">Add LC coins to your offer (optional)</label>
                <span className="text-amber-300 text-xs font-bold">{coins.toLocaleString()} LC</span>
              </div>
              <input
                type="range"
                min={0}
                max={maxCoins}
                step={Math.max(1, Math.floor(maxCoins / 100) || 1)}
                value={Math.min(coins, maxCoins)}
                onChange={(e) => setCoins(Number(e.target.value))}
                className="w-full"
              />
              <p className="text-white/30 text-[10px] mt-1">You have {maxCoins.toLocaleString()} LC available</p>
            </div>

            {error && <p className="text-red-400 text-xs mb-3 text-center">{error}</p>}

            <div className="space-y-2">
              <button
                onClick={handlePropose}
                disabled={submitting}
                className="w-full bg-amber-500 text-black font-bold py-3 rounded-full disabled:opacity-50"
              >
                {submitting ? "Sending..." : "Send Trade Request"}
              </button>
              <button onClick={() => setStep(1)} disabled={submitting} className="w-full bg-white/10 font-bold py-3 rounded-full disabled:opacity-50">
                Back
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}