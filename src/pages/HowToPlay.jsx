import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import StepsSection from "@/components/howtoplay/StepsSection";
import TypeChartSection from "@/components/howtoplay/TypeChartSection";

const GETTING_STARTED = [
  "Generate creature cards using LC coins or your free daily generations, and build a deck of at least 15 cards.",
  "Cards come in 4 tiers based on their stats — higher tiers are stronger and rarer.",
  "Rare Hybrid cards (marked with a golden question mark) can appear from any generation and let you choose their type when played.",
];

const BATTLING = [
  "Choose an opponent from the Play screen: Battle vs AI (4 difficulties) or Battle vs Human (live or offline PvP).",
  "You and your opponent each draw a hand of 5 cards from your deck.",
  "Play rock-paper-scissors once at the start of the match to see who attacks first.",
  "Each round, pick a card from your hand to send into battle.",
  "Take turns attacking — tap Attack on your turn to strike the opponent's card.",
  "Damage is based on attack vs. defense, plus bonus damage if your type has an advantage.",
  "There's a 10% chance of a critical hit, dealing 1.5x damage and weakening the target's defense.",
  "When a card's HP reaches 0, it's defeated and moved to the discard pile — tap it to scroll through defeated cards.",
  "Your hand automatically refills back up to 5 cards as you play or lose cards.",
  "Win 3 rounds before your opponent does to win the match.",
  "Live matches give you 5 minutes to attack on your turn — miss it 3 times in a row and you automatically forfeit.",
  "Offline matches have no time limit and can be left and resumed anytime.",
  "You can forfeit at any time, but it counts as a loss.",
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
      <StepsSection title="PvP & Ranked" steps={PVP_RANKED} />
      <StepsSection title="Power-Ups" steps={POWER_UPS} />
      <StepsSection title="Upgrades & Evolution" steps={UPGRADES} />
      <StepsSection title="Friends & Trading" steps={SOCIAL} />
      <StepsSection title="Milestones & Rewards" steps={REWARDS} />
      <TypeChartSection />
    </div>
  );
}