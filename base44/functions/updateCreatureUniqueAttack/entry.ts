import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { validateUniqueAttack, logCreatureEvent } from '../../shared/creatureImages.ts';

// POST { creatureId, name, percent, target, effects }
// Updates the per-creature Unique Attack metadata stored on the Creature entity.
// Validates: name non-empty, percent 1–1000 (clamped), target single|all,
// effects string[]. Returns { creature }.
//
// Admin-only.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { creatureId, name, percent, target, effects } = await req.json().catch(() => ({}));
    if (!creatureId) return Response.json({ error: 'creatureId is required' }, { status: 400 });

    const creature = await base44.entities.Creature.get(creatureId).catch(() => null);
    if (!creature) return Response.json({ error: 'creature not found' }, { status: 404 });

    const result = validateUniqueAttack({ name, percent, target, effects });
    if (!result.ok) return Response.json({ error: result.error }, { status: 400 });

    const updated = await base44.asServiceRole.entities.Creature.update(creatureId, {
      uniqueAttackName: result.value.name,
      uniqueAttackPercent: result.value.percent,
      uniqueAttackTarget: result.value.target,
      uniqueAttackEffects: result.value.effects,
    });
    await logCreatureEvent(base44, {
      creatureId,
      action: 'unique_attack_updated',
      userId: user.id,
      userName: user.fullName || user.email || '',
      note: `${result.value.name} • ${result.value.percent}% • ${result.value.target}`,
    });
    return Response.json({ creature: updated });
  } catch (error) {
    console.error('updateCreatureUniqueAttack error', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});