import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import StepsSection from "@/components/howtoplay/StepsSection";
import TypeChartSection from "@/components/howtoplay/TypeChartSection";

const GETTING_STARTED = [
  "Generate creature cards using LC coins or your free daily generations, and build a deck of at least 15 cards.",
  "Cards come in 4 tiers based on their stats — higher tiers are stronger and rarer.",
  "Rare Hybrid cards (marked with a golden question mark) can appear from any generation and let you choose their type when played.",
  "Every creature has a Unique Attack — a powerful once-per-game move you can unleash in battle.",
  "Follow the Story Mode map to battle through 10 stages of increasing difficulty, or buy a Creature Egg and incubate it into a special hatchling card.",
];

const BATTLING = [
  "Choose an opponent from the Play screen: Battle vs AI (1v1 or 3v3, 4 difficulties) or Battle vs Human (live or offline PvP).",
  "You and your opponent each draw a hand of 5 cards from your deck.",
  "Play rock-paper-scissors once at the start of the match to see who attacks first.",
  "Each round, pick a card from your hand to send into battle.",
  "Take turns attacking — tap Attack on your turn to strike the opponent's card.",
  "Tap the Unique Attack button (purple) to unleash your card's special move once per match — it can deal heavy damage, heal your team, weaken foes, and more.",
  "Damage is based on attack vs. defense, plus bonus damage if your type has an advantage.",
  "There's a 10% chance of a critical hit, dealing 1.5x damage and weakening the target's defense.",
  "When a card's HP reaches 0, it's defeated and moved to the discard pile — tap it to scroll through defeated cards.",
  "Your hand automatically refills back up to 5 cards as you play or lose cards.",
  "Win 3 rounds before your opponent does to win the match.",
  "Live matches give you 5 minutes to attack on your turn — miss it 3 times in a row and you automatically forfeit.",
  "Offline matches have no time limit and can be left and resumed anytime.",
  "You can forfeit at any time, but it counts as a loss.",
];

const BATTLES_3V3 = [
  "3v3 mode fields 3 of your cards against 3 opponent cards at once — each card has its own HP and attacks the enemy across from it.",
  "Play 3v3 vs AI from the Play screen, or battle 3v3 in Story Mode stages 6 through 10.",
  "Pick which card to attack with and which enemy to target each turn — strategize across the whole lineup.",
  "Unique Attacks and Power-Ups work the same as 1v1, and 3v3 wins earn bigger rewards.",
];

const STORY_MODE = [
  "Story Mode is a 10-stage campaign with 8 matches per stage — beat every boss to complete the story.",
  "Each stage ends in a boss fight against a named enemy with scaled-up stats. Stages and bosses get progressively stronger.",
  "Win matches to earn LC coins. The Stage 5 boss rewards a free Hybrid card, and the final Stage 10 boss rewards a free Creature Egg.",
  "Stages 1–5 play as 1v1 battles; stages 6–10 switch to 3v3 combat.",
  "Your progress saves automatically — clear a stage to unlock the next one. You can replay any cleared match for more coins.",
  "Admins can play any stage at any time, regardless of progress.",
];

const CREATURE_EGGS = [
  "Buy a Creature Egg from the Egg Store for 500,000 LC — you can own up to 5 eggs at once (find them under Creature Eggs in your Deck).",
  "Incubate an egg by paying 250 LC each day for 30 days. Miss a day and your progress drops, so keep up daily payments.",
  "Once an egg reaches 30/30 days it's ready — hatch it to receive a Tier 3 baby creature card with its own Egg Burst Unique Attack.",
  "Upgrade a hatched baby (Tier 3) into its special Tier 4 form for 500,000 LC on the Card Upgrade screen. The upgrade randomly picks Good or Evil alignment.",
  "Good alignment grants Blessed Strike — 110% damage that also heals all your active cards. Evil alignment grants Cursed Strike — 175% damage that sacrifices 15% of your active cards' health.",
  "Don't want an egg? Sell it for 50,000 LC. Upgraded hatchlings can also be sold for a higher value.",
];

const PVP_RANKED = [
  "Battle vs Human matches earn or cost Rank Points (RP) — win to climb, lose to drop.",
  "Ranks range from Bronze all the way up to Eternal Apex, each shown as an emblem next to your name.",
  "Your current rank, RP, and win/loss streak are shown on your Profile page.",
  "Check the Leaderboards for the top players by most wins, longest win streak, and most wins this week — PvP battles only, AI matches don't count.",
];

const POWER_UPS = [
  "Use tactical Power-Ups during battle to turn the tide — attack boosts, defense boosts, healing, card control, and more.",
  "Pick up to 4 active Power-Ups at a time from the Power Ups screen.",
  "Most Power-Ups recharge every 24 hours or every 7 days; you can instantly refresh a used one early with LC coins.",
  "Only one Power-Up can be used per turn.",
];

const UPGRADES = [
  "Winning battles helps your cards earn upgrades and evolve into stronger tiers.",
  "Spend LC on the Card Upgrade screen to boost a card's Attack, Defense, or Bonus Damage.",
  "A card must meet lifetime requirements — cards destroyed, games played, and match wins — before it can evolve to the next tier.",
  "You can also change a card's element type for a fee on the Card Upgrade screen.",
];

const SOCIAL = [
  "Add friends using their unique Friend Code, found on your Profile page.",
  "Propose a trade offering one of your cards — plus optional LC coins — for one of your friend's cards.",
  "Accept, decline, or counteroffer pending trades from the Trades screen.",
];

const REWARDS = [
  "Complete Milestones from your Profile to earn bonus LC — some can be earned again and again.",
  "Daily Missions reset every day and reward LC for simple goals like winning games or evolving a card.",
  "Claim your Daily Reward every day for free LC — don't miss a day!",
  "Need more LC? Purchase coin packs with real money from the Buy Coins screen, and review past purchases in your Coin History.",
];

export default function HowToPlay() {
  return (
    <div className="text-white px-6 py-6">
      <Link to="/profile" className="inline-flex items-center gap-1 text-white/60 text-sm mb-6 min-h-[44px] px-1 -ml-1">
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>
      <h1 className="text-2xl font-black mb-6">How To Play</h1>

      <StepsSection title="Getting Started" steps={GETTING_STARTED} />
      <StepsSection title="Battling" steps={BATTLING} />
      <StepsSection title="3v3 Battles" steps={BATTLES_3V3} />
      <StepsSection title="Story Mode" steps={STORY_MODE} />
      <StepsSection title="Creature Eggs" steps={CREATURE_EGGS} />
      <StepsSection title="PvP & Ranked" steps={PVP_RANKED} />
      <StepsSection title="Power-Ups" steps={POWER_UPS} />
      <StepsSection title="Upgrades & Evolution" steps={UPGRADES} />
      <StepsSection title="Friends & Trading" steps={SOCIAL} />
      <StepsSection title="Milestones & Rewards" steps={REWARDS} />
      <TypeChartSection />
    </div>
  );
}