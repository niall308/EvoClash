import { describe, it, expect } from "vitest";
import {
  clampTier,
  validateTier,
  MIN_TIER,
  MAX_TIER,
  TIERS,
  TIER_GUIDANCE,
  buildGuideImagePrompt,
  IMAGE_STYLE_PRESETS,
} from "../src/lib/creatureImages";

describe("validateTier", () => {
  it("accepts each tier 1–4", () => {
    TIERS.forEach((t) => {
      const r = validateTier(t);
      expect(r.ok).toBe(true);
      expect(r.value).toBe(t);
    });
  });
  it("rejects tiers below 1 and above 4", () => {
    expect(validateTier(0).ok).toBe(false);
    expect(validateTier(5).ok).toBe(false);
    expect(validateTier(-1).ok).toBe(false);
  });
  it("rejects non-numeric input", () => {
    expect(validateTier("nope").ok).toBe(false);
    expect(validateTier(NaN).ok).toBe(false);
  });
});

describe("clampTier", () => {
  it("clamps below the minimum to 1", () => {
    expect(clampTier(0)).toBe(MIN_TIER);
    expect(clampTier(-3)).toBe(MIN_TIER);
  });
  it("clamps above the maximum to 4", () => {
    expect(clampTier(9)).toBe(MAX_TIER);
  });
  it("defaults non-numeric to 1", () => {
    expect(clampTier("x")).toBe(MIN_TIER);
    expect(clampTier(undefined)).toBe(MIN_TIER);
  });
  it("rounds to the nearest integer", () => {
    expect(clampTier(2.7)).toBe(3);
  });
});

describe("buildGuideImagePrompt", () => {
  const creature = {
    baseName: "Tyrannosaurus Rex",
    uniqueAttackName: "Devouring Chomp",
    uniqueAttackPercent: 120,
    uniqueAttackTarget: "single",
    uniqueAttackEffects: ["Bleed 2 turns"],
  };

  it("includes creature name, tier, theme, admin instructions, and unique attack", () => {
    const p = buildGuideImagePrompt(creature, "A massive T-Rex with obsidian plates", "semi-realistic", 3);
    expect(p).toContain("Creature: Tyrannosaurus Rex");
    expect(p).toContain("Tier: 3");
    expect(p).toContain("Theme: Semi-realistic");
    expect(p).toContain("Admin instructions: A massive T-Rex with obsidian plates");
    expect(p).toContain("Tier enhancement:");
    expect(p).toContain(TIER_GUIDANCE[3].slice(0, 20));
    expect(p).toContain("Unique attack: Devouring Chomp — 120% single — Bleed 2 turns");
  });

  it("appends a close-up detail instruction for tier >= 3", () => {
    expect(buildGuideImagePrompt(creature, "x", "semi-realistic", 3)).toContain("close-up detail");
    expect(buildGuideImagePrompt(creature, "x", "semi-realistic", 4)).toContain("close-up detail");
    expect(buildGuideImagePrompt(creature, "x", "semi-realistic", 2)).not.toContain("close-up detail");
  });

  it("reports 'none' for unique attack when the creature has none", () => {
    const p = buildGuideImagePrompt({ baseName: "Ankylosaurus" }, "x", "semi-realistic", 1);
    expect(p).toContain("Unique attack: none");
  });

  it("clamps an out-of-range tier before building", () => {
    const p = buildGuideImagePrompt(creature, "x", "semi-realistic", 9);
    expect(p).toContain("Tier: 4");
  });

  it("uses the chosen style preset label as the theme", () => {
    const trading = IMAGE_STYLE_PRESETS.find((s) => s.id === "trading-card");
    const p = buildGuideImagePrompt(creature, "x", "trading-card", 2);
    expect(p).toContain(`Theme: ${trading.label}`);
  });
});