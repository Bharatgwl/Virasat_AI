"use client";

import { useState } from "react";
import { getSupabaseBrowserClient, googleProviderEnabled } from "@/lib/supabase-browser";
import type { AccountRole } from "@/lib/types";

export function GoogleAuthButton({ role }: { role: AccountRole }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function continueWithGoogle() {
    setError("");
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setError("Google sign-in needs NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.");
      return;
    }

    setBusy(true);
    const providerEnabled = await googleProviderEnabled();
    if (providerEnabled === false) {
      setError("Google sign-in is disabled in this Supabase project. Enable Authentication → Providers → Google and save the Google Client ID and Client Secret.");
      setBusy(false);
      return;
    }
    window.localStorage.setItem("viraasat_oauth_role", role);
    const redirectTo = `${window.location.origin}/auth/callback?role=${role}`;
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (oauthError) {
      setError(oauthError.message);
      setBusy(false);
    }
  }

  return (
    <div>
      <button className="secondary-button w-full" disabled={busy} onClick={() => void continueWithGoogle()} type="button">
        {busy ? "Opening Google..." : "Continue with Google"}
      </button>
      {error && <p className="mt-2 text-sm text-red-700" role="alert">{error}</p>}
    </div>
  );
}
