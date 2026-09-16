// Shared server-side Unique Attack normalization. Used by createGeneratedCard
// (stamps new cards at creation) and syncUniqueAttacks (backfills existing
// cards), so both paths produce identical, validated card UA data.
//
// Card UA is a COPY of the Creature's UA at creation time (copy-at-creation
// model — see src/lib/uniqueAttacks.js). These helpers normalize legacy values
// (multi → all, old effectType names → canonical) and clamp the percent to the
// shared 0–200 cap so stored card data is always clean regardless of when it
// was written.

export const MAX_PERCENT = 200;

const EFFECT_TYPES = ['none', 'healSelf', 'healAll', 'halfAttack', 'healTeamOnDestroy'];
const LEGACY_EFFECT_MAP: Record<string, string> = {
  healself50: 'healSelf',
  healall30: 'healAll',
  halfattacktarget1: 'halfAttack',
  custom: 'none',
};

export function normalizeTarget(t?: string): 'all' | 'single' {
  return t === 'all' || t === 'multi' ? 'all' : 'single';
}

export function normalizeEffectType(et?: string): string {
  if (!et) return 'none';
  const key = String(et).toLowerCase();
  if (EFFECT_TYPES.includes(key)) return key;
  return LEGACY_EFFECT_MAP[key] || 'none';
}

export function clampPercent(p?: number | string): number {
  const n = Number(p);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(MAX_PERCENT, Math.max(1, Math.round(n)));
}

// Returns true when a creature has any UA configured (name, percent, or effect).
export function hasUniqueAttack(c: any): boolean {
  return !!(c?.uniqueAttackName || (c?.uniqueAttackPercent || 0) > 0 || c?.uniqueAttackEffect);
}

// Builds the normalized UA field map to stamp onto a card. When the creature has
// no UA configured, returns empty-string/zero fields (and effectType "none") so
// the resolver falls back to data/uniqueAttacks.json. This also REPAIRS
// malformed card data: a missing name with a non-zero percent, or an invalid
// effectType, is normalized so stored data is always clean.
export function buildUniqueAttackFields(creature: any): Record<string, any> {
  const configured = hasUniqueAttack(creature);
  return {
    uniqueAttackName: creature?.uniqueAttackName || '',
    uniqueAttackPercent: clampPercent(creature?.uniqueAttackPercent),
    uniqueAttackTarget: normalizeTarget(creature?.uniqueAttackTarget),
    uniqueAttackEffect: creature?.uniqueAttackEffect || '',
    uniqueAttackEffectType: configured ? normalizeEffectType(creature?.uniqueAttackEffectType) : 'none',
  };
}