// Client-side constants for the Admin Manage Creatures image flow.
// Mirrors the server-side presets in base44/shared/creatureImages.ts so the
// generate modal and the backend stay in sync (style ids + tier values are
// passed verbatim).

export const IMAGE_STYLE_PRESETS = [
  { id: "semi-realistic", label: "Semi-realistic" },
  { id: "trading-card", label: "Trading-card art" },
  { id: "cartoon", label: "Cartoon" },
  { id: "concept", label: "Concept sketch" },
];

export const DEFAULT_STYLE_PRESET = "semi-realistic";
export const MAX_GENERATE_COUNT = 5;

// ---- Tier (upgrade) guidance ----
export const MIN_TIER = 1;
export const MAX_TIER = 4;
export const TIERS = [1, 2, 3, 4];

export const TIER_GUIDANCE = {
  1: "Base design — faithful representation of the creature; minimal embellishments; clean silhouette, high-contrast foreground.",
  2: "Enhanced gear / upgraded look — light armor or elemental accents; small ornate details; maintain card legibility.",
  3: "Major upgrade — elaborate armor/ornamentation, distinct elemental effects, glowing runes, cinematic lighting; keep silhouette readable at thumbnail size.",
  4: "Legendary/epic — iconic, ornate, highly stylized with particle effects, halo/glow, unique background, dramatic lighting; make the creature unique and heroic.",
};

export function clampTier(t) {
  const n = Math.round(Number(t));
  if (!Number.isFinite(n)) return MIN_TIER;
  return Math.max(MIN_TIER, Math.min(MAX_TIER, n));
}

export function validateTier(t) {
  const n = Math.round(Number(t));
  if (!Number.isFinite(n) || n < MIN_TIER || n > MAX_TIER) {
    return { ok: false, error: `tier must be between ${MIN_TIER} and ${MAX_TIER}` };
  }
  return { ok: true, value: n };
}

// Build the combined guide prompt on the client for preview/templating only.
// The backend re-builds it server-side from the same inputs.
export function buildGuideImagePrompt(creature, adminPrompt, stylePresetId, tier) {
  const preset = IMAGE_STYLE_PRESETS.find((p) => p.id === stylePresetId) || IMAGE_STYLE_PRESETS[0];
  const t = clampTier(tier);
  const guidance = TIER_GUIDANCE[t];
  const name = creature?.uniqueAttackName?.trim();
  const pct = name ? clampUniqueAttackPercent(creature.uniqueAttackPercent || 0) : 0;
  const target = creature?.uniqueAttackTarget === "all" ? "all" : "single";
  const eff = Array.isArray(creature?.uniqueAttackEffects) ? creature.uniqueAttackEffects.filter(Boolean).join(", ") : "";
  const ua = name ? `${name} — ${pct}% ${target}${eff ? ` — ${eff}` : ""}` : "none";
  const admin = (adminPrompt || "").trim();
  return `Creature: ${creature?.baseName || ""}. Tier: ${t}. Theme: ${preset.label}. Admin instructions: ${admin}. Tier enhancement: ${guidance} Visual: full-body, 4:5 aspect ratio, transparent/neutral background suitable for cropping to card, high-res (>=2048 preferred), clear silhouette, no watermarks. Palette: match creature theme. Unique attack: ${ua}. Deliverable: image(s) suitable as a card art guide${t >= 3 ? "; include a close-up detail for armor/patterns" : ""}.`;
}

