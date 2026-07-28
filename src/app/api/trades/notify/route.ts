import { NextRequest, NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { webpush } from '@/lib/web-push';
import webpushLib from 'web-push';

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type Kind = 'new' | 'accepted' | 'rejected';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { trade_id?: string; kind?: Kind };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const tradeId = String(body.trade_id ?? '');
  const kind: Kind = body.kind === 'accepted' || body.kind === 'rejected' ? body.kind : 'new';
  if (!UUID_RE.test(tradeId)) {
    return NextResponse.json({ error: 'Invalid trade_id' }, { status: 400 });
  }

  const { data: trade } = await supabaseAdmin
    .from('trades')
    .select('id, from_user_id, to_user_id, status')
    .eq('id', tradeId)
    .maybeSingle();

  if (!trade) return NextResponse.json({ error: 'Trade not found' }, { status: 404 });

  // Solo el actor legítimo puede disparar cada tipo de aviso
  const actorId = kind === 'new' ? trade.from_user_id : trade.to_user_id;
  if (user.id !== actorId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const targetId = kind === 'new' ? trade.to_user_id : trade.from_user_id;

  const { data: actor } = await supabaseAdmin
    .from('players')
    .select('username, first_name')
    .eq('user_id', actorId)
    .maybeSingle();

  const actorName = String(actor?.username || actor?.first_name || 'Un jugador')
    .replace(/[<>"'&]/g, '')
    .slice(0, 40);

  const url = '/dashboard/trades/solicitudes';
  const copy: Record<Kind, { title: string; body: string; type: string }> = {
    new: {
      type: 'trade_request',
      title: 'Nueva solicitud de intercambio',
      body: `${actorName} te envió una solicitud de intercambio`,
    },
    accepted: {
      type: 'trade_accepted',
      title: 'Intercambio aceptado',
      body: `${actorName} aceptó tu solicitud de intercambio`,
    },
    rejected: {
      type: 'trade_rejected',
      title: 'Intercambio rechazado',
      body: `${actorName} rechazó tu solicitud de intercambio`,
    },
  };
  const { title, body: msgBody, type } = copy[kind];

  const { error: insertError } = await supabaseAdmin.from('notifications').insert({
    user_id: targetId,
    type,
    title,
    body: msgBody,
    data: { trade_id: tradeId, url },
  });

  if (insertError) {
    console.error('[Trades] Insert notification error:', insertError);
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  const { data: subscriptions } = await supabaseAdmin
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', targetId);

  if (!subscriptions?.length) {
    return NextResponse.json({ ok: true, pushed: 0 });
  }

  const payload = JSON.stringify({
    title,
    body: msgBody,
    icon: '/icon-512.webp',
    badge: '/favicon-32.png',
    data: { url },
  });

  const results = await Promise.allSettled(
    subscriptions.map(async (sub: { endpoint: string; p256dh: string; auth: string }) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
          { TTL: 86400, urgency: 'high' }
        );
      } catch (err: unknown) {
        const pushError = err as webpushLib.WebPushError;
        if (pushError?.statusCode === 410 || pushError?.statusCode === 404) {
          await supabaseAdmin.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
        }
        throw err;
      }
    })
  );

  return NextResponse.json({
    ok: true,
    pushed: results.filter(r => r.status === 'fulfilled').length,
  });
}
