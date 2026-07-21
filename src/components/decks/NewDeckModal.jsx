import React, { useState } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";

export default function NewDeckModal({ cost, canAfford, onCreate, onCancel }) {
  const [name, setName] = useState("");
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-[#1A2E45] rounded-2xl p-6 w-full max-w-xs text-white relative"
      >
        <button onClick={onCancel} className="absolute top-3 right-3 text-white/50">
          <X className="w-4 h-4" />
        </button>
        <h2 className="text-lg font-bold mb-1">New Deck</h2>
        <p className="text-xs text-white/50 mb-4">Costs {cost.toLocaleString()} LC</p>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Deck name"
          className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm mb-4 text-white placeholder:text-white/30"
        />
        {!canAfford && <p className="text-red-400 text-xs mb-3">Not enough LC.</p>}
        <button
          onClick={() => name.trim() && onCreate(name.trim())}
          disabled={!name.trim() || !canAfford}
          className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 py-2 rounded-full font-bold disabled:opacity-40"
        >
          Create Deck
        </button>
      </motion.div>
    </div>
  );
}