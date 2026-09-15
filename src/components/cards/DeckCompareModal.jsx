import React, { useState } from "react";
import { X, ChevronLeft, ChevronRight, Trash2, Loader2, Swords, Shield } from "lucide-react";
import GameCard from "@/components/cards/GameCard";

// Enlarged comparison popup for the player Deck. The focused card sits in the
// center with the previous/next deck cards as smaller previews on either side;
// attack & defense bars (normalized to the deck's max) sit under each card so
// the three read side-by-side. Left/right arrows (or tapping a neighbor) step
// the focus; Delete removes the focused card and refocuses the next one.
export default function DeckCompareModal({ cards, startIndex, onDelete, onClose }) {
  const [list, setList] = useState(cards);
  const [idx, setIdx] = useState(Math.min(startIndex, (cards?.length || 1) - 1));
  const [busy, setBusy] = useState(false);

  const clamp = (i) => (list.length ? Math.max(0, Math.min(i, list.length - 1)) : 0);
  const current = list[idx];
  const prev = idx > 0 ? list[idx - 1] : null;
  const next = idx < list.length - 1 ? list[idx + 1] : null;

  const maxAttack = Math.max(1, ...list.map((c) => c.attack || 0));
  const maxDefense = Math.max(1, ...list.map((c) => c.defense || 0));

  const go = (delta) => setIdx((i) => clamp(i + delta));

  const remove = async () => {
    if (!current || busy) return;
    setBusy(true);
    try {
      await onDelete(current);
      const nextList = list.filter((c) => c.id !== current.id);
      setList(nextList);
      setIdx((i) => Math.min(i, nextList.length - 1));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-[60] flex flex-col items-center justify-center p-4">
      <button onClick={onClose} className="absolute top-4 right-4 text-white/60 hover:text-white p-2" aria-label="Close">
        <X className="w-6 h-6" />
      </button>

      <p className="text-white/70 text-sm mb-4">{list.length ? `${idx + 1} / ${list.length}` : "Deck empty"}</p>

      <div className="flex items-end justify-center gap-2 sm:gap-4 w-full max-w-2xl">
        {/* Previous neighbor */}
        <NeighborSlot card={prev} side="left" onClick={() => prev && go(-1)} />

        {/* Center focused card */}
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-2">
            <button onClick={() => go(-1)} disabled={!prev} className="p-2 rounded-full bg-white/10 text-white disabled:opacity-20 active:scale-95 transition" aria-label="Previous card">
              <ChevronLeft className="w-6 h-6" />
            </button>
            {current ? <GameCard card={current} size="lg" /> : <div className="w-40 h-56 flex items-center justify-center text-white/40 text-sm">No cards</div>}
            <button onClick={() => go(1)} disabled={!next} className="p-2 rounded-full bg-white/10 text-white disabled:opacity-20 active:scale-95 transition" aria-label="Next card">
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Next neighbor */}
        <NeighborSlot card={next} side="right" onClick={() => next && go(1)} />
      </div>

      {/* Side-by-side stat comparison */}
      <div className="grid grid-cols-3 gap-2 sm:gap-6 w-full max-w-2xl mt-5">
        <StatColumn card={prev} maxAttack={maxAttack} maxDefense={maxDefense} dim />
        <StatColumn card={current} maxAttack={maxAttack} maxDefense={maxDefense} highlight />
        <StatColumn card={next} maxAttack={maxAttack} maxDefense={maxDefense} dim />
      </div>

      <button
        onClick={remove}
        disabled={!current || busy}
        className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-red-600 text-white font-bold disabled:opacity-50 active:scale-95 transition mt-6"
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Remove Card
      </button>
    </div>
  );
}

function NeighborSlot({ card, side, onClick }) {
  return (
    <button onClick={onClick} disabled={!card} className="flex flex-col items-center self-center disabled:opacity-0 transition active:scale-95">
      {card ? <GameCard card={card} size="sm" /> : <div className="w-20 h-28" />}
    </button>
  );
}

function StatColumn({ card, maxAttack, maxDefense, highlight, dim }) {
  if (!card) return <div className="opacity-0 hidden sm:block" />;
  const aPct = Math.round(((card.attack || 0) / maxAttack) * 100);
  const dPct = Math.round(((card.defense || 0) / maxDefense) * 100);
  const labelCls = `text-xs font-bold ${highlight ? "text-white" : "text-white/60"}`;
  const valCls = `text-sm font-black ${highlight ? "text-white" : "text-white/70"}`;
  return (
    <div className={`flex flex-col items-center gap-2 ${dim ? "opacity-70" : ""}`}>
      <p className={`${labelCls} truncate max-w-[5.5rem]`}>{card.name}</p>
      <StatBar icon={Swords} value={card.attack} pct={aPct} color="from-orange-500 to-red-500" valCls={valCls} />
      <StatBar icon={Shield} value={card.defense} pct={dPct} color="from-sky-500 to-blue-500" valCls={valCls} />
      {card.bonusDamage > 0 && <p className="text-[10px] font-bold text-amber-300">+{card.bonusDamage} bonus</p>}
    </div>
  );
}

function StatBar({ icon: Icon, value, pct, color, valCls }) {
  return (
    <div className="w-full flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <Icon className="w-3 h-3 text-white/50" />
        <span className={valCls}>{value}</span>
      </div>
      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
        <div className={`h-full rounded-full bg-gradient-to-r ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}