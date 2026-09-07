"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { logoutAccount } from "@/lib/services/accounts";
import { getCurrentArtisan } from "@/lib/services/artisans";
import type { ArtisanProfile } from "@/lib/types";

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ArtisanProfile | null>(null);
  const [error, setError] = useState("");
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    getCurrentArtisan()
      .then(setProfile)
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : "Could not load seller profile."));
  }, []);

  async function logout() {
    setSigningOut(true);
    setError("");
    try {
      await logoutAccount();
      router.replace("/");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Secure sign-out could not be completed.");
      setSigningOut(false);
    }
  }

  if (error && !profile) {
    return <div className="app-shell"><section className="app-card p-6 text-red-800" role="alert">{error}</section></div>;
  }

  if (!profile) {
    return (
      <div className="app-shell">
        <p className="app-card p-6">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="app-shell">
      {error && <p className="mb-5 rounded-2xl bg-red-50 p-4 text-red-800" role="alert">{error}</p>}
      <section className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="app-card p-6">
          <span className="pill bg-[#f4e9df] text-[#b84f28]">Seller profile</span>
          <div className="grid h-24 w-24 place-items-center rounded-3xl bg-[#f4e9df] text-4xl font-black text-[#b84f28]">
            {profile.artisan_name.slice(0, 1)}
          </div>
          <h1 className="mt-5 text-4xl font-black">{profile.artisan_name}</h1>
          <p className="mt-2 text-lg font-semibold text-[#6d5145]">{profile.craft_type}</p>
          <p className="mt-1 text-[#6d5145]">{profile.location}</p>
          <span className="pill mt-5 bg-[#e8f3ec] text-[#2d6a4f]">ONDC status: {profile.ondc_status}</span>
        </div>

        <div className="grid gap-4">
          <div className="app-card p-5">
            <h2 className="text-xl font-black">Language preference</h2>
            <p className="mt-2 text-[#6d5145]">Current app and voice language: {profile.preferred_language.toUpperCase()}</p>
          </div>
          <div className="app-card p-5">
            <h2 className="text-xl font-black">Payment and ONDC</h2>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-[#fcf9f6] p-4">
                <dt className="text-sm font-bold text-[#6d5145]">UPI</dt>
                <dd className="mt-1 font-black">{profile.upi_id || "Not added"}</dd>
              </div>
              <div className="rounded-2xl bg-[#fcf9f6] p-4">
                <dt className="text-sm font-bold text-[#6d5145]">Phone</dt>
                <dd className="mt-1 font-black">{profile.phone}</dd>
              </div>
            </dl>
          </div>
          <div className="warm-card p-5">
            <h2 className="text-xl font-black">Settings</h2>
            <p className="mt-2 text-[#6d5145]">Sign out when this device should no longer access the seller workspace.</p>
            <button className="secondary-button mt-5" disabled={signingOut} onClick={logout} type="button">{signingOut ? "Signing out..." : "Logout"}</button>
          </div>
        </div>
      </section>
    </div>
  );
}
