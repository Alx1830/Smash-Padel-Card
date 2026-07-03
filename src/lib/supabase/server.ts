import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );
}

/**
 * Resuelve el usuario autenticado y su perfil una sola vez por request.
 * React.cache() memoiza el resultado entre RootLayout y DashboardLayout,
 * evitando repetir el round-trip a Supabase Auth + la query a `players`.
 */
export const getAuthedPlayer = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, profile: null };
  const { data: profile } = await supabase
    .from("players")
    .select("photo_url, username, first_name, last_name, pais, tipo_perfil, role")
    .eq("user_id", user.id)
    .maybeSingle();
  return { user, profile };
});
