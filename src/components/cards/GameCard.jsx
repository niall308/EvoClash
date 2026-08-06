import React from "react";
import { Flame, Zap, Droplet, Snowflake, Mountain, Wind, Sprout, Sparkles, Trash2, HelpCircle } from "lucide-react";
import { TYPE_COLORS, TYPE_ADVANTAGES, CARD_BACK_URL, TYPE_EFFECT_GROUP, MAX_STAT_UPGRADES_PER_TIER } from "@/lib/gameConstants";

const TYPE_ICONS = { Fire: Flame, Lava: Zap, Water: Droplet, Ice: Snowflake, Rock: Mountain, Wind: Wind, Earth: Sprout, Magic: Sparkles };

const EFFECT_OVERLAY_CLASS = {
  burn: "bg-gradient-to-t from-orange-900/80 via-red-700/40 to-transparent mix-blend-multiply",
  freeze: "bg-gradient-to-b from-cyan-100/60 to-blue-400/40 mix-blend-screen",
  scratch: "bg-[repeating-linear-gradient(45deg,rgba(0,0,0,0.55)_0px,rgba(0,0,0,0.55)_2px,transparent_2px,transparent_8px)]",
  dissolve: "bg-gradient-to-br from-blue-900/40 via-transparent to-blue-900/60",
};

const OrnateDivider = () => (
  <div className="flex items-center gap-1 px-2 my-0.5">
    <span className="h-px flex-1 bg-gradient-to-r from-transparent via-[#C5A059]/40 to-[#C5A059]/60" />
    <span className="text-[#C5A059] leading-none" style={{ fontSize: "5px", transform: "rotate(45deg)" }}>◆</span>
    <span className="h-px flex-1 bg-gradient-to-l from-transparent via-[#C5A059]/40 to-[#C5A059]/60" />
  </div>
);

