import { describe, it, expect } from "vitest";
import {
  clampUniqueAttackPercent,
  validateUniqueAttack,
  MIN_UA_PERCENT,
  MAX_UA_PERCENT,
} from "../src/lib/creatureImages";
import { previewUniqueAttackDamage, getCreatureUniqueAttack } from "../src/lib/uniqueAttacks";

describe("clampUniqueAttackPercent", () => {
  it("clamps below the minimum to the minimum", () => {
    expect(clampUniqueAttackPercent(0)).toBe(MIN_UA_PERCENT);
    expect(clampUniqueAttackPercent(-50)).toBe(MIN_UA_PERCENT);
  });
  it("clamps above the maximum to the maximum", () => {
    expect(clampUniqueAttackPercent(2000)).toBe(MAX_UA_PERCENT);
  });
  it("rounds to the nearest integer", () => {
    expect(clampUniqueAttackPercent(120.7)).toBe(121);
    expect(clampUniqueAttackPercent(120.4)).toBe(120);
  });
  it("returns 0 for non-numeric input", () => {
    expect(clampUniqueAttackPercent("abc")).toBe(0);
    expect(clampUniqueAttackPercent(undefined)).toBe(0);
  });
});

describe("validateUniqueAttack", () => {
  it("accepts a well-formed input and clamps/normalizes", () => {
    const r = validateUniqueAttack({ name: "Devouring Chomp", percent: 120, target: "all", effects: ["bleed:2 turns", "  "] });
    expect(r.ok).toBe(true);
    expect(r.value).toEqual({ name: "Devouring Chomp", percent: 120, target: "all", effects: ["bleed:2 turns"] });
  });
  it("rejects an empty name", () => {
    expect(validateUniqueAttack({ name: "  ", percent: 100 }).ok).toBe(false);
  });
  it("rejects percent out of range", () => {
    expect(validateUniqueAttack({ name: "X", percent: 0 }).ok).toBe(false);
    expect(validateUniqueAttack({ name: "X", percent: 1001 }).ok).toBe(false);
  });
  it("rejects non-numeric percent", () => {
    expect(validateUniqueAttack({ name: "X", percent: "nope" }).ok).toBe(false);
  });
  it("defaults target to single and coerces effects", () => {
    const r = validateUniqueAttack({ name: "X", percent: 100, target: "weird", effects: "not-array" });
    expect(r.ok).toBe(true);
    expect(r.value.target).toBe("single");
    expect(r.value.effects).toEqual([]);
  });
});

describe("previewUniqueAttackDamage", () => {
  it("computes floor(baseAttack * percent / 100)", () => {
    expect(previewUniqueAttackDamage(1000, 120)).toBe(1200);
    expect(previewUniqueAttackDamage(999, 145)).toBe(1448); // floor(1448.55)
  });
  it("clamps an out-of-range percent before computing", () => {
    expect(previewUniqueAttackDamage(100, 5000)).toBe(1000); // clamped to 1000
  });
});

describe("getCreatureUniqueAttack", () => {
  it("prefers the creature's stored fields over the static table", () => {
    const creature = {
      baseName: "Tyrannosaurus Rex",
      uniqueAttackName: "Custom Bite",
      uniqueAttackPercent: 200,
      uniqueAttackTarget: "all",
      uniqueAttackEffects: ["stun:1"],
    };
    const ua = getCreatureUniqueAttack(creature);
    expect(ua.name).toBe("Custom Bite");
    expect(ua.percent).toBe(200);
    expect(ua.target).toBe("all");
    expect(ua.effect).toBe("stun:1");
  });
  it("falls back to the static definition when no stored fields", () => {
    const ua = getCreatureUniqueAttack({ baseName: "Tyrannosaurus Rex" });
    expect(ua).not.toBeNull();
    expect(ua.name).toBe("Devouring Chomp");
  });
  it("returns null for a creature with no static def and no stored fields", () => {
    expect(getCreatureUniqueAttack({ baseName: "Unknown Beast" })).toBeNull();
  });
});