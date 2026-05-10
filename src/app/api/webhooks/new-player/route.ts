import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { webpush } from '@/lib/web-push';
import webpushLib from 'web-push';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface WebhookPayload {
  record: {
    user_id: string;
    username: string;
    first_name?: string;
    last_name?: string;
    pais?: string;
    created_at: string;
  };
}

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-webhook-secret');
  if (secret !== process.env.SUPABASE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let payload: WebhookPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { user_id, username, first_name, last_name, pais } = payload.record;
  console.log('[NewPlayer Webhook] New registration:', username, user_id);

  const displayName = first_name
    ? `${first_name}${last_name ? ' ' + last_name : ''}`
    : username;

  const locationStr = pais ? ` desde ${pais}` : '';
  const profileUrl = `/${username}`;

  // Find all admin users
  const { data: admins } = await supabaseAdmin
    .from('players')
    .select('user_id')
    .eq('role', 'admin');

  if (!admins?.length) {
    console.log('[NewPlayer Webhook] No admins found');
    return NextResponse.json({ ok: true, notified: 0 });
  }

  const adminIds = admins.map((a: { user_id: string }) => a.user_id);

  const notificationRows = adminIds.map((adminId: string) => ({
    user_id: adminId,
    type: 'new_user_registered',
    title: '🎉 Nuevo usuario registrado',
    body: `${displayName} se acaba de unir a FaceBinder${locationStr}`,
    data: { new_user_id: user_id, new_username: username, url: profileUrl },
  }));

  const { error: insertError } = await supabaseAdmin
    .from('notifications')
    .insert(notificationRows);

  if (insertError) {
    console.error('[NewPlayer Webhook] Insert error:', insertError);
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  console.log('[NewPlayer Webhook] Notifications sent to', adminIds.length, 'admins');

  // Push notifications to admins
  const { data: subscriptions } = await supabaseAdmin
    .from('push_subscriptions')
    .select('user_id, endpoint, p256dh, auth')
    .in('user_id', adminIds);

  if (!subscriptions?.length) {
    return NextResponse.json({ ok: true, notified: adminIds.length, pushed: 0 });
  }

  const pushPayload = JSON.stringify({
    title: '🎉 Nuevo usuario registrado',
    body: `${displayName} se acaba de unir a FaceBinder${locationStr}`,
    icon: '/icon-512.webp',
    badge: '/favicon-32.png',
    data: { url: profileUrl },
  });

  const results = await Promise.allSettled(
    subscriptions.map(async (sub: { endpoint: string; p256dh: string; auth: string }) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          pushPayload,
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

  const pushed = results.filter(r => r.status === 'fulfilled').length;
  console.log('[NewPlayer Webhook] Push results:', pushed, '/', subscriptions.length, 'sent');

  return NextResponse.json({ ok: true, notified: adminIds.length, pushed });
}
