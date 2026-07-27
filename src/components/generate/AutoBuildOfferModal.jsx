import React from "react";
import { Sparkles, Hammer } from "lucide-react";

export default function AutoBuildOfferModal({ onChooseAuto, onChooseManual }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center px-6">
      <div className="bg-[#0D1B2A] border border-white/10 rounded-2xl p-6 max-w-sm w-full text-white">
        <h2 className="text-xl font-black mb-2">Welcome, Trainer!</h2>
        <p className="text-white/70 text-sm mb-4">
          Want us to auto-build your first 15 cards for you, or would you rather generate each one yourself?
        </p>
        <p className="text-amber-400 text-xs font-semibold mb-6">
          This is a one-time offer — if you choose to build them yourself, you won't be able to auto-build later.
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={onChooseAuto}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-fuchsia-500 py-3 rounded-full font-bold active:scale-95 transition-transform"
          >
            <Sparkles className="w-4 h-4" /> Auto-Build My 15 Cards
          </button>
          <button
            onClick={onChooseManual}
            className="flex items-center justify-center gap-2 bg-white/10 py-3 rounded-full font-bold active:scale-95 transition-transform"
          >
            <Hammer className="w-4 h-4" /> I'll Build Them Myself
          </button>
        </div>
      </div>
    </div>
  );
}