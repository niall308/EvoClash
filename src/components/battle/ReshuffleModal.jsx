import React from "react";

export default function ReshuffleModal({ canRedrawHand, canForceOpponent, onRedrawHand, onForceOpponent, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-30 px-6">
      <div className="bg-[#1A2E45] border border-white/10 rounded-2xl p-6 max-w-xs w-full text-center">
        <h3 className="text-white font-bold text-lg mb-4">Reshuffle Power</h3>
        <div className="flex flex-col gap-3">
          <button
            onClick={onRedrawHand}
            disabled={!canRedrawHand}
            className="bg-sky-600 disabled:opacity-30 text-white font-semibold py-3 rounded-xl active:scale-95 transition-transform"
          >
            Draw a new hand for me
          </button>
          <button
            onClick={onForceOpponent}
            disabled={!canForceOpponent}
            className="bg-fuchsia-600 disabled:opacity-30 text-white font-semibold py-3 rounded-xl active:scale-95 transition-transform"
          >
            Force opponent to redraw
          </button>
          <button onClick={onCancel} className="text-white/50 text-sm mt-1">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}