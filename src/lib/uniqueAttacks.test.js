// Resolver tests runnable with Node's built-in test runner (no vitest needed):
//   node --test src/lib/uniqueAttacks.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  clampPercent,
  normalizeTarget,
  resolveUniqueAttack,
  uniqueAttackDamage,
  computeTeamHeals,
  effectiveEffectPercent,
  effectiveEffectDuration,
  EFFECT_TYPE_IDS,
} from "./uniqueAttacks.js";

test("clampPercent: 0–200 range, NaN→100", () => {
  assert.equal(clampPercent(0), 0);
  assert.equal(clampPercent(1), 1);
  assert.equal(clampPercent(50), 50);
  assert.equal(clampPercent(100), 100);
  assert.equal(clampPercent(200), 200);
  assert.equal(clampPercent(250), 200);
  assert.equal(clampPercent(1000), 200);
  assert.equal(clampPercent(-5), 0);
  assert.equal(clampPercent(33.4), 33);
  assert.equal(clampPercent(33.6), 34);
  assert.equal(clampPercent("abc"), 100);
  assert.equal(clampPercent(null), 100);
  assert.equal(clampPercent(undefined), 100);
});

test("normalizeTarget: single | all, legacy multi→all", () => {
  assert.equal(normalizeTarget("single"), "single");
  assert.equal(normalizeTarget("all"), "all");
  assert.equal(normalizeTarget("multi"), "all");
  assert.equal(normalizeTarget(""), "single");
  assert.equal(normalizeTarget(undefined), "single");
});

test("resolveUniqueAttack: admin fields take precedence over static", () => {
  const card = {
    baseName: "Tyrannosaurus Rex",
    uniqueAttackName: "Custom Chomp",
    uniqueAttackPercent: 150,
    uniqueAttackTarget: "all",
    uniqueAttackEffectType: "healTeamOnDestroy",
    uniqueAttackEffectPercent: 20,
  };
  const def = resolveUniqueAttack(card);
  assert.equal(def.name, "Custom Chomp");
  assert.equal(def.percent, 150);
  assert.equal(def.target, "all");
  assert.equal(def.effectType, "healTeamOnDestroy");
  assert.equal(def.effectPercent, 20);
});

test("resolveUniqueAttack: legacy effectType healSelf50 → healSelf + 50%", () => {
  const def = resolveUniqueAttack({ baseName: "Phoenix", uniqueAttackEffectType: "healSelf50" });
  assert.equal(def.effectType, "healSelf");
  assert.equal(def.effectPercent, 50);
});

test("resolveUniqueAttack: static fallback when no admin config", () => {
  const def = resolveUniqueAttack({ baseName: "Velociraptor" });
  assert.equal(def.name, "Raptor Pack");
  assert.equal(def.percent, 75);
  assert.equal(def.target, "all");
  assert.equal(def.effectType, "none");
});

test("resolveUniqueAttack: free-text effect infers mechanic for legacy cards", () => {
  const def = resolveUniqueAttack({
    baseName: "X",
    uniqueAttackName: "UA",
    uniqueAttackEffect: "heals all user player cards by 30%",
  });
  assert.equal(def.effectType, "healAll");
});

test("resolveUniqueAttack: null/empty card → null", () => {
  assert.equal(resolveUniqueAttack(null), null);
  assert.equal(resolveUniqueAttack({}), null);
  assert.equal(resolveUniqueAttack({ baseName: "Does Not Exist" }), null);
});

test("uniqueAttackDamage: percent of attack, single floor", () => {
  assert.equal(uniqueAttackDamage({ attack: 100 }, { percent: 100 }), 100);
  assert.equal(uniqueAttackDamage({ attack: 100 }, { percent: 50 }), 50);
  assert.equal(uniqueAttackDamage({ attack: 100 }, { percent: 33 }), 33);
  assert.equal(uniqueAttackDamage({ attack: 100 }, { percent: 75 }), 75);
  assert.equal(uniqueAttackDamage({ attack: 100 }, { percent: 150 }), 150);
  assert.equal(uniqueAttackDamage({ attack: 100 }, { percent: 200 }), 200);
  assert.equal(uniqueAttackDamage({ attack: 100 }, { percent: 250 }), 200); // clamped
  assert.equal(uniqueAttackDamage({ attack: 100 }, { percent: 0 }), 0);
  assert.equal(uniqueAttackDamage({ attack: 99 }, { percent: 33 }), 32); // floor(3267/100)=32
  assert.equal(uniqueAttackDamage({ attack: 0 }, { percent: 200 }), 0);
  assert.equal(uniqueAttackDamage(null, { percent: 100 }), 0);
});

test("computeTeamHeals: 20% of maxHp per card", () => {
  const team = [{ maxHp: 100 }, { maxHp: 50 }, { maxHp: 0 }];
  const heals = computeTeamHeals(team, 20);
  assert.equal(heals[0].amount, 20);
  assert.equal(heals[1].amount, 10);
  assert.equal(heals[2].amount, 0);
  // clamped percent
  const big = computeTeamHeals([{ maxHp: 100 }], 500);
  assert.equal(big[0].amount, 200);
});

test("effectiveEffectPercent / Duration fall back to defaults", () => {
  assert.equal(effectiveEffectPercent({ effectPercent: 25 }, 20), 25);
  assert.equal(effectiveEffectPercent({}, 20), 20);
  assert.equal(effectiveEffectPercent({ effectPercent: 0 }, 20), 20);
  assert.equal(effectiveEffectDuration({ effectDuration: 2 }, 1), 2);
  assert.equal(effectiveEffectDuration({}, 1), 1);
});

test("EFFECT_TYPE_IDS includes healTeamOnDestroy", () => {
  assert.ok(EFFECT_TYPE_IDS.includes("healTeamOnDestroy"));
  assert.ok(EFFECT_TYPE_IDS.includes("none"));
});