import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import GameCard from "@/components/cards/GameCard";
import StatUpgradeRow from "@/components/upgrade/StatUpgradeRow";
import EvolveSection from "@/components/upgrade/EvolveSection";
import TypeChangeSection from "@/components/upgrade/TypeChangeSection";
import { checkUpgradeEligible } from "@/lib/upgradeCheck";
import { getStatUpgradeCost, getStatUpgradeMaxUses } from "@/lib/statUpgradeCost";
import { TIER_RANGES, STAT_UPGRADES, TIER_UPGRADE_COST, TYPE_CHANGE_COST, UPGRADE_REQUIREMENT } from "@/lib/gameConstants";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { play } from "@/lib/soundEngine";

const USED_FIELD = { attack: "attackUpgradesUsed", defense: "defenseUpgradesUsed", bonusDamage: "bonusDamageUpgradesUsed" };

export default function CardUpgrade() {
  const { id } = useParams();
  const { toast } = useToast();
  const [card, setCard] = useState(null);
  const [user, setUser] = useState(null);
  const [purchasing, setPurchasing] = useState(null);
  const [evolving, setEvolving] = useState(false);
  const [typePurchasing, setTypePurchasing] = useState(null);

  useEffect(() => {
    (async () => {
      const [c, u] = await Promise.all([base44.entities.Card.get(id), base44.auth.me()]);
      setCard(c);
      setUser(u);
    })();
  }, [id]);

  if (!card || !user) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  const range = TIER_RANGES[card.tier];
  const canEvolve = (user.role === "admin" || checkUpgradeEligible(card)) && card.tier < 4;

  const handlePurchase = async (upg) => {
    if (purchasing) return;
    setPurchasing(upg.key);
    // Ownership, per-tier cap, max-uses, cost, and evolution-line completion are
    // all re-validated server-side by upgradeCardStat.
    try {
      const { data } = await base44.functions.invoke("upgradeCardStat", { cardId: card.id, statKey: upg.key });
      setCard(data.card);
      setUser(data.user);
      play("card_upgrade");
    } catch (err) {
      toast({ title: "Upgrade failed", description: err?.message || "Something went wrong. Please try again.", variant: "destructive" });
    } finally {
      setPurchasing(null);
    }
  };

  const handleChangeType = async (newType) => {
    if (card.typeChanged || user.coins < TYPE_CHANGE_COST || typePurchasing) return;
    setTypePurchasing(newType);
    // Ownership, the one-time typeChanged flag, valid type, and cost are all
    // re-validated server-side by changeCardType.
    try {
      const { data } = await base44.functions.invoke("changeCardType", { cardId: card.id, newType });
      setCard(data.card);
      setUser(data.user);
      play("card_upgrade");
    } catch (err) {
      toast({ title: "Type change failed", description: err?.message || "Something went wrong. Please try again.", variant: "destructive" });
    } finally {
      setTypePurchasing(null);
    }
  };

  const handleEvolve = async () => {
    if (!canEvolve || user.coins < TIER_UPGRADE_COST || evolving) return;
    setEvolving(true);
    try {
      // Eligibility, cost, and stat/image generation are all re-validated server-side
      // so the client's canEvolve check can't be bypassed to evolve for free.
      const { data } = await base44.functions.invoke("evolveCard", { cardId: card.id });
      setCard((c) => ({ ...c, ...data.card }));
      setUser(data.user);
      play("card_upgrade");
    } finally {
      setEvolving(false);
    }
  };

  return (
    <div className="text-white px-6 py-6">
      <Link to="/deck" className="inline-flex items-center gap-1 text-white/60 text-sm mb-6 min-h-[44px] px-1 -ml-1">
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>
      <div className="flex justify-center mb-6">
        <GameCard card={card} size="lg" />
      </div>
      <h2 className="text-lg font-bold mb-3">Stat Upgrades</h2>
      <div className="space-y-3">
        {STAT_UPGRADES.map((upg) => {
          const usesInTier = card[USED_FIELD[upg.key]] || 0;
          const maxUses = getStatUpgradeMaxUses(card.tier);
          return (
            <StatUpgradeRow
              key={upg.key}
              upgrade={upg}
              card={card}
              coins={user.coins || 0}
              purchasing={purchasing === upg.key}
              onPurchase={handlePurchase}
              capValue={upg.key === "bonusDamage" ? range.bonusMax : range.statMax}
              cost={getStatUpgradeCost(card.tier, upg.key, usesInTier)}
              usesInTier={usesInTier}
              maxUses={maxUses}
            />
          );
        })}
      </div>
      {!card.isHybrid && (
        <TypeChangeSection card={card} coins={user.coins || 0} purchasing={typePurchasing} onChangeType={handleChangeType} />
      )}
      {card.tier < 4 && (
        <>
          <p className="text-[10px] text-white/40 mt-4">
            Destroyed {card.totalWins || 0}/{UPGRADE_REQUIREMENT.cardsDestroyed} · Games {card.totalGames || 0}/{UPGRADE_REQUIREMENT.gamesPlayed} · Match wins {card.matchWins || 0}/{UPGRADE_REQUIREMENT.matchWins}
          </p>
          <EvolveSection
            canEvolve={canEvolve}
            cost={TIER_UPGRADE_COST}
            coins={user.coins || 0}
            evolving={evolving}
            onEvolve={handleEvolve}
            tier={card.tier}
          />
        </>
      )}
    </div>
  );
}