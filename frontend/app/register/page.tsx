"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { signupAccount, validateAccountSignup } from "@/lib/services/accounts";
import { createArtisanProfile, validateRegistration } from "@/lib/services/artisans";
import { languageOptions } from "@/lib/services/language";
import { useLanguage } from "@/components/language-provider";
import { GoogleAuthButton } from "@/components/google-auth-button";

export default function RegisterPage() {
  const router = useRouter();
  const { language: preferredLanguage, setLanguage } = useLanguage();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submitRegistration(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    const form = new FormData(event.currentTarget);
    const input = {
      artisan_name: String(form.get("artisan_name") ?? ""),
      phone: String(form.get("phone") ?? ""),
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
      confirm_password: String(form.get("confirm_password") ?? ""),
      location: String(form.get("location") ?? ""),
      craft_type: String(form.get("craft_type") ?? ""),
      preferred_language: preferredLanguage,
      upi_id: String(form.get("upi_id") ?? ""),
    };
    const profileInput = {
      artisan_name: input.artisan_name,
      phone: input.phone,
      location: input.location,
      craft_type: input.craft_type,
      preferred_language: input.preferred_language,
      upi_id: input.upi_id,
    };
    const nextErrors = {
      ...validateAccountSignup({
        role: "seller",
        display_name: input.artisan_name,
        phone: input.phone,
        email: input.email,
        password: input.password,
        confirm_password: input.confirm_password,
      }),
      ...validateRegistration(profileInput),
    };
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setBusy(true);
    try {
      const account = await signupAccount({
        role: "seller",
        display_name: input.artisan_name,
        phone: input.phone,
        email: input.email,
        password: input.password,
        confirm_password: input.confirm_password,
      });
      await createArtisanProfile({ ...profileInput, account_id: account.id });
      router.replace("/seller/dashboard");
    } catch (requestError) {
      setFormError(requestError instanceof Error ? requestError.message : "Could not create seller account.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app-shell">
      <section className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="warm-card p-6">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#b84f28]">Seller account</p>
          <h1 className="mt-3 text-4xl font-black">Create artisan seller account</h1>
          <p className="mt-4 text-[#6d5145]">
            Seller account and artisan profile stay connected, but backend will keep authentication separate from product listing data.
          </p>
          <div className="mt-8 rounded-2xl bg-white p-5">
            <p className="font-bold">After this screen</p>
            <p className="mt-2 text-sm text-[#6d5145]">The artisan goes directly to dashboard and can start adding products by photo and voice.</p>
          </div>
        </div>

        <form className="app-card grid gap-5 p-6" onSubmit={submitRegistration}>
          <GoogleAuthButton role="seller" />
          <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.16em] text-[#9a8175]"><span className="h-px flex-1 bg-[#eadbcf]" />or register with password<span className="h-px flex-1 bg-[#eadbcf]" /></div>
          <label>
            <span className="field-label">Artisan name</span>
            <input className="field" name="artisan_name" placeholder="Rameshwar Prajapati" />
            {errors.artisan_name && <p className="mt-1 text-sm text-red-700">{errors.artisan_name}</p>}
          </label>
          <div className="grid gap-5 sm:grid-cols-2">
            <label>
              <span className="field-label">Mobile number</span>
              <input className="field" inputMode="numeric" name="phone" placeholder="9876543210" />
              {errors.phone && <p className="mt-1 text-sm text-red-700">{errors.phone}</p>}
            </label>
            <label>
              <span className="field-label">Preferred language</span>
              <select className="field" onChange={(event) => setLanguage(event.target.value as typeof preferredLanguage)} value={preferredLanguage}>
                {languageOptions.map((language) => (
                  <option key={language.code} value={language.code}>{language.label}</option>
                ))}
              </select>
            </label>
          </div>
          <label>
            <span className="field-label">Email optional</span>
            <input className="field" name="email" placeholder="seller@example.com" />
            {errors.email && <p className="mt-1 text-sm text-red-700">{errors.email}</p>}
          </label>
          <div className="grid gap-5 sm:grid-cols-2">
            <label>
              <span className="field-label">Password</span>
              <input className="field" name="password" type="password" />
              {errors.password && <p className="mt-1 text-sm text-red-700">{errors.password}</p>}
            </label>
            <label>
              <span className="field-label">Confirm password</span>
              <input className="field" name="confirm_password" type="password" />
              {errors.confirm_password && <p className="mt-1 text-sm text-red-700">{errors.confirm_password}</p>}
            </label>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <label>
              <span className="field-label">Village / city / cluster</span>
              <input className="field" name="location" placeholder="Kutch, Gujarat" />
              {errors.location && <p className="mt-1 text-sm text-red-700">{errors.location}</p>}
            </label>
            <label>
              <span className="field-label">Craft type</span>
              <input className="field" name="craft_type" placeholder="Terracotta pottery" />
              {errors.craft_type && <p className="mt-1 text-sm text-red-700">{errors.craft_type}</p>}
            </label>
          </div>
          <label>
            <span className="field-label">UPI ID optional</span>
            <input className="field" name="upi_id" placeholder="name@bank" />
            {errors.upi_id && <p className="mt-1 text-sm text-red-700">{errors.upi_id}</p>}
          </label>
          <button className="primary-button w-full" disabled={busy} type="submit">
            {busy ? "Saving..." : "Create seller account"}
          </button>
          {formError && <p className="rounded-2xl bg-red-50 p-4 text-red-800">{formError}</p>}
        </form>
      </section>
    </div>
  );
}
