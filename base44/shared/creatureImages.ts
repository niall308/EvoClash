// Server-side helpers for the per-creature image generation/approval flow.
//
// The platform's restricted GenerateImage Core integration is the default image
// provider (no external API key required). A pluggable provider interface is
// exposed so a future provider (e.g. an external image API behind IMAGE_API_KEY)
// can be slotted in by setting the IMAGE_PROVIDER env var.
//
// Used by the generateCreatureImages / approveCreatureImage / rejectCreatureImage
// / setDefaultCreatureImage / uploadCreatureImage / updateCreatureUniqueAttack
// / getCreatureGuideImages / useGuideInCardGenerator backend functions so the
// restricted GenerateImage integration is never called from the client and all
// approval/audit logic lives server-side.

import { CREATURE_ANATOMY, CREATURE_STANCES, CREATURE_COLOR_PALETTES } from "./cardArt.ts";

export const IMAGE_STYLE_PRESETS = [
  { id: "semi-realistic", label: "Semi-realistic", modifier: "semi-realistic digital painting, cinematic lighting, highly detailed" },
  { id: "trading-card", label: "Trading-card art", modifier: "mystical fantasy trading-card art style, rich painterly saturated colors, dramatic rim lighting" },
  { id: "cartoon", label: "Cartoon", modifier: "bold cartoon illustration, clean line art, flat vibrant colors" },
  { id: "concept", label: "Concept sketch", modifier: "concept-art sketch, painterly strokes, muted palette" },
];

export const DEFAULT_STYLE_PRESET = "semi-realistic";

export const MAX_GENERATE_COUNT = 5;

// ---- Tier (upgrade) guidance ----
export const MIN_TIER = 1;
export const MAX_TIER = 4;

export const TIER_GUIDANCE: Record<number, string> = {
  1: "Base design — faithful representation of the creature; minimal embellishments; game-card friendly composition (transparent or simple background), clean silhouette, high-contrast foreground.",
  2: "Enhanced gear / upgraded look — add light armor or elemental accents; small ornate details, slightly more dynamic pose; maintain card composition and legibility.",
  3: "Major upgrade — elaborate armor/ornamentation, distinct elemental effects (fire/frost/magic), glowing runes, increased complexity, cinematic lighting, high detail while preserving readable silhouette for small card thumbnails.",
  4: "Legendary/epic — iconic, ornate, highly stylized with particle effects, halo/glow, unique background suggestive of origin, ultra-high detail, dramatic lighting, make the creature look unique and heroic for special-card art.",
};

export function clampTier(t: number): number {
  const n = Math.round(Number(t));
  if (!Number.isFinite(n)) return MIN_TIER;
  return Math.max(MIN_TIER, Math.min(MAX_TIER, n));
}

export function validateTier(t: number): { ok: true; value: number } | { ok: false; error: string } {
  const n = Math.round(Number(t));
  if (!Number.isFinite(n) || n < MIN_TIER || n > MAX_TIER) {
    return { ok: false, error: `tier must be between ${MIN_TIER} and ${MAX_TIER}` };
  }
  return { ok: true, value: n };
}

export interface CreatureRecord {
  id: string;
  baseName: string;
  category?: string;
  description?: string;
  uniqueAttackName?: string;
  uniqueAttackPercent?: number;
  uniqueAttackTarget?: string;
  uniqueAttackEffects?: string[];
}

export interface GeneratedImage {
  url: string;
  storageKey?: string;
  meta?: Record<string, unknown>;
}

export interface ImageProvider {
  name: string;
  generateImages(
    base44: any,
    prompt: string,
    count: number,
    refs?: string[]
  ): Promise<GeneratedImage[]>;
}

// Default provider: the platform's built-in GenerateImage integration. One call
// per image (the integration returns a single image); we run them in parallel.
const base44CoreProvider: ImageProvider = {
  name: "base44-core",
  async generateImages(base44, prompt, count, _refs) {
    const results = await Promise.all(
      Array.from({ length: count }, () =>
        base44.asServiceRole.integrations.Core.GenerateImage({ prompt }).then(
          ({ url }: { url: string }) => ({ url, storageKey: url }) as GeneratedImage
        )
      )
    );
    return results;
  },
};

// Resolve the active provider from the IMAGE_PROVIDER env var (future: external
// image API behind IMAGE_API_KEY). Currently only 'base44-core' is implemented.
export function getImageProvider(): ImageProvider {
  const configured = (Deno.env.get("IMAGE_PROVIDER") || "base44-core").toLowerCase();
  if (configured && configured !== "base44-core") {
    // Future: wire an external provider here. Until then, fall back to core so
    // a misconfigured env var never breaks generation.
    console.warn(`[creatureImages] unknown IMAGE_PROVIDER '${configured}' — falling back to base44-core`);
  }
  return base44CoreProvider;
}

