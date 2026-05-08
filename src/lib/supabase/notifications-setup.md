# Notifications Setup

## 1. Ejecutar SQL en Supabase Dashboard

1. Ir a **Supabase Dashboard → SQL Editor**
2. Pegar y ejecutar el contenido de `notifications-schema.sql`

## 2. Configurar Database Webhook en Supabase

1. Ir a **Database → Webhooks → Create a new hook**
2. Configurar:
   - **Name**: `market_listings_insert`
   - **Table**: `market_listings`
   - **Events**: `INSERT`
   - **URL**: `https://<tu-dominio>/api/webhooks/wishlist`
   - **Headers**: agregar `x-webhook-secret` con el valor del secret
3. Guardar

## 3. Variables de entorno

Agregar en `.env.local` y en Vercel (Settings → Environment Variables):

```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<publicKey>
VAPID_PRIVATE_KEY=<privateKey>
VAPID_EMAIL=mailto:alexistorres1830@gmail.com
SUPABASE_WEBHOOK_SECRET=<string-secreto>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key-de-supabase>
```

La `SUPABASE_SERVICE_ROLE_KEY` se encuentra en **Supabase Dashboard → Settings → API → service_role**.
Esta key solo debe usarse en el servidor (nunca con prefijo `NEXT_PUBLIC_`).
