import React, { useState } from "react";
import ModalShell from "./ModalShell";

// Confirm dialog with an optional admin note. Used for approve/reject actions.
// confirmClass tailors the action button color (emerald/red/amber).
export default function ConfirmNoteModal({ title, message, confirmLabel, confirmClass = "bg-emerald-600", noteLabel, onConfirm, onClose }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    try {
      await onConfirm(note.trim());
    } finally {
      setBusy(false);
    }
    onClose();
  };
  return (
    <ModalShell title={title} onClose={onClose} maxWidth="max-w-sm">
      <p className="text-white/70 text-sm mb-3">{message}</p>
      {noteLabel && (
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={noteLabel}
          rows={2}
          className="w-full bg-white/10 rounded-md px-3 py-2 text-sm outline-none resize-none mb-4"
        />
      )}
      <div className="flex gap-2 justify-end">
        <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm bg-white/10 text-white">
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={busy}
          className={`px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-60 ${confirmClass}`}
        >
          {busy ? "Working…" : confirmLabel}
        </button>
      </div>
    </ModalShell>
  );
}