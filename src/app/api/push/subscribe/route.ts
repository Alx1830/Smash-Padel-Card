import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  interface RawSubscription {
    endpoint: string;
    keys?: { p256dh: string; auth: string };
    expirationTime?: number | null;
  }

  let subscription: RawSubscription;
  try {
    subscription = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!subscription?.endpoint || !subscription?.keys) {
    return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 });
  }

  // Solo servicios push reales: el servidor después hace POST a este endpoint en
  // cada aviso masivo, así que no puede ser una URL cualquiera que elija el usuario.
  let host = '';
  try {
    const url = new URL(subscription.endpoint);
    if (url.protocol === 'https:' && subscription.endpoint.length <= 1024) host = url.hostname;
  } catch { /* host queda vacío y se rechaza abajo */ }
  const PUSH_HOSTS = [/^fcm\.googleapis\.com$/, /(^|\.)push\.apple\.com$/, /(^|\.)push\.services\.mozilla\.com$/, /(^|\.)notify\.windows\.com$/];
  if (!PUSH_HOSTS.some(re => re.test(host))) {
    return NextResponse.json({ error: 'Servicio push no reconocido' }, { status: 400 });
  }

  const { keys } = subscription as { endpoint: string; keys: { p256dh: string; auth: string } };
  if (typeof keys.p256dh !== 'string' || typeof keys.auth !== 'string' || keys.p256dh.length > 200 || keys.auth.length > 100) {
    return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 });
  }

  const { error } = await supabase
    .from('push_subscriptions')
    .upsert(
      {
        user_id: user.id,
        endpoint: subscription.endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
      { onConflict: 'user_id,endpoint' }
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
