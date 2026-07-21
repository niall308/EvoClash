import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { TYPE_ADVANTAGES, TYPE_COLORS } from "@/lib/gameConstants";

const STEPS = [
  "Generate creature cards and build a deck of at least 15 cards.",
  "Start a match — you and the AI each draw a hand of 5 cards.",
  "Play rock-paper-scissors once at the start of the match to see who attacks first.",
  "Each round, pick a card from your hand to send into battle.",
  "Take turns attacking — tap Attack on your turn to strike the opponent's card.",
  "Damage is based on attack vs. defense, plus a type bonus if your type has an advantage.",
  "There's a 10% chance of a critical hit, dealing 1.5x damage and weakening the target's defense.",
  "When a card's health reaches 0, it's defeated and moved to the discard pile — tap it to scroll through defeated cards.",
  "Your hand automatically refills back up to 5 cards as you play or lose cards.",
  "Win 3 rounds before the AI does to win the match — it's best of 5.",
  "You have 5 minutes to attack on your turn — miss it 3 times in a row and you automatically forfeit the match.",
  "You can forfeit at any time, but it counts as a loss.",
  "Winning battles helps your cards earn upgrades and evolve into stronger tiers.",
  "Complete milestones from your Profile to earn bonus LC — some can be earned again and again.",
];

export default function HowToPlay() {
  return (
    <div className="min-h-screen bg-[#0D1B2A] text-white px-6 py-6">
      <Link to="/profile" className="inline-flex items-center gap-1 text-white/60 text-sm mb-6">
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>
      <h1 className="text-2xl font-black mb-6">How To Play</h1>

      <h2 className="text-lg font-bold mb-3">Game Rules</h2>
      <ol className="space-y-2 mb-8">
        {STEPS.map((step, i) => (
          <li key={i} className="flex gap-3 bg-white/5 rounded-xl p-3 text-sm">
            <span className="font-black text-amber-400 shrink-0">{i + 1}.</span>
            <span className="text-white/80">{step}</span>
          </li>
        ))}
      </ol>

      <h2 className="text-lg font-bold mb-3">Card Types &amp; Bonus Damage</h2>
      <p className="text-white/50 text-xs mb-3">Each type deals bonus damage to the types listed next to it.</p>
      <div className="space-y-2">
        {Object.entries(TYPE_ADVANTAGES).map(([type, beats]) => (
          <div key={type} className="bg-white/5 rounded-xl p-3 flex items-center gap-3 text-sm">
            <span className="font-bold px-2 py-1 rounded-full text-white text-xs shrink-0" style={{ background: TYPE_COLORS[type] }}>
              {type}
            </span>
            <span className="text-white/40 text-xs">beats</span>
            <span className="text-white/80 text-xs">{beats.join(", ")}</span>
          </div>
        ))}
      </div>
    </div>
  );
}