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
const GOLD = "#c5a059";
const ATTACK_COLOR = "#c97d53";
const DEFENSE_COLOR = "#8eb5c5";
const FOOTER_BG = "#1a1a24";
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

      {/* Creature art inside the template's white art box (measured 4.1%–72.36% / 5.33%–93.87%) */}
      <div className="absolute top-[4.1%] left-[5.3%] right-[6.1%] bottom-[27.6%] overflow-hidden">
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

      {/* Footer text layer — the template's own ornate footer (filigree, dividers, corner
          badges, tier ornaments) stays fully visible; we only overprint the baked
          placeholder text ("Name" / "A0" / "D0" / "+0") with the real values, each on a
          small footer-colored pill that masks the placeholder behind it. No opaque
          full-footer box — the template IS the layout. */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Name */}
        <div className="absolute left-0 right-0 flex justify-center" style={{ top: "78.6%" }}>
          <span
            className="font-serif font-bold text-center px-3 py-0.5 rounded max-w-[88%] truncate"
            style={{ background: FOOTER_BG, color: GOLD, fontSize: "12px", textShadow: TEXT_SHADOW }}
          >
            {card.name}
          </span>
        </div>

        {/* Attack / Defense */}
        <div
          className="absolute left-0 right-0 flex justify-center items-center font-serif font-bold"
          style={{ top: "84.3%", fontSize: "13px" }}
        >
          <span className="flex items-center gap-1.5 px-3 py-0.5 rounded" style={{ background: FOOTER_BG, textShadow: TEXT_SHADOW }}>
            <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: typeColor }} />
            <span className={boost?.attack ? "ring-1 ring-amber-400 rounded px-0.5" : ""} style={{ color: ATTACK_COLOR }}>
              A{boost?.attack ?? card.attack}
            </span>
            <span className={boost?.defense ? "ring-1 ring-amber-400 rounded px-0.5" : ""} style={{ color: DEFENSE_COLOR }}>
              D{boost?.defense ?? card.defense}
            </span>
          </span>
        </div>

        {/* Bonus damage */}
        {card.bonusDamage > 0 && (
          <div className="absolute left-0 right-0 flex justify-center" style={{ top: "87.2%" }}>
            <span
              className="flex items-center justify-center gap-0.5 px-3 py-0.5 rounded font-serif font-bold"
              style={{ background: FOOTER_BG, color: GOLD, fontSize: "12px", textShadow: TEXT_SHADOW }}
            >
              <span>+{card.bonusDamage}</span>
              {isHybrid ? (
                <HelpCircle className="w-2.5 h-2.5" style={{ color: "#FFD700" }} />
              ) : (
                (TYPE_ADVANTAGES[card.type] || []).map((t) => {
                  const TIcon = TYPE_ICONS[t];
                  return <TIcon key={t} className="w-2.5 h-2.5" style={{ color: TYPE_COLORS[t] }} />;
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
        className={`${sizes[size]} rounded-xl p-[3px] ${glow || isMaxedT4 ? "animate-pulse" : ""}`}
        style={{ background: "conic-gradient(from 180deg, #ff0000, #ff9900, #ffee00, #33ff00, #00ffee, #0066ff, #9900ff, #ff0000)" }}
      >
        <div className="w-full h-full rounded-[7px] overflow-hidden">{cardBody}</div>
      </div>
    );
  }

  return <div className={sizes[size]}>{cardBody}</div>;
}