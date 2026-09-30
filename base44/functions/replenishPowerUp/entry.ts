import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { POWER_DEFS } from '../../shared/powerUpDefs.ts';

// Server-authoritative power-up replenish. The client used to debit coins and
// reset the power-up's used/owned flag via base44.auth.updateMe, trusting a
// client-supplied cost + field map. This looks the power-up up in the
// server-side POWER_DEFS map, re-checks the coin balance, and writes the
// reset server-side — so a client can't replenish for free or for a forged
// cost, or point the update at an arbitrary User field.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { key } = await req.json().catch(() => ({}));
    const def = key ? POWER_DEFS[key] : null;
    if (!def) return Response.json({ error: 'Invalid power-up' }, { status: 400 });

    if ((user.coins || 0) < def.replenishCost) {
      return Response.json({ error: 'Not enough coins' }, { status: 400 });
    }

    const update: any = { coins: (user.coins || 0) - def.replenishCost };
    if (def.cooldownType === 'dailyMulti' && def.usesField) {
      update[def.usesField] = Math.max(0, ((user as any)[def.usesField] || 0) - 1);
    } else if (def.cooldownType === 'premium' && def.usedAtField) {
      update[def.usedAtField] = true;
    } else if (def.usedAtField) {
      update[def.usedAtField] = null;
    }
    await base44.asServiceRole.entities.User.update(user.id, update);

    const fresh = await base44.auth.me();
    return Response.json({ user: fresh });
  } catch (error) {
    console.error('replenishPowerUp error', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});