const randomFrom = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// Build a creature-art prompt from an admin-supplied prompt, the creature's
// anatomy/description, and the chosen style preset. Falls back to the shared
// anatomy dictionary when the creature has no admin-authored description.
export function buildCreatureImagePrompt(creature: CreatureRecord, userPrompt: string, stylePresetId: string): string {
  const preset = IMAGE_STYLE_PRESETS.find((p) => p.id === stylePresetId) || IMAGE_STYLE_PRESETS[0];
  const stance = randomFrom(CREATURE_STANCES);
  const palette = randomFrom(CREATURE_COLOR_PALETTES);
  const anatomy = creature.description?.trim() || CREATURE_ANATOMY[creature.baseName] || `a creature true to a real ${creature.baseName}`;
  const base = userPrompt.trim() || `A ${creature.baseName}, ${stance}, ${palette} color scheme, full-body creature illustration.`;
  return `${base} Anatomy: ${anatomy}. Style: ${preset.modifier}. The creature is the clear focal point, sharply rendered against its background. No text, no border, no frame.`;
}

// ---- Tiered upgrade-guide prompt (the "guide image" generator) ----
// Combines the admin's detailed prompt with per-tier visual guidance and the
// creature's unique-attack summary into a single ready-to-send image prompt.
// Mirrors the prompt template in docs/admin-manage-creatures.md.
export function uniqueAttackSummary(creature: CreatureRecord | null): string {
  if (!creature) return "none";
  const name = (creature.uniqueAttackName || "").trim();
  if (!name) return "none";
  const pct = clampUniqueAttackPercent(creature.uniqueAttackPercent || 0);
  const target = creature.uniqueAttackTarget === "all" ? "all" : "single";
  const eff = Array.isArray(creature.uniqueAttackEffects)
    ? creature.uniqueAttackEffects.map((e) => String(e).trim()).filter(Boolean).join(", ")
    : "";
  return `${name} — ${pct}% ${target}${eff ? ` — ${eff}` : ""}`;
}

export function buildGuideImagePrompt(
  creature: CreatureRecord,
  adminPrompt: string,
  stylePresetId: string,
  tier: number
): string {
  const preset = IMAGE_STYLE_PRESETS.find((p) => p.id === stylePresetId) || IMAGE_STYLE_PRESETS[0];
  const t = clampTier(tier);
  const guidance = TIER_GUIDANCE[t];
  const ua = uniqueAttackSummary(creature);
  const palette = randomFrom(CREATURE_COLOR_PALETTES);
  const admin = (adminPrompt || "").trim();
  return `Creature: ${creature.baseName}. Tier: ${t}. Theme: ${preset.label}. Admin instructions: ${admin}. Tier enhancement: ${guidance} Visual: full-body, 4:5 aspect ratio, transparent/neutral background suitable for cropping to card, high-res (>=2048 preferred), clear silhouette, no watermarks. Palette: ${palette}. Unique attack: ${ua}. Deliverable: image(s) suitable as a card art guide${t >= 3 ? "; include a close-up detail for armor/patterns" : ""}.`;
}

// ---- Unique Attack validation ----
export const MIN_UA_PERCENT = 1;
export const MAX_UA_PERCENT = 1000;

export function clampUniqueAttackPercent(p: number): number {
  const n = Math.round(Number(p));
  if (!Number.isFinite(n)) return 0;
  return Math.max(MIN_UA_PERCENT, Math.min(MAX_UA_PERCENT, n));
}

export interface UniqueAttackInput {
  name: string;
  percent: number;
  target: "single" | "all";
  effects: string[];
}

export function validateUniqueAttack(input: Partial<UniqueAttackInput>): { ok: true; value: UniqueAttackInput } | { ok: false; error: string } {
  const name = (input.name || "").trim();
  if (!name) return { ok: false, error: "Unique Attack name is required" };
  const rawPct = Number(input.percent);
  if (!Number.isFinite(rawPct) || rawPct < MIN_UA_PERCENT || rawPct > MAX_UA_PERCENT) {
    return { ok: false, error: `Percent must be between ${MIN_UA_PERCENT} and ${MAX_UA_PERCENT}` };
  }
  const target = input.target === "all" ? "all" : "single";
  const effects = Array.isArray(input.effects)
    ? input.effects.map((e) => String(e).trim()).filter(Boolean)
    : [];
  return { ok: true, value: { name, percent: clampUniqueAttackPercent(rawPct), target, effects } };
}

// ---- Audit logging ----
export async function logCreatureEvent(
  base44: any,
  entry: { creatureId: string; imageId?: string; action: string; userId: string; userName?: string; note?: string; tier?: number }
) {
  try {
    await base44.asServiceRole.entities.CreatureAuditLog.create({
      creatureId: entry.creatureId,
      imageId: entry.imageId || "",
      action: entry.action,
      userId: entry.userId,
      userName: entry.userName || "",
      note: entry.note || "",
      tier: entry.tier || 0,
    });
  } catch (err) {
    // Audit logging is best-effort — never fail the main operation because of it.
    console.error("[creatureImages] audit log failed", err);
  }
}