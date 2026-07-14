import React from "react";
import { useNavigate } from "react-router-dom";

export default function MatchEndModal({ won }) {
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center px-6">
      <div className="bg-[#1A2E45] border border-white/10 rounded-2xl p-6 text-center max-w-xs w-full">
        <p className="text-2xl font-black mb-6">{won ? "You Win" : "You Have Been Defeated"}</p>
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