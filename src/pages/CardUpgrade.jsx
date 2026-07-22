import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import GameCard from "@/components/cards/GameCard";
import StatUpgradeRow from "@/components/upgrade/StatUpgradeRow";
import EvolveSection from "@/components/upgrade/EvolveSection";
import TypeChangeSection from "@/components/upgrade/TypeChangeSection";
import { checkUpgradeEligible } from "@/lib/upgradeCheck";
import { getStatUpgradeCost, getStatUpgradeMaxUses } from "@/lib/statUpgradeCost";
import { evolveName, randomInt } from "@/lib/cardGenerator";
import { TIER_RANGES, STYLE_REFERENCE_URL, STAT_UPGRADES, TIER_UPGRADE_COST, TYPE_CHANGE_COST, EVOLVE_ARMOR_PROMPTS, UPGRADE_REQUIREMENT } from "@/lib/gameConstants";
import { ArrowLeft, Loader2 } from "lucide-react";

const USED_FIELD = { attack: "attackUpgradesUsed", defense: "defenseUpgradesUsed", bonusDamage: "bonusDamageUpgradesUsed" };
const TIER_UPGRADE_FIELD = { 2: "tier2Upgrades", 3: "tier3Upgrades", 4: "tier4Upgrades" };

function checkEvolutionLineComplete(card) {
  return (card.attackUpgradesUsed || 0) >= 1 && (card.defenseUpgradesUsed || 0) >= 1 && (card.bonusDamageUpgradesUsed || 0) >= 1;
}

export default function CardUpgrade() {
  const { id } = useParams();
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
      <div className="min-h-screen flex items-center justify-center bg-[#0D1B2A]">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  const range = TIER_RANGES[card.tier];
  const canEvolve = (user.role === "admin" || checkUpgradeEligible(card)) && card.tier < 4;

  const handlePurchase = async (upg) => {
    if (purchasing) return;
    const usedField = USED_FIELD[upg.key];
    const usesInTier = card[usedField] || 0;
    const maxUses = getStatUpgradeMaxUses(card.tier);
    if (usesInTier >= maxUses) return;
    const cost = getStatUpgradeCost(card.tier, upg.key, usesInTier);
    const capValue = upg.key === "bonusDamage" ? range.bonusMax : range.statMax;
    const currentVal = card[upg.key] || 0;
    const newVal = Math.min(capValue, Math.round(currentVal * (1 + upg.percent / 100)));
    if (newVal <= currentVal || user.coins < cost) return;
    setPurchasing(upg.key);
    const updatedCard = { ...card, [upg.key]: newVal, [usedField]: usesInTier + 1 };
    await base44.entities.Card.update(card.id, { [upg.key]: newVal, [usedField]: usesInTier + 1 });
    const userUpdate = { coins: user.coins - cost };
    const completedIds = user.completedEvolutionCardIds || [];
    if (card.tier === 4 && checkEvolutionLineComplete(updatedCard) && !completedIds.includes(card.id)) {
      userUpdate.completedEvolutionCardIds = [...completedIds, card.id];
      userUpdate.creatureEvolutionLinesCompleted = (user.creatureEvolutionLinesCompleted || 0) + 1;
    }
    const updatedUser = await base44.auth.updateMe(userUpdate);
    setCard((c) => ({ ...c, [upg.key]: newVal, [usedField]: usesInTier + 1 }));
    setUser(updatedUser);
    setPurchasing(null);
  };

  const handleChangeType = async (newType) => {
    if (card.typeChanged || user.coins < TYPE_CHANGE_COST || typePurchasing) return;
    setTypePurchasing(newType);
    await base44.entities.Card.update(card.id, { type: newType, typeChanged: true });
    const updatedUser = await base44.auth.updateMe({ coins: user.coins - TYPE_CHANGE_COST });
    setCard((c) => ({ ...c, type: newType, typeChanged: true }));
    setUser(updatedUser);
    setTypePurchasing(null);
  };

  const handleEvolve = async () => {
    if (!canEvolve || user.coins < TIER_UPGRADE_COST || evolving) return;
    setEvolving(true);
    const newTier = card.tier + 1;
    const newRange = TIER_RANGES[newTier];
    const pct = 1 + (25 + Math.random() * 70) / 100;
    const clamp = (v, min, max) => Math.min(max, Math.max(min, Math.round(v)));
    // Only the higher of attack/defense is guaranteed to land inside the new tier's range
    // (assigned a fresh random value there); the lower stat grows normally and can fall outside it.
    const higherIsAttack = card.attack >= card.defense;
    const higherValue = randomInt(newRange.statMin, newRange.statMax);
    const lowerValue = Math.round((higherIsAttack ? card.defense : card.attack) * pct);
    const { url } = await base44.integrations.Core.GenerateImage({
      prompt: EVOLVE_ARMOR_PROMPTS[newTier],
      existing_image_urls: [card.imageUrl, STYLE_REFERENCE_URL],
    });
    const updated = {
      tier: newTier,
      name: evolveName(card.name, newTier),
      attack: higherIsAttack ? higherValue : lowerValue,
      defense: higherIsAttack ? lowerValue : higherValue,
      bonusDamage: clamp((card.bonusDamage || 0) * pct, newRange.bonusMin, newRange.bonusMax),
      imageUrl: url,
      winsVsBonus: 0,
      winsVsNonBonus: 0,
      gamesPlayed: 0,
      attackUpgradesUsed: 0,
      defenseUpgradesUsed: 0,
      bonusDamageUpgradesUsed: 0,
    };
    await base44.entities.Card.update(card.id, updated);
    const evolvedIds = user.evolvedCardIds || [];
    const userUpdate = { coins: user.coins - TIER_UPGRADE_COST };
    const tierField = TIER_UPGRADE_FIELD[newTier];
    if (tierField) userUpdate[tierField] = (user[tierField] || 0) + 1;
    if (!evolvedIds.includes(card.id)) {
      userUpdate.evolvedCardIds = [...evolvedIds, card.id];
      userUpdate.creaturesEvolved = (user.creaturesEvolved || 0) + 1;
    }
    const updatedUser = await base44.auth.updateMe(userUpdate);
    setCard((c) => ({ ...c, ...updated }));
    setUser(updatedUser);
    setEvolving(false);
  };

  return (
    <div className="min-h-screen bg-[#0D1B2A] text-white px-6 py-6">
      <Link to="/deck" className="inline-flex items-center gap-1 text-white/60 text-sm mb-6 py-2 px-1 -ml-1">
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