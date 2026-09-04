"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { loginWithGoogleAccessToken } from "@/lib/services/accounts";
import { getCurrentArtisan } from "@/lib/services/artisans";
import { getCurrentBuyer } from "@/lib/services/buyers";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { isApiRequestError } from "@/lib/api-client";
import type { AccountRole } from "@/lib/types";

function readRole(): AccountRole | null {
  const queryRole = new URLSearchParams(window.location.search).get("role");
  const storedRole = window.localStorage.getItem("viraasat_oauth_role");
  const role = queryRole ?? storedRole;
  return role === "seller" || role === "buyer" ? role : null;
}

export default function AuthCallbackPage() {
  const router = useRouter();
  const started = useRef(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    async function finishGoogleLogin() {
      const role = readRole();
      const supabase = getSupabaseBrowserClient();
      if (!role) throw new Error("The account role was not preserved. Please start Google sign-in again.");
      if (!supabase) throw new Error("Supabase browser settings are missing.");

      const code = new URLSearchParams(window.location.search).get("code");
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) throw exchangeError;
      }

      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!data.session?.access_token) throw new Error("Google did not return a valid session.");

      await loginWithGoogleAccessToken(role, data.session.access_token);
      window.localStorage.removeItem("viraasat_oauth_role");

      if (role === "seller") {
        try {
          await getCurrentArtisan(true);
          router.replace("/seller/dashboard");
        } catch (profileError) {
          if (isApiRequestError(profileError) && profileError.status === 404) {
            router.replace("/seller/onboarding");
          } else {
            throw profileError;
          }
        }
      } else {
        try {
          await getCurrentBuyer(true);
          router.replace("/buyer/marketplace");
        } catch (profileError) {
          if (isApiRequestError(profileError) && profileError.status === 404) {
            router.replace("/buyer/onboarding");
          } else {
            throw profileError;
          }
        }
      }
    }

    void finishGoogleLogin().catch((callbackError) => {
      setError(callbackError instanceof Error ? callbackError.message : "Google sign-in could not be completed.");
    });
  }, [router]);

  return (
    <div className="app-shell">
      <section className="app-card mx-auto max-w-xl p-8 text-center">
        <h1 className="text-3xl font-black">Completing secure Google sign-in</h1>
        {!error && <p className="mt-3 text-[#6d5145]">Please wait while we verify your Supabase session.</p>}
        {error && (
          <>
            <p className="mt-3 rounded-2xl bg-red-50 p-4 text-red-800" role="alert">{error}</p>
            <Link className="secondary-button mt-5 inline-flex" href="/">Return to account selection</Link>
          </>
        )}
      </section>
    </div>
  );
}
