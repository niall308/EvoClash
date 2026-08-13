import React, { useState } from "react";
import { RotateCcw } from "lucide-react";
import { getIapManager } from "@/lib/iapManager";

// "Restore Purchases" — required on iOS. Calls iapManager.restorePurchases(),
// which hits the server (getIapStatus) to re-sync entitlements across devices.
export default function RestorePurchasesButton() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const onRestore = async () => {
    setBusy(true);
    setMsg("");
    try {
      const iap = getIapManager();
      const entitlements = await iap.restorePurchases();
      const count = Array.isArray(entitlements) ? entitlements.length : 0;
      setMsg(count ? `Restored ${count} purchase(s).` : "No previous purchases to restore.");
    } catch {
      setMsg("Restore failed — try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onRestore}
        disabled={busy}
        className="flex items-center gap-1.5 bg-white/10 text-xs font-bold px-3 py-2 rounded-full active:scale-95 transition-transform disabled:opacity-60"
      >
        <RotateCcw className="w-4 h-4" /> {busy ? "Restoring..." : "Restore"}
      </button>
      {msg && <span className="text-white/50 text-xs">{msg}</span>}
    </div>
  );
}