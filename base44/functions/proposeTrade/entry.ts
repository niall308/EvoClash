import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { canTradeWith } from '../../shared/tradeAccess.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { toUserId, toUserName, fromCardId, toCardId, coins } = await req.json();
    if (!toUserId || !fromCardId || !toCardId) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (toUserId === user.id) return Response.json({ error: 'You cannot trade with yourself' }, { status: 400 });

    const offeredCoins = Number.isFinite(coins) ? Math.max(0, Math.floor(coins)) : 0;
    if (offeredCoins > (user.coins || 0)) {
      return Response.json({ error: 'You do not have enough LC coins to offer that amount' }, { status: 400 });
    }

    const allowed = await canTradeWith(base44, user.id, toUserId);
    if (!allowed) return Response.json({ error: 'You can only trade with friends or recent opponents' }, { status: 403 });

    // Verify caller actually owns the offered card (RLS-scoped read).
    const myCardMatches = await base44.entities.Card.filter({ id: fromCardId });
    const fromCard = myCardMatches[0];
    if (!fromCard) return Response.json({ error: 'You do not own that card' }, { status: 403 });

    // Verify the requested card really belongs to the target friend.
    const theirCardMatches = await base44.asServiceRole.entities.Card.filter({ id: toCardId });
    const toCard = theirCardMatches[0];
    if (!toCard || toCard.ownerId !== toUserId) {
      return Response.json({ error: 'That card no longer belongs to this player' }, { status: 400 });
    }

    const trade = await base44.entities.TradeRequest.create({
      toUserId,
      toUserName: toUserName || '',
      fromCardId: fromCard.id,
      fromCardName: fromCard.name,
      fromCardType: fromCard.type,
      fromCardTier: fromCard.tier,
      fromCardAttack: fromCard.attack,
      fromCardDefense: fromCard.defense,
      fromCardBonusDamage: fromCard.bonusDamage || 0,
      fromCardIsHybrid: !!fromCard.isHybrid,
      fromCardImageUrl: fromCard.imageUrl,
      toCardId: toCard.id,
      toCardName: toCard.name,
      toCardType: toCard.type,
      toCardTier: toCard.tier,
      toCardAttack: toCard.attack,
      toCardDefense: toCard.defense,
      toCardBonusDamage: toCard.bonusDamage || 0,
      toCardIsHybrid: !!toCard.isHybrid,
      toCardImageUrl: toCard.imageUrl,
      coins: offeredCoins,
      lastOfferBy: 'proposer',
      status: 'pending',
    });

    const toUser = await base44.asServiceRole.entities.User.get(toUserId).catch(() => null);
    if (toUser?.email && toUser.notifyEmails === true && toUser.notifyTradeRequests === true) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: toUser.email,
        subject: `${user.username || user.full_name} sent you a trade request!`,
        body: `Hi ${toUser.full_name || 'Champion'},\n\n${user.username || user.full_name} wants to trade cards with you in EvoClash. Open the app to review the offer.\n\n— The EvoClash Team`,
      });
    }

    return Response.json({ trade });
  } catch (error) {
    console.error('proposeTrade error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});