import React, { useState } from "react";
import { LifeBuoy, X } from "lucide-react";
import { base44 } from "@/api/base44Client";

const MAX_LENGTH = 500;

export default function SupportModal({ onClose }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    if (!title.trim() || !description.trim()) {
      setError("Please fill in both fields.");
      return;
    }
    setSubmitting(true);
    setError("");
    const { data } = await base44.functions.invoke("submitSupportTicket", { title, description });
    setSubmitting(false);
    if (data?.error) {
      setError(data.error);
      return;
    }
    setSent(true);
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center px-4">
      <div className="bg-[#1A2E45] rounded-2xl p-5 max-w-md w-full border border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-black text-lg flex items-center gap-2">
            <LifeBuoy className="w-5 h-5 text-amber-400" /> Support Ticket
          </h2>
          <button onClick={onClose}>
            <X className="w-5 h-5 text-white/50" />
          </button>
        </div>

        {sent ? (
          <>
            <p className="text-white/70 text-sm mb-6">Your support ticket has been sent. We'll get back to you soon!</p>
            <button onClick={onClose} className="w-full bg-amber-500 text-black font-bold py-3 rounded-full">
              Close
            </button>
          </>
        ) : (
          <>
            <label className="text-white/50 text-xs mb-1 block">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief summary of your issue"
              className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm mb-4 text-white placeholder:text-white/30"
            />

            <label className="text-white/50 text-xs mb-1 block">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, MAX_LENGTH))}
              placeholder="Describe your issue in detail..."
              rows={5}
              className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm mb-1 text-white placeholder:text-white/30 resize-none"
            />
            <p className="text-white/30 text-[10px] mb-4 text-right">{description.length}/{MAX_LENGTH}</p>

            {error && <p className="text-red-400 text-xs mb-3">{error}</p>}

            <div className="space-y-2">
              <button
                onClick={handleSend}
                disabled={submitting}
                className="w-full bg-amber-500 text-black font-bold py-3 rounded-full disabled:opacity-50"
              >
                {submitting ? "Sending..." : "Send"}
              </button>
              <button onClick={onClose} disabled={submitting} className="w-full bg-white/10 font-bold py-3 rounded-full disabled:opacity-50">
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}