import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Loader2 } from "lucide-react";
import BattleLogEntry from "@/components/history/BattleLogEntry";

export default function BattleHistory() {
  const [history, setHistory] = useState(null);

  useEffect(() => {
    (async () => {
      const user = await base44.auth.me();
      const records = await base44.entities.BattleHistory.filter({ created_by_id: user.id }, "-created_date");
      setHistory(records);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-[#0D1B2A] text-white px-6 py-6">
      <Link to="/profile" className="inline-flex items-center gap-1 text-white/60 text-sm mb-6 py-2 px-1 -ml-1">
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>
      <h1 className="text-2xl font-black mb-6">Battle History</h1>

      {!history ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-white/50" />
        </div>
      ) : history.length === 0 ? (
        <p className="text-white/40 text-sm">No battles played yet.</p>
      ) : (
        <div className="space-y-3">
          {history.map((h) => (
            <BattleLogEntry key={h.id} h={h} />
          ))}
        </div>
      )}
    </div>
  );
}