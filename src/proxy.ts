import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

// ── Rate limiting ─────────────────────────────────────────────────────────────
// En Cloudflare el conteo lo lleva el rate limiter nativo (bindings RL_* en
// wrangler.jsonc), no un Map: cada isolate tiene su propia memoria, asi que un
// contador local no protege nada. El Map sobrevive solo como reserva para
// `next dev`, donde los bindings no existen.
type Limiter = { limit: (opts: { key: string }) => Promise<{ success: boolean }> };

const RATE_LIMITED: Record<string, { binding: string; limit: number; windowMs: number }> = {
  "/login":              { binding: "RL_LOGIN",          limit: 15, windowMs: 60_000 },
  "/api/auth":           { binding: "RL_API_AUTH",       limit: 15, windowMs: 60_000 },
  "/api/push/subscribe": { binding: "RL_PUSH_SUBSCRIBE", limit: 5,  windowMs: 60_000 },
  "/api/webhooks":       { binding: "RL_WEBHOOKS",       limit: 30, windowMs: 60_000 },
  "/api/admin":          { binding: "RL_ADMIN",          limit: 20, windowMs: 60_000 },
};

// En proxy hay que pedir el contexto en modo async: el sincrono no esta
// inicializado en ese bundle y devuelve nada. El aviso importa — la primera
// version fallaba en silencio y dejaba el rate limit sin efecto en produccion.
async function getLimiter(binding: string): Promise<Limiter | null> {
  try {
    const { env } = await getCloudflareContext({ async: true });
    const limiter = (env as unknown as Record<string, Limiter | undefined>)?.[binding];
    if (!limiter) {
      console.warn(`[rate-limit] binding ${binding} no disponible; cayendo al contador local`);
      return null;
    }
    return limiter;
  } catch (err) {
    console.warn(`[rate-limit] sin contexto de Cloudflare (${String(err)}); contador local`);
    return null; // next dev
  }
}

// ── Reserva en memoria, solo para desarrollo local ────────────────────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function rateLimitLocal(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}

let cleanupCounter = 0;
function maybeCleanup() {
  if (++cleanupCounter % 100 !== 0) return;
  const now = Date.now();
  for (const [key, entry] of rateLimitMap.entries()) {
    if (now > entry.resetAt) rateLimitMap.delete(key);
  }
}

// ── Protected routes ──────────────────────────────────────────────────────────
const PROTECTED = ["/dashboard", "/admin"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Rate limiting
  maybeCleanup();
  for (const [path, cfg] of Object.entries(RATE_LIMITED)) {
    if (pathname.startsWith(path)) {
      const ip =
        request.headers.get("cf-connecting-ip") ??
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        request.headers.get("x-real-ip") ??
        "unknown";

      const limiter = await getLimiter(cfg.binding);
      const permitido = limiter
        ? (await limiter.limit({ key: `${ip}:${path}` })).success
        : rateLimitLocal(`${ip}:${path}`, cfg.limit, cfg.windowMs);

      if (!permitido) {
        return new NextResponse(
          JSON.stringify({ error: "Too Many Requests" }),
          {
            status: 429,
            headers: {
              "Content-Type": "application/json",
              "Retry-After": String(Math.ceil(cfg.windowMs / 1000)),
            },
          }
        );
      }
      break;
    }
  }

  // 2. Supabase session refresh
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getClaims() verifica la firma del JWT en el propio edge usando el JWKS
  // (el proyecto usa llaves asimétricas ES256), sin ir por red a Supabase Auth
  // en cada request. Es una verificación criptográfica real, no getSession().
  // Si el token fuera legacy HS256, la librería cae sola a la verificación
  // remota, así que el guard nunca se debilita.
  // La verificación fuerte con getUser() sigue viva en el layout de servidor.
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub ?? null;

  // 3. Protect private routes
  const isProtected = PROTECTED.some(p => pathname.startsWith(p));
  if (!userId && isProtected) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // 4. Redirect logged-in users away from login
  if (userId && pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // El guard de onboarding NO vive aquí: hacía una query a `players` en cada
  // request al dashboard, duplicando la que ya hace el layout de servidor.
  // - /dashboard  → src/app/dashboard/layout.tsx (datos memoizados con cache())
  // - /onboarding → la propia página redirige si el perfil ya está completo
  //   o si no hay sesión.

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/login",
    "/onboarding",
    "/api/auth/:path*",
    "/api/push/:path*",
    "/api/webhooks/:path*",
    "/api/admin/:path*",
  ],
};
