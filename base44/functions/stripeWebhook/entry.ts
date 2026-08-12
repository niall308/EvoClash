import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import Stripe from 'npm:stripe@17.5.0';

// Grant (or deduct, for refunds) a user's coins ONCE per Stripe event, recording a
// CoinTransaction keyed by sessionId as the idempotency anchor. Replayed webhook
// deliveries and refunds/chargebacks are handled here so coins can't be minted twice
// or kept after a chargeback.
const applyCoinDelta = async (base44, userId, coins, packId, priceUsd, dedupKey) => {
  const existing = await base44.asServiceRole.entities.CoinTransaction.filter({ sessionId: dedupKey });
  if (existing.length) return { duplicate: true };
  const targetUser = await base44.asServiceRole.entities.User.get(userId);
  if (!targetUser) return { error: 'user not found' };
  const oldCoinTotal = targetUser.coins || 0;
  const newCoinTotal = Math.max(0, oldCoinTotal + coins);
  await base44.asServiceRole.entities.User.update(userId, { coins: newCoinTotal });
  await base44.asServiceRole.entities.CoinTransaction.create({
    created_by_id: userId,
    packId,
    priceUsd,
    coinsAdded: coins,
    oldCoinTotal,
    newCoinTotal,
    sessionId: dedupKey,
  });
  return { granted: true, newCoinTotal };
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
    const signature = req.headers.get('stripe-signature');
    const body = await req.text();

    let event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, Deno.env.get('STRIPE_WEBHOOK_SECRET'));
    } catch (err) {
      console.error('Webhook signature verification failed', err);
      return Response.json({ error: 'Invalid signature' }, { status: 400 });
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const userId = session.metadata?.user_id;
      const coins = parseInt(session.metadata?.coins || '0', 10);
      const priceUsd = parseFloat(session.metadata?.priceUsd || '0');
      const packId = session.metadata?.packId || '';
      if (userId && coins > 0) {
        await applyCoinDelta(base44, userId, coins, packId, priceUsd, `purchase:${session.id}`);
      }
    } else if (event.type === 'charge.refunded') {
      // Reclaim the purchased coins on a FULL refund. Partial refunds are skipped
      // to avoid over-deducting (each partial would otherwise deduct the full amount).
      const charge = event.data.object;
      if (charge.amount_refunded && charge.amount_total && charge.amount_refunded < charge.amount_total) {
        return Response.json({ received: true, partial: true });
      }
      const userId = charge.metadata?.user_id;
      const coins = parseInt(charge.metadata?.coins || '0', 10);
      const priceUsd = parseFloat(charge.metadata?.priceUsd || '0');
      const packId = charge.metadata?.packId || '';
      if (userId && coins > 0) {
        await applyCoinDelta(base44, userId, -coins, packId || 'refund', priceUsd, `refund:${charge.id}`);
      }
    } else if (event.type === 'charge.dispute.created') {
      // A dispute withholds the funds — deduct the purchased coins (floored at 0).
      // The dispute object doesn't carry our metadata, so read it from the charge.
      const dispute = event.data.object;
      const charge = await stripe.charges.retrieve(dispute.charge);
      const userId = charge.metadata?.user_id;
      const coins = parseInt(charge.metadata?.coins || '0', 10);
      const priceUsd = parseFloat(charge.metadata?.priceUsd || '0');
      const packId = charge.metadata?.packId || '';
      if (userId && coins > 0) {
        await applyCoinDelta(base44, userId, -coins, packId || 'dispute', priceUsd, `dispute:${dispute.id}`);
      }
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error('stripeWebhook error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});