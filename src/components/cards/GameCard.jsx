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

export default function GameCard({ card, size = "md", onDelete, glow, faceDown, statusEffects = [], hpRatio = 1, boost = null }) {
  const isHybrid = card.isHybrid;
  const Icon = isHybrid ? HelpCircle : TYPE_ICONS[card.type] || Sparkles;
  const color = isHybrid ? "#FFD700" : TYPE_COLORS[card.type];
  const sizes = { xs: "w-14 h-20", hand: "w-16 h-24", sm: "w-20 h-28", md: "w-32 h-44", lg: "w-40 h-56" };
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

  if (faceDown) {
    return (
      <div className={`relative ${sizes[size]} rounded-2xl border-2 border-white/20 shadow-xl overflow-hidden`}>
        <img src={CARD_BACK_URL} alt="Face down card" className="w-full h-full object-cover" />
      </div>
    );
  }

  const cardBody = (
    <div
      className={`relative ${isHybrid ? "w-full h-full" : sizes[size]} rounded-2xl ${isHybrid ? "" : "border-2"} shadow-xl flex flex-col overflow-hidden transition-all ${
        glow || isMaxedT4 ? "shadow-[0_0_25px_6px_rgba(255,215,0,0.85)] animate-pulse" : ""
      }`}
      style={{
        borderColor: isMaxedT4 ? "#FFD700" : color,
        background: "linear-gradient(160deg, #0D1B2A 0%, #1A2E45 100%)",
        opacity: cardOpacity,
      }}
    >
      <div
        className={`absolute top-1 left-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white ${
          boost?.tier ? "ring-2 ring-yellow-300 animate-pulse" : ""
        }`}
        style={{ background: boost?.tier ? "#FFD700" : color }}
      >
        T{boost?.tier || card.tier}
      </div>
      <div className="absolute top-1 right-1 flex flex-col items-end gap-1">
        <div className="p-1 rounded-full bg-black/50">
          <Icon className="w-3 h-3" style={{ color }} />
        </div>
        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(card.id);
            }}
            className="p-1 rounded-full bg-black/50 text-red-400 hover:text-red-300"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>
      <div className="flex-1 relative flex items-center justify-center">
        {card.imageUrl ? (
          <img src={card.imageUrl} alt={card.name} className="w-full h-full object-cover" />
        ) : (
          <Icon className="w-8 h-8" style={{ color }} />
        )}
        {effectGroups.map((g) => (
          <div key={g} className={`absolute inset-0 pointer-events-none ${EFFECT_OVERLAY_CLASS[g]}`} style={{ opacity: intensity }} />
        ))}
      </div>
      <div className="px-1.5 pb-1.5 text-center">
        <p className="text-white font-bold text-[11px] leading-tight truncate">{card.name}</p>
        <div className="flex justify-center gap-1 mt-1 text-[9px] font-semibold">
          <span className={boost?.attack ? "text-yellow-300 animate-pulse" : "text-orange-300"}>A{boost?.attack || card.attack}</span>
          <span className={boost?.defense ? "text-yellow-300 animate-pulse" : "text-blue-300"}>D{boost?.defense || card.defense}</span>
        </div>
        {card.bonusDamage > 0 && (
          <div className="flex items-center justify-center gap-1 text-[8px] text-yellow-300">
            <span>+{card.bonusDamage}</span>
            <span className="flex gap-0.5">
              {isHybrid ? (
                <HelpCircle className="w-2 h-2" style={{ color: "#FFD700" }} />
              ) : (
                (TYPE_ADVANTAGES[card.type] || []).map((t) => {
                  const TIcon = TYPE_ICONS[t];
                  return <TIcon key={t} className="w-2 h-2" style={{ color: TYPE_COLORS[t] }} />;
                })
              )}
            </span>
          </div>
        )}
      </div>
    </div>
  );

  if (isHybrid) {
    return (
      <div
        className={`${sizes[size]} rounded-2xl p-[3px] ${glow || isMaxedT4 ? "animate-pulse" : ""}`}
        style={{ background: "conic-gradient(from 180deg, #ff0000, #ff9900, #ffee00, #33ff00, #00ffee, #0066ff, #9900ff, #ff0000)" }}
      >
        {cardBody}
      </div>
    );
  }

  return cardBody;
}