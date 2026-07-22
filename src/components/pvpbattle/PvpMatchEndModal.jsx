import React from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

export default function PvpMatchEndModal({ matchStatus, won }) {
  const navigate = useNavigate();

  if (matchStatus !== "finished") {
    return (
      <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center px-6">
        <div className="bg-[#1A2E45] border border-white/10 rounded-2xl p-6 text-center max-w-xs w-full flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin" />
          <p className="text-sm text-white/70">Finalizing match...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center px-6">
      <div className="bg-[#1A2E45] border border-white/10 rounded-2xl p-6 text-center max-w-xs w-full">
        <p className="text-2xl font-black mb-6">{won ? "Victory!" : "Defeated"}</p>
        <div className="flex flex-col gap-3">
          <button onClick={() => navigate("/history")} className="bg-amber-500 text-black font-bold py-3 rounded-full">
            View Game Stats
          </button>
          <button onClick={() => navigate("/")} className="bg-white/10 font-bold py-3 rounded-full">
            Return to Main Menu
          </button>
        </div>
      </div>
    </div>
  );
}