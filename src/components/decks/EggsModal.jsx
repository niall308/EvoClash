import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { X, Loader2, Egg } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";

const EGG_IMG = "https://media.base44.com/images/public/6a4fdbc484df527c16219edb/78ba2e7fa_Egg-design.png";

export default function EggsModal({ onClose, onUserUpdate }) {
  const { toast } = useToast();
  const [eggs, setEggs] = useState(null);
  const [payingId, setPayingId] = useState(null);
  const today = new Date().toISOString().slice(0, 10);

  const load = async () => {
    try {
      await base44.functions.invoke("reconcileEggs", {});
    } catch (e) {
      /* best-effort */
    }
    const list = await base44.entities.Egg.filter({}, "-created_date");
    setEggs(list);
  };

  useEffect(() => {
    load();
  }, []);

  const pay = async (egg) => {
    setPayingId(egg.id);
    try {
      const res = await base44.functions.invoke("payHatchDay", { eggId: egg.id });
      setEggs((prev) => (prev || []).map((e) => (e.id === egg.id ? res.data.egg : e)));
      if (res.data.user) onUserUpdate?.(res.data.user);
      if (res.data.missedDays > 0) {
        toast({ title: `Missed ${res.data.missedDays} day(s) — progress reduced.`, description: res.data.paid ? "Paid 250 LC — +1 day!" : undefined });
      } else if (res.data.paid) {
        toast({ title: "Paid 250 LC — +1 day!" });
      } else {
        toast({ title: "Already paid today — come back tomorrow." });
      }
    } catch (e) {
      toast({ title: e.response?.data?.error || "Payment failed", variant: "destructive" });
    } finally {
      setPayingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div
        className="w-full max-w-md bg-[#0D1B2A] rounded-t-3xl sm:rounded-3xl border border-white/10 p-5 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Egg className="w-5 h-5 text-amber-400" /> Creature Eggs
          </h2>
          <button onClick={onClose} aria-label="Close">
            <X className="w-5 h-5 text-white/60" />
          </button>
        </div>

        {!eggs ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-white/50" />
          </div>
        ) : eggs.length === 0 ? (
          <p className="text-center text-white/50 text-sm py-8">No eggs yet. Visit the Egg Store to buy one!</p>
        ) : (
          <div className="space-y-4">
            {eggs.map((egg, i) => {
              const ready = egg.status === "ready" || (egg.progress || 0) >= 30;
              const paidToday = egg.lastPaidDate === today;
              const pct = Math.min(100, ((egg.progress || 0) / 30) * 100);
              return (
                <div key={egg.id} className="rounded-2xl bg-white/5 border border-white/10 p-3 flex gap-3">
                  <img src={EGG_IMG} alt="egg" className="w-16 h-16 rounded-xl object-cover shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-bold text-white text-sm">Egg #{i + 1}</p>
                      {ready && (
                        <span className="text-[10px] font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full whitespace-nowrap">
                          Ready to hatch!
                        </span>
                      )}
                    </div>
                    <div className="mt-2">
                      <div className="flex justify-between text-[11px] text-white/50 mb-1">
                        <span>Hatch progress</span>
                        <span>{egg.progress || 0}/30</span>
                      </div>
                      <Progress value={pct} className="h-2 [&_>div]:bg-amber-500" />
                    </div>
                    <button
                      onClick={() => pay(egg)}
                      disabled={ready || paidToday || payingId === egg.id}
                      className={`mt-2 w-full py-2 rounded-full text-xs font-bold flex items-center justify-center gap-1 ${
                        ready
                          ? "bg-amber-500/20 text-amber-300"
                          : paidToday
                            ? "bg-white/10 text-white/40"
                            : "bg-gradient-to-r from-amber-500 to-yellow-400 text-black active:scale-95"
                      }`}
                    >
                      {payingId === egg.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : ready ? (
                        "Ready — hatch coming soon"
                      ) : paidToday ? (
                        "Paid today — come back tomorrow"
                      ) : (
                        "Pay 250 LC (+1 day)"
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}