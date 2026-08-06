import React from "react";
import { Flame, Zap, Droplet, Snowflake, Mountain, Wind, Sprout, Sparkles, HelpCircle, Trash2 } from "lucide-react";
import { TYPE_COLORS, TYPE_ADVANTAGES, CARD_BACK_URL, CARD_FRONT_TEMPLATE_URL, TYPE_EFFECT_GROUP, MAX_STAT_UPGRADES_PER_TIER } from "@/lib/gameConstants";

const TYPE_ICONS = { Fire: Flame, Lava: Zap, Water: Droplet, Ice: Snowflake, Rock: Mountain, Wind: Wind, Earth: Sprout, Magic: Sparkles };

const EFFECT_OVERLAY_CLASS = {
  burn: "bg-gradient-to-t from-orange-900/80 via-red-700/40 to-transparent mix-blend-multiply",
  freeze: "bg-gradient-to-b from-cyan-100/60 to-blue-400/40 mix-blend-screen",
  scratch: "bg-[repeating-linear-gradient(45deg,rgba(0,0,0,0.55)_0px,rgba(0,0,0,0.55)_2px,transparent_2px,transparent_8px)]",
  dissolve: "bg-gradient-to-br from-blue-900/40 via-transparent to-blue-900/60",
};

// Gold / accent colors taken from the card-front template.
const GOLD = "#d4af37";
const ATTACK_COLOR = "#d9855b";
const DEFENSE_COLOR = "#8ab5d0";
const FOOTER_BG = "#100a06";
const TEXT_SHADOW = "0 1px 2px rgba(0,0,0,0.9)";

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

  if (faceDown) {
    return (
      <div className={`relative ${sizes[size]} rounded-2xl border-2 border-white/20 shadow-xl overflow-hidden`}>
        <img src={CARD_BACK_URL} alt="Face down card" className="w-full h-full object-cover" />
      </div>
    );
  }

  const cardBody = (
    <div
      className={`relative w-full h-full rounded-xl overflow-hidden shadow-xl transition-all ${
        glow || isMaxedT4 ? "shadow-[0_0_25px_6px_rgba(255,215,0,0.85)] animate-pulse" : ""
      }`}
      style={{ opacity: cardOpacity }}
    >
      {/* Template frame (base layer) */}
      <img src={CARD_FRONT_TEMPLATE_URL} alt="" className="absolute inset-0 w-full h-full object-cover pointer-events-none" />

      {/* Creature art inside the template's white art box (~4%–72%) */}
      <div className="absolute top-[4%] left-[6%] right-[6%] bottom-[28%] overflow-hidden">
        {card.imageUrl ? (
          <img src={card.imageUrl} alt={card.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Icon className="w-7 h-7" style={{ color: typeColor, opacity: 0.6 }} />
          </div>
        )}
        {effectGroups.map((g) => (
          <div key={g} className={`absolute inset-0 pointer-events-none ${EFFECT_OVERLAY_CLASS[g]}`} style={{ opacity: intensity }} />
        ))}
      </div>

      {/* Tier badge (overlays the baked T1 ornament so the correct tier shows) */}
      <div
        className={`absolute z-10 flex items-center justify-center rounded-full font-serif font-bold text-white ${boost?.tier ? "ring-2 ring-yellow-300 animate-pulse" : ""}`}
        style={{
          top: "2.5%",
          left: "4.5%",
          width: "15%",
          aspectRatio: "1 / 1",
          background: "rgba(10,10,16,0.85)",
          border: `2px solid ${boost?.tier ? "#FFD700" : GOLD}`,
          color: boost?.tier ? "#FFD700" : GOLD,
          fontSize: "11px",
        }}
      >
        T{boost?.tier || card.tier}
      </div>

      {/* Delete control */}
      {onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(card.id);
          }}
          className="absolute z-10 top-1 right-1 p-1 rounded-full bg-black/60 text-red-400 hover:text-red-300"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      )}

      {/* Footer: name + stats — aligned to the template's dark footer (~72%–97%),
          styled to match the baked placeholder text (gold serif Name, orange A, pale-blue D, gold +) */}
      <div
        className="absolute left-[6%] right-[6%] top-[72%] bottom-[3%] flex flex-col items-center justify-center gap-0.5 text-center"
        style={{ background: FOOTER_BG }}
      >
        <div className="w-[70%] h-px bg-[#7a5a2b]/70 mb-0.5" />
        <p
          className="font-serif font-bold leading-tight truncate w-[92%]"
          style={{ color: GOLD, fontSize: "12px", textShadow: TEXT_SHADOW }}
        >
          {card.name}
        </p>
        <div className="w-[70%] h-px bg-[#7a5a2b]/70 my-0.5" />
        <div className="flex items-center justify-center gap-1.5 font-serif font-bold" style={{ fontSize: "13px", textShadow: TEXT_SHADOW }}>
          <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: typeColor }} />
          <span className={boost?.attack ? "ring-1 ring-amber-400 rounded px-0.5" : ""} style={{ color: ATTACK_COLOR }}>
            A{boost?.attack ?? card.attack}
          </span>
          <span className={boost?.defense ? "ring-1 ring-amber-400 rounded px-0.5" : ""} style={{ color: DEFENSE_COLOR }}>
            D{boost?.defense ?? card.defense}
          </span>
        </div>
        <div className="w-[70%] h-px bg-[#7a5a2b]/70 mt-0.5" />
        {card.bonusDamage > 0 && (
          <div className="flex items-center justify-center gap-0.5 font-serif font-bold" style={{ color: GOLD, fontSize: "12px", textShadow: TEXT_SHADOW }}>
            <span>+{card.bonusDamage}</span>
            {isHybrid ? (
              <HelpCircle className="w-2.5 h-2.5" style={{ color: "#FFD700" }} />
            ) : (
              (TYPE_ADVANTAGES[card.type] || []).map((t) => {
                const TIcon = TYPE_ICONS[t];
                return <TIcon key={t} className="w-2.5 h-2.5" style={{ color: TYPE_COLORS[t] }} />;
              })
            )}
          </div>
        )}
      </div>
    </div>
  );

  if (isHybrid) {
    return (
      <div
        className={`${sizes[size]} rounded-xl p-[3px] ${glow || isMaxedT4 ? "animate-pulse" : ""}`}
        style={{ background: "conic-gradient(from 180deg, #ff0000, #ff9900, #ffee00, #33ff00, #00ffee, #0066ff, #9900ff, #ff0000)" }}
      >
        <div className="w-full h-full rounded-[7px] overflow-hidden">{cardBody}</div>
      </div>
    );
  }

  return <div className={sizes[size]}>{cardBody}</div>;
}