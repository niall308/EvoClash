import React from "react";
import { motion } from "framer-motion";

export default function ForfeitModal({ onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-6">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-[#1A2E45] border border-white/10 rounded-2xl p-6 w-full max-w-xs text-center text-white"
      >
        <p className="font-bold mb-5">Forfeit will count as a loss</p>
        <div className="flex flex-col gap-2">
          <button onClick={onConfirm} className="bg-red-600 hover:bg-red-700 rounded-xl py-2.5 font-bold transition-colors">
            Yes Forfeit
          </button>
          <button onClick={onCancel} className="bg-white/10 hover:bg-white/20 rounded-xl py-2.5 font-bold transition-colors">
            Continue Playing
          </button>
        </div>
      </motion.div>
    </div>
  );
}