export const IMAGE_STATUS_META = {
  pending: { label: "PENDING", badge: "bg-yellow-500/20 text-yellow-300 border-yellow-500/40" },
  approved: { label: "APPROVED", badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" },
  rejected: { label: "REJECTED", badge: "bg-white/10 text-white/50 border-white/15" },
};

export const GUIDE_BADGE = "bg-emerald-500 text-white";

export const TIER_BADGE = {
  1: "bg-sky-500/20 text-sky-300 border-sky-500/40",
  2: "bg-indigo-500/20 text-indigo-300 border-indigo-500/40",
  3: "bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40",
  4: "bg-amber-500/20 text-amber-300 border-amber-500/40",
};

export const AUDIT_ACTION_LABELS = {
  generate_requested: "Generation requested",
  generate_completed: "Image generated",
  generate_failed: "Generation failed",
  image_uploaded: "Image imported",
  image_approved: "Image approved",
  image_rejected: "Image rejected",
  default_changed: "Default image changed",
  unique_attack_updated: "Unique Attack updated",
  approve_guide: "Approved as guide",
  reject_image: "Rejected image",
  set_default: "Set as default for tier",
  guide_used: "Used in card generator",
};

// ---- Pure validators (client mirror of base44/shared/creatureImages.ts) ----
export const MIN_UA_PERCENT = 1;
export const MAX_UA_PERCENT = 1000;

export function clampUniqueAttackPercent(p) {
  const n = Math.round(Number(p));
  if (!Number.isFinite(n)) return 0;
  return Math.max(MIN_UA_PERCENT, Math.min(MAX_UA_PERCENT, n));
}

export function validateUniqueAttack(input) {
  const name = (input?.name || "").trim();
  if (!name) return { ok: false, error: "Unique Attack name is required" };
  const rawPct = Number(input?.percent);
  if (!Number.isFinite(rawPct) || rawPct < MIN_UA_PERCENT || rawPct > MAX_UA_PERCENT) {
    return { ok: false, error: `Percent must be between ${MIN_UA_PERCENT} and ${MAX_UA_PERCENT}` };
  }
  const target = input?.target === "all" ? "all" : "single";
  const effects = Array.isArray(input?.effects)
    ? input.effects.map((e) => String(e).trim()).filter(Boolean)
    : [];
  return { ok: true, value: { name, percent: clampUniqueAttackPercent(rawPct), target, effects } };
}

// Localization keys for the admin surfaces (default to English).
export const CREATURE_IMAGES_I18N = {
  imagesTab: "Images",
  uniqueAttackTab: "Unique Attack",
  detailsTab: "Details",
  generateButton: "Generate Image(s)",
  generateForTier: "Generate Image(s) for Tier {tier}",
  generateAria: "Generate one or more guide images for this creature and tier",
  importButton: "Import Image",
  importAria: "Upload an image file for this creature",
  approveAsGuide: "Approve as Guide",
  rejectImage: "Reject Image",
  setTierDefault: "Set as Default for Tier",
  useInGenerator: "Use in Card Generator",
  tierLabel: "Tier",
  tierHelp: "Tier 1 = base design · 2/3/4 = progressively upgraded looks",
  promptLabel: "Detailed prompt",
  promptPlaceholder: "Describe the image you want for this tier…",
  promptHelp: "Combined with the creature name, tier guidance, and style preset before sending to the image model.",
  useTemplate: "Insert template",
  templateAria: "Insert a starter prompt template for this tier",
  guideBadge: "GUIDE",
  tierBadge: "T{tier}",
  upgradeGuides: "Upgrade Guides",
  noGuideForTier: "No guide for Tier {tier} yet",
  chooseGuide: "Choose Guide",
  guideNone: "No guide (auto)",
  approveAria: "Approve this image as a guide",
  rejectAria: "Reject this image",
  setDefaultAria: "Set this image as the creature's default reference",
  setTierDefaultAria: "Set this guide as the default for its tier",
  useInGeneratorAria: "Open the card generator prefilled with this guide image",
  downloadAria: "Download this image",
  approveConfirm: "Approve as guide? This image becomes a card-art guide for this creature + tier.",
  rejectConfirm: "Reject image? This image stays in history but is not available as a guide.",
  uaHelper: "Damage = floor(baseAttack × percent / 100). Percent must be 1–1000.",
  uaSave: "Save",
  uaCancel: "Cancel",
  noImages: "No images yet. Generate or import one to get started.",
  activityFeed: "Activity",
};