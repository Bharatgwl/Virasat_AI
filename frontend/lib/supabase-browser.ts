import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

function browserConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return url && publishableKey ? { url, publishableKey } : null;
}

export function getSupabaseBrowserClient(): SupabaseClient | null {
  const config = browserConfig();
  if (!config) return null;

  if (!browserClient) {
    browserClient = createClient(config.url, config.publishableKey, {
      auth: {
        flowType: "pkce",
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  }
  return browserClient;
}

export async function googleProviderEnabled(): Promise<boolean | null> {
  const config = browserConfig();
  if (!config) return null;
  try {
    const response = await fetch(`${config.url}/auth/v1/settings`, {
      headers: { apikey: config.publishableKey },
    });
    if (!response.ok) return null;
    const settings = await response.json() as { external?: { google?: boolean } };
    return settings.external?.google === true;
  } catch {
    return null;
  }
}
