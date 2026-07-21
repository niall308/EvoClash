import React from "react";
import { Shield, Award, Flame, Gem, Mountain, Sparkles, Star, Crown } from "lucide-react";
import { getRankByRP } from "@/lib/rankSystem";

const RANK_ICONS = {
  Bronze: Shield,
  Silver: Shield,
  Gold: Shield,
  Apex: Award,
  Feral: Flame,
  Mythic: Gem,
  Titan: Mountain,
  Primordial: Sparkles,
  Ascendant: Star,
  "Eternal Apex": Crown,
};

const SIZES = { sm: "w-6 h-6", md: "w-8 h-8", lg: "w-10 h-10" };
const ICON_SIZES = { sm: "w-3.5 h-3.5", md: "w-4.5 h-4.5", lg: "w-5.5 h-5.5" };

export default function RankEmblem({ rp, size = "md" }) {
  const rank = getRankByRP(rp);
  const Icon = RANK_ICONS[rank.name] || Shield;

  return (
    <div
      className={`flex items-center justify-center rounded-full border-2 shrink-0 ${SIZES[size]}`}
      style={{ borderColor: rank.color, background: `${rank.color}22` }}
      title={`${rank.name} (Rank ${rank.number})`}
    >
      <Icon className={ICON_SIZES[size]} style={{ color: rank.color }} />
    </div>
  );
}