export default function GameCard({ card, size = "md", onDelete, glow, faceDown, statusEffects = [], hpRatio = 1, boost = null }) {
  const isHybrid = card.isHybrid;
  const Icon = isHybrid ? HelpCircle : TYPE_ICONS[card.type] || Sparkles;
  const typeColor = isHybrid ? "#FFD700" : TYPE_COLORS[card.type];
  const sizes = { xs: "w-14 h-20", hand: "w-24 h-36", sm: "w-20 h-28", md: "w-32 h-44", lg: "w-40 h-56" };
  const intensity = Math.min(0.85, 0.3 + (1 - hpRatio) * 0.55);
  const effectGroups = [...new Set(statusEffects.map((t) => TYPE_EFFECT_GROUP[t]).filter(Boolean))];
  const isFading = effectGroups.includes("fade") || effectGroups.includes("dissolve");
  const cardOpacity = isFading ? Math.max(0.35, hpRatio) : 1;
  const maxUpgrades = MAX_STAT_UPGRADES_PER_TIER[card.tier] || 0;
  const isMaxedT4 =
    card.tier === 4 &&
    (card.attackUpgradesUsed || 0) >= maxUpgrades &&
    (card.defenseUpgradesUsed || 0) >= maxUpgrades &&
    (card.bonusDamageUpgradesUsed || 0) >= maxUpgrades;
  const buffedAttack = boost?.attack || card.attack;
  const buffedDefense = boost?.defense || card.defense;
  const effectiveTier = boost?.tier || card.tier;
  const advantageTypes = TYPE_ADVANTAGES[card.type] || [];
  const hasOrb = card.bonusDamage > 0 || isHybrid;

  if (faceDown) {
    return (
      <div className={`relative ${sizes[size]} rounded-2xl border-2 border-white/20 shadow-xl overflow-hidden`}>
        <img src={CARD_BACK_URL} alt="Face down card" className="w-full h-full object-cover" />
      </div>
    );
  }

  const cardBody = (
    <div
      className={`relative ${isHybrid ? "w-full h-full" : sizes[size]} rounded-[10px] p-[3px] shadow-xl transition-all ${
        glow || isMaxedT4 ? "shadow-[0_0_25px_6px_rgba(255,215,0,0.85)] animate-pulse" : ""
      }`}
      style={{
        background: "linear-gradient(160deg, #D8D8D8 0%, #8A8A8A 50%, #5A5A5A 100%)",
        opacity: cardOpacity,
      }}
    >
      {/* Gold filigree corner accents on the metallic frame */}
      <span className="pointer-events-none absolute bottom-0 left-0 w-3 h-3 rounded-bl-[8px]" style={{ background: "radial-gradient(circle at 0% 100%, #C5A059 0%, #8A6A2E 55%, transparent 75%)" }} />
      <span className="pointer-events-none absolute bottom-0 right-0 w-3 h-3 rounded-br-[8px]" style={{ background: "radial-gradient(circle at 100% 100%, #C5A059 0%, #8A6A2E 55%, transparent 75%)" }} />

      <div
        className="relative w-full h-full rounded-[8px] overflow-hidden flex flex-col"
        style={{
          background: "linear-gradient(160deg, #0D1B2A 0%, #1A2E45 100%)",
          boxShadow: "inset 0 0 0 1px rgba(197,160,89,0.55)",
        }}
      >
        {/* Tier badge — top-left */}
        <div
          className={`absolute top-1 left-1 z-20 w-7 h-7 rounded-full flex items-center justify-center font-serif font-black ${
            boost?.tier ? "ring-2 ring-yellow-300 animate-pulse" : ""
          }`}
          style={{ background: "linear-gradient(160deg, #5E4A2E 0%, #4E3E26 100%)", boxShadow: "inset 0 0 0 1.5px #C5A059" }}
        >
          <span style={{ color: "#E8C97A", fontSize: "11px", textShadow: "0 1px 1px rgba(0,0,0,0.6)" }}>T{effectiveTier}</span>
        </div>

        {/* Type / delete stack — top-right */}
        <div className="absolute top-1 right-1 z-20 flex flex-col items-end gap-1">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: "linear-gradient(160deg, #5E4A2E 0%, #4E3E26 100%)", boxShadow: "inset 0 0 0 1.5px #C5A059" }}
          >
            <Icon className="w-4 h-4" style={{ color: typeColor }} />
          </div>
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(card.id);
              }}
              className="p-1 rounded-full bg-black/60 text-red-400 hover:text-red-300"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Creature image area (~70%) */}
        <div className="relative flex-1 flex items-center justify-center overflow-hidden" style={{ maxHeight: "70%" }}>
          {card.imageUrl ? (
            <>
              <img src={card.imageUrl} alt={card.name} className="w-full h-full object-cover" />
              <span className="pointer-events-none absolute inset-1 rounded-md" style={{ boxShadow: "inset 0 0 0 1px rgba(197,160,89,0.35)" }} />
            </>
          ) : (
            <Icon className="w-8 h-8" style={{ color: typeColor }} />
          )}
          {effectGroups.map((g) => (
            <div key={g} className={`absolute inset-0 pointer-events-none ${EFFECT_OVERLAY_CLASS[g]}`} style={{ opacity: intensity }} />
          ))}
        </div>

        {/* Lower info panel */}
        <div
          className="relative flex flex-col pt-1.5 pb-1.5 px-1.5 z-10"
          style={{ background: "linear-gradient(180deg, #23232F 0%, #1A1A25 100%)" }}
        >
          {/* watermark pattern */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.06]"
            style={{ backgroundImage: "repeating-linear-gradient(45deg, #C5A059 0 1px, transparent 1px 6px), repeating-linear-gradient(-45deg, #C5A059 0 1px, transparent 1px 6px)" }}
          />
          <OrnateDivider />

          {/* Name */}
          <p
            className="font-serif font-bold text-center leading-tight truncate relative px-1"
            style={{ color: "#E8C97A", fontSize: "11px", textShadow: "0 1px 1px rgba(0,0,0,0.7)" }}
          >
            {card.name}
          </p>

          <OrnateDivider />

          {/* Stats row */}
          <div className="flex items-center justify-center gap-2 relative font-serif font-bold" style={{ fontSize: "11px" }}>
            <Icon className="w-3 h-3" style={{ color: typeColor }} />
            <span
              className={boost?.attack ? "text-yellow-300 animate-pulse ring-1 ring-amber-400 rounded px-1" : ""}
              style={{ color: boost?.attack ? undefined : "#D98850", textShadow: "0 1px 1px rgba(0,0,0,0.6)" }}
            >
              A{buffedAttack}
            </span>
            <span className="text-[#C5A059]/40">·</span>
            <span
              className={boost?.defense ? "text-yellow-300 animate-pulse ring-1 ring-amber-400 rounded px-1" : ""}
              style={{ color: boost?.defense ? undefined : "#84A3B8", textShadow: "0 1px 1px rgba(0,0,0,0.6)" }}
            >
              D{buffedDefense}
            </span>
          </div>

          {/* Bonus footer */}
          <div className="flex items-center justify-center gap-1 relative font-serif font-bold" style={{ fontSize: "10px" }}>
            <span style={{ color: card.bonusDamage > 0 ? "#E8C97A" : "rgba(232,201,122,0.35)", textShadow: "0 1px 1px rgba(0,0,0,0.6)" }}>
              +{card.bonusDamage}
            </span>
            {card.bonusDamage > 0 && (
              <span className="flex gap-0.5">
                {isHybrid ? (
                  <HelpCircle className="w-2 h-2" style={{ color: "#FFD700" }} />
                ) : (
                  advantageTypes.map((t) => {
                    const TIcon = TYPE_ICONS[t];
                    return <TIcon key={t} className="w-2 h-2" style={{ color: TYPE_COLORS[t] }} />;
                  })
                )}
              </span>
            )}
          </div>
        </div>

        {/* Glowing orb — bottom-right (bonus / hybrid power) */}
        {hasOrb && (
          <div
            className="absolute bottom-1 right-1 z-20 w-6 h-6 rounded-full flex items-center justify-center"
            style={{
              background: "radial-gradient(circle at 35% 35%, #B79BFF 0%, #7B3FE4 55%, #3B1E70 100%)",
              boxShadow: "0 0 8px 2px rgba(123,63,228,0.9), inset 0 0 4px rgba(255,255,255,0.5)",
            }}
          >
            <Sparkles className="w-3 h-3 text-white/90" />
          </div>
        )}
      </div>
    </div>
  );

  if (isHybrid) {
    return (
      <div
        className={`${sizes[size]} rounded-[10px] p-[3px] ${glow || isMaxedT4 ? "animate-pulse" : ""}`}
        style={{ background: "conic-gradient(from 180deg, #ff0000, #ff9900, #ffee00, #33ff00, #00ffee, #0066ff, #9900ff, #ff0000)" }}
      >
        {cardBody}
      </div>
    );
  }

  return cardBody;
}