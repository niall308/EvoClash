// Client-side constants for the Admin Manage Creatures image flow.
// Mirrors the server-side presets in base44/shared/creatureImages.ts so the
// generate modal and the backend stay in sync (style ids are passed verbatim).

export const IMAGE_STYLE_PRESETS = [
  { id: "semi-realistic", label: "Semi-realistic" },
  { id: "trading-card", label: "Trading-card art" },
  { id: "cartoon", label: "Cartoon" },
  { id: "concept", label: "Concept sketch" },
];

export const DEFAULT_STYLE_PRESET = "semi-realistic";
export const MAX_GENERATE_COUNT = 5;

export const IMAGE_STATUS_META = {
  pending: { label: "Pending", badge: "bg-yellow-500/20 text-yellow-300 border-yellow-500/40" },
  approved: { label: "Approved", badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" },
  rejected: { label: "Rejected", badge: "bg-white/10 text-white/50 border-white/15" },
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
};

// ---- Pure validators (client mirror of base44/shared/creatureImages.ts) ----
// Kept in sync so the admin UI can validate before the round-trip and so the
// unit tests can run without the Deno runtime. The backend re-validates.
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

// Localization keys for the new admin surfaces (default to English).
export const CREATURE_IMAGES_I18N = {
  imagesTab: "Images",
  uniqueAttackTab: "Unique Attack",
  detailsTab: "Details",
  generateButton: "Generate Image(s)",
  generateAria: "Generate one or more images for this creature",
  importButton: "Import Image",
  importAria: "Upload an image file for this creature",
  approveAria: "Approve this image as correct",
  rejectAria: "Reject this image as incorrect",
  setDefaultAria: "Set this image as the default reference",
  downloadAria: "Download this image",
  approveConfirm: "Approve image? This will mark the image as approved for use on cards.",
  rejectConfirm: "Reject image? This image will remain in history but not be used in cards.",
  uaHelper: "Damage = floor(baseAttack × percent / 100). Percent must be 1–1000.",
  uaSave: "Save",
  uaCancel: "Cancel",
  noImages: "No images yet. Generate or import one to get started.",
  activityFeed: "Activity",
};