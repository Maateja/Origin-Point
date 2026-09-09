// @ts-nocheck
import { createBrowserClient } from "@supabase/ssr";

const fallbackUrl = "https://giisvqrencknoofjpntm.supabase.co";
const fallbackKey = "placeholder-anon-key";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || fallbackUrl;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || fallbackKey;
  return createBrowserClient(url, key);
}

export const supabase = createClient();
