import React, { useState } from "react";
import { AlertTriangle } from "lucide-react";

export default function DeleteAccountModal({ onConfirm, onCancel }) {
  const [step, setStep] = useState(1);
  const [deleting, setDeleting] = useState(false);

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center px-6">
      <div className="bg-[#1A2E45] rounded-2xl p-6 max-w-sm w-full border border-red-500/30">
        <div className="flex items-center gap-2 mb-3 text-red-400">
          <AlertTriangle className="w-5 h-5" />
          <h2 className="font-black text-lg">Delete Account</h2>
        </div>
        {step === 1 ? (
          <>
            <p className="text-white/70 text-sm mb-6">
              This will permanently delete your account, including all cards, decks, battle history, and coin balance.
              This action cannot be undone.
            </p>
            <div className="space-y-2">
              <button onClick={() => setStep(2)} className="w-full bg-red-600 text-white font-bold py-3 rounded-full">
                Continue
              </button>
              <button onClick={onCancel} className="w-full bg-white/10 text-white font-bold py-3 rounded-full">
                Cancel
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-white/70 text-sm mb-6">
              Are you absolutely sure? All your data will be lost forever and cannot be recovered.
            </p>
            <div className="space-y-2">
              <button
                onClick={async () => {
                  setDeleting(true);
                  await onConfirm();
                }}
                disabled={deleting}
                className="w-full bg-red-600 text-white font-bold py-3 rounded-full disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Yes, Delete My Account"}
              </button>
              <button onClick={onCancel} disabled={deleting} className="w-full bg-white/10 text-white font-bold py-3 rounded-full disabled:opacity-50">
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}