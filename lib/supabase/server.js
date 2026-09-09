// @ts-nocheck
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const fallbackUrl = "https://giisvqrencknoofjpntm.supabase.co";
const fallbackKey = "placeholder-anon-key";

export async function createClient() {
  let cookieStore;
  try {
    cookieStore = await cookies();
  } catch {
    // Gracefully handle build-time or non-request context
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || fallbackUrl;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SECRET_KEY || fallbackKey;

  return createServerClient(
    url,
    key,
    {
      cookies: {
        getAll() {
          return cookieStore?.getAll ? cookieStore.getAll() : [];
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore?.set ? cookieStore.set(name, value, options) : null
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing user sessions.
          }
        },
      },
    }
  );
}
