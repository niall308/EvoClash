import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Coins } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";

export default function CoinHistory() {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState(null);

  useEffect(() => {
    (async () => {
      const list = await base44.entities.CoinTransaction.list("-created_date");
      setTransactions(list);
    })();
  }, []);

  return (
    <div className="min-h-screen text-white px-4 py-6" style={{ background: "linear-gradient(180deg, #0D1B2A 0%, #1A2E45 100%)" }}>
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-white/60 hover:text-white text-sm mb-6 py-2 px-1 -ml-1">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>
      <h1 className="text-2xl font-bold mb-1">Transaction History</h1>
      <p className="text-white/60 text-sm mb-6">Your past Legend Coin purchases.</p>

      {transactions === null && <p className="text-white/50 text-sm">Loading...</p>}
      {transactions?.length === 0 && <p className="text-white/50 text-sm">No purchases yet.</p>}

      <div className="flex flex-col gap-3">
        {transactions?.map((tx) => (
          <div key={tx.id} className="bg-white/5 border border-white/10 rounded-2xl px-5 py-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-amber-300" />
                <span className="font-bold text-lg">+{tx.coinsAdded.toLocaleString()} LC</span>
              </div>
              <span className="font-bold text-emerald-400">${tx.priceUsd}</span>
            </div>
            <p className="text-white/40 text-xs mb-1">{format(new Date(tx.created_date), "MMM d, yyyy · h:mm a")}</p>
            <p className="text-white/50 text-xs">
              {tx.oldCoinTotal.toLocaleString()} LC → {tx.newCoinTotal.toLocaleString()} LC
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}