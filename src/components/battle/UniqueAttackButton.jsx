import React from "react";
import { cardUniqueAttack, UNIQUE_ATTACK_I18N } from "@/lib/uniqueAttacks";

// Inline white sword icon (stroke-based so it stays crisp at 20px). Matches the
// visual weight of the lucide icons used by the power-up buttons.
function SwordIcon({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="white"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M14.5 17.5 3 6V3h3l11.5 11.5" />
      <path d="m13 19 6-6" />
      <path d="m16 16 4 4" />
      <path d="m19 21 2-2" />
    </svg>
  );
}

// Deep-purple Unique Attack button. Sized to match the power-up buttons (w-14 h-14,
// rounded-2xl, icon + tiny label) so it aligns with them across the bottom bar.
// Shows only when the active card has an unused unique attack (parent gates this,
// and this component also no-ops if no definition resolves for the card).
export default function UniqueAttackButton({ card, used, disabled, onClick }) {
  const def = cardUniqueAttack(card);
  if (!def) return null;

  const isUsed = !!used;
  const isDisabled = isUsed || disabled;
  const ariaLabel = `Use Unique Attack: ${def.name}`;
  const title = `${def.name} • ${def.percent}% • ${
    def.target === "all" ? UNIQUE_ATTACK_I18N.allTargets : UNIQUE_ATTACK_I18N.singleTarget
  }${def.effect ? " • " + def.effect : ""}`;

  return (
    <button
      type="button"
      onClick={isDisabled ? undefined : onClick}
      disabled={isDisabled}
      aria-label={ariaLabel}
      title={title}
      className={`relative flex flex-col items-center justify-center gap-0.5 w-14 h-14 rounded-2xl shadow-lg transition-transform ${
        isUsed ? "opacity-50 grayscale" : "active:scale-95 hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-purple-300"
      }`}
      style={{
        background: isUsed ? "#3a3a4a" : "linear-gradient(160deg, #6A0DAD 0%, #4B0082 100%)",
      }}
    >
      <SwordIcon className="w-5 h-5" />
      <span className="text-[7px] font-bold text-white leading-none text-center px-0.5 line-clamp-2">
        {isUsed ? UNIQUE_ATTACK_I18N.usedBadge : def.name}
      </span>
      {isUsed && (
        <span
          className="absolute -top-1 -right-1 text-white text-[8px] font-black w-7 h-4 rounded-full flex items-center justify-center"
          style={{ background: "#6A0DAD" }}
        >
          {UNIQUE_ATTACK_I18N.usedBadge}
        </span>
      )}
    </button>
  );
}