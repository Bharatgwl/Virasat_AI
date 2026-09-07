"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { logoutAccount } from "@/lib/services/accounts";
import { getCurrentBuyer } from "@/lib/services/buyers";
import { useRouter } from "next/navigation";
import type { BuyerProfile } from "@/lib/types";

export default function BuyerProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<BuyerProfile | null>(null);
  const [error, setError] = useState("");
  const [logoutError, setLogoutError] = useState("");
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    getCurrentBuyer()
      .then(setProfile)
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : "Could not load buyer profile."));
  }, []);

  async function logout() {
    setSigningOut(true);
    setLogoutError("");
    try {
      await logoutAccount();
      router.replace("/");
    } catch (requestError) {
      setLogoutError(requestError instanceof Error ? requestError.message : "Secure sign-out could not be completed.");
      setSigningOut(false);
    }
  }

  if (error) {
    return (
      <div className="app-shell">
        <section className="app-card mx-auto max-w-2xl p-8 text-center text-red-800">
          <h1 className="text-3xl font-black">Buyer profile unavailable</h1>
          <p className="mt-3">{error}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link className="secondary-button" href="/buyer/marketplace">Browse marketplace</Link>
          </div>
        </section>
      </div>
    );
  }

  if (!profile) {
    return <p className="app-shell">Loading buyer profile...</p>;
  }

  return (
    <div className="app-shell">
      {logoutError && <p className="mb-5 rounded-2xl bg-red-50 p-4 text-red-800" role="alert">{logoutError}</p>}
      <section className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="app-card p-6">
          <span className="pill bg-[#e8f3ec] text-[#2d6a4f]">Buyer profile</span>
          <div className="mt-5 grid h-24 w-24 place-items-center rounded-3xl bg-[#e8f3ec] text-4xl font-black text-[#2d6a4f]">
            {profile.buyer_name.slice(0, 1)}
          </div>
          <h1 className="mt-5 text-4xl font-black">{profile.buyer_name}</h1>
          <p className="mt-2 text-lg font-semibold text-[#6d5145]">Customer account</p>
          <p className="mt-1 text-[#6d5145]">Used for shopping, checkout, delivery, and order tracking.</p>
        </div>

        <div className="grid gap-4">
          <div className="app-card p-5">
            <h2 className="text-xl font-black">Contact details</h2>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-[#fcf9f6] p-4">
                <dt className="text-sm font-bold text-[#6d5145]">Phone</dt>
                <dd className="mt-1 font-black">{profile.phone}</dd>
              </div>
              <div className="rounded-2xl bg-[#fcf9f6] p-4">
                <dt className="text-sm font-bold text-[#6d5145]">Email</dt>
                <dd className="mt-1 font-black">{profile.email || "Not added"}</dd>
              </div>
            </dl>
          </div>

          <div className="app-card p-5">
            <h2 className="text-xl font-black">Delivery and language</h2>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-[#fcf9f6] p-4">
                <dt className="text-sm font-bold text-[#6d5145]">Delivery address</dt>
                <dd className="mt-1 font-black">{profile.delivery_address}</dd>
              </div>
              <div className="rounded-2xl bg-[#fcf9f6] p-4">
                <dt className="text-sm font-bold text-[#6d5145]">Preferred language</dt>
                <dd className="mt-1 font-black">{profile.preferred_language.toUpperCase()}</dd>
              </div>
            </dl>
          </div>

          <div className="warm-card p-5">
            <h2 className="text-xl font-black">Buyer actions</h2>
            <p className="mt-2 text-[#6d5145]">
              This side is only for customers. Seller catalogue, listing, and artisan payment settings stay in the seller profile.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link className="primary-button bg-[#2d6a4f]" href="/buyer/marketplace">Continue shopping</Link>
              <Link className="secondary-button" href="/buyer/orders">View orders</Link>
              <Link className="secondary-button" href="/buyer/cart">Open cart</Link>
              <button className="secondary-button" disabled={signingOut} onClick={() => void logout()} type="button">{signingOut ? "Signing out..." : "Logout"}</button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
