"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { getActiveAccount } from "@/lib/services/accounts";
import { createArtisanProfile, validateRegistration } from "@/lib/services/artisans";
import { languageOptions } from "@/lib/services/language";
import { useLanguage } from "@/components/language-provider";

export default function SellerOnboardingPage() {
  const router = useRouter();
  const { language: preferredLanguage, setLanguage } = useLanguage();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const account = getActiveAccount();
    if (!account || account.role !== "seller") return;
    const form = new FormData(event.currentTarget);
    const input = {
      account_id: account.id,
      artisan_name: account.display_name,
      phone: String(form.get("phone") ?? ""),
      location: String(form.get("location") ?? ""),
      craft_type: String(form.get("craft_type") ?? ""),
      preferred_language: preferredLanguage,
      upi_id: String(form.get("upi_id") ?? ""),
    };
    const nextErrors = validateRegistration(input);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setBusy(true);
    setFormError("");
    try {
      await createArtisanProfile(input);
      setLanguage(preferredLanguage);
      router.replace("/seller/dashboard");
    } catch (requestError) {
      setFormError(requestError instanceof Error ? requestError.message : "Could not finish seller profile.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app-shell">
      <section className="mx-auto max-w-2xl">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#b84f28]">Google seller setup</p>
        <h1 className="mt-2 text-4xl font-black">Complete your artisan profile</h1>
        <p className="mt-3 text-[#6d5145]">Google verified your identity. Add the business details needed for products and orders.</p>
        <form className="app-card mt-6 grid gap-5 p-6" onSubmit={submit}>
          <div className="rounded-2xl bg-[#fcf9f6] p-4"><span className="field-label">Google account</span><p className="font-bold">Your Google identity has been verified.</p></div>
          <label><span className="field-label">Mobile number</span><input className="field" inputMode="numeric" name="phone" />{errors.phone && <p className="mt-1 text-sm text-red-700">{errors.phone}</p>}</label>
          <div className="grid gap-5 sm:grid-cols-2">
            <label><span className="field-label">Village / city / cluster</span><input className="field" name="location" />{errors.location && <p className="mt-1 text-sm text-red-700">{errors.location}</p>}</label>
            <label><span className="field-label">Craft type</span><input className="field" name="craft_type" />{errors.craft_type && <p className="mt-1 text-sm text-red-700">{errors.craft_type}</p>}</label>
          </div>
          <label><span className="field-label">Preferred language</span><select className="field" onChange={(event) => setLanguage(event.target.value as typeof preferredLanguage)} value={preferredLanguage}>{languageOptions.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}</select></label>
          <label><span className="field-label">UPI ID optional</span><input className="field" name="upi_id" />{errors.upi_id && <p className="mt-1 text-sm text-red-700">{errors.upi_id}</p>}</label>
          {formError && <p className="rounded-2xl bg-red-50 p-4 text-red-800" role="alert">{formError}</p>}
          <button className="primary-button" disabled={busy} type="submit">{busy ? "Saving profile..." : "Finish seller setup"}</button>
        </form>
      </section>
    </div>
  );
}
