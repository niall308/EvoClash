import React from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";

// Shared centered overlay for the Manage Creatures admin modals. Click on the
// backdrop closes; content stops propagation. Children scroll when tall.
export default function ModalShell({ title, onClose, children, maxWidth = "max-w-md" }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 px-3 py-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 24 }}
        onClick={(e) => e.stopPropagation()}
        className={`bg-[#132338] rounded-2xl w-full ${maxWidth} max-h-[90vh] overflow-y-auto border border-white/10`}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 sticky top-0 bg-[#132338] z-10">
          <h3 className="text-white font-bold text-sm">{title}</h3>
          <button onClick={onClose} aria-label="Close" className="text-white/50 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </motion.div>
    </div>
  );
}