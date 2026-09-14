// Server-side helpers for the per-creature image generation/approval flow.
//
// The platform's restricted GenerateImage Core integration is the default image
// provider (no external API key required). A pluggable provider interface is
// exposed so a future provider (e.g. an external image API behind IMAGE_API_KEY)
// can be slotted in by setting the IMAGE_PROVIDER env var.
//
// Used by the generateCreatureImages / approveCreatureImage / rejectCreatureImage
// / setDefaultCreatureImage / uploadCreatureImage / updateCreatureUniqueAttack
// backend functions so the restricted GenerateImage integration is never called
// from the client and all approval/audit logic lives server-side.

import { CREATURE_ANATOMY, CREATURE_STANCES, CREATURE_COLOR_PALETTES } from "./cardArt.ts";

export const IMAGE_STYLE_PRESETS = [
  { id: "semi-realistic", label: "Semi-realistic", modifier: "semi-realistic digital painting, cinematic lighting, highly detailed" },
  { id: "trading-card", label: "Trading-card art", modifier: "mystical fantasy trading-card art style, rich painterly saturated colors, dramatic rim lighting" },
  { id: "cartoon", label: "Cartoon", modifier: "bold cartoon illustration, clean line art, flat vibrant colors" },
  { id: "concept", label: "Concept sketch", modifier: "concept-art sketch, painterly strokes, muted palette" },
];

export const DEFAULT_STYLE_PRESET = "semi-realistic";

export const MAX_GENERATE_COUNT = 5;

export interface CreatureRecord {
  id: string;
  baseName: string;
  category?: string;
  description?: string;
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
  entry: { creatureId: string; imageId?: string; action: string; userId: string; userName?: string; note?: string }
) {
  try {
    await base44.asServiceRole.entities.CreatureAuditLog.create({
      creatureId: entry.creatureId,
      imageId: entry.imageId || "",
      action: entry.action,
      userId: entry.userId,
      userName: entry.userName || "",
      note: entry.note || "",
    });
  } catch (err) {
    // Audit logging is best-effort — never fail the main operation because of it.
    console.error("[creatureImages] audit log failed", err);
  }
}