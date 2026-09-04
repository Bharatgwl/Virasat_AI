"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { signupAccount, validateAccountSignup } from "@/lib/services/accounts";
import { createBuyer, validateBuyer } from "@/lib/services/buyers";
import { languageOptions } from "@/lib/services/language";
import { GoogleAuthButton } from "@/components/google-auth-button";
import { useLanguage } from "@/components/language-provider";

export default function BuyerRegisterPage() {
  const router = useRouter();
  const { language: preferredLanguage, setLanguage } = useLanguage();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    const form = new FormData(event.currentTarget);
    const input = {
      buyer_name: String(form.get("buyer_name") ?? ""),
      phone: String(form.get("phone") ?? ""),
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
      confirm_password: String(form.get("confirm_password") ?? ""),
      delivery_address: String(form.get("delivery_address") ?? ""),
      preferred_language: preferredLanguage,
    };
    const buyerInput = {
      buyer_name: input.buyer_name,
      phone: input.phone,
      email: input.email,
      delivery_address: input.delivery_address,
      preferred_language: input.preferred_language,
    };
    const nextErrors = {
      ...validateAccountSignup({
        role: "buyer",
        display_name: input.buyer_name,
        phone: input.phone,
        email: input.email,
        password: input.password,
        confirm_password: input.confirm_password,
      }),
      ...validateBuyer(buyerInput),
    };
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setBusy(true);
    try {
      const account = await signupAccount({
        role: "buyer",
        display_name: input.buyer_name,
        phone: input.phone,
        email: input.email,
        password: input.password,
        confirm_password: input.confirm_password,
      });
      await createBuyer({ ...buyerInput, account_id: account.id });
      router.replace("/buyer/checkout");
    } catch (requestError) {
      setFormError(requestError instanceof Error ? requestError.message : "Could not create buyer account.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app-shell">
      <section className="mx-auto max-w-3xl">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#2d6a4f]">Buyer account</p>
          <h1 className="mt-2 text-4xl font-black">Create customer account</h1>
          <p className="mt-2 text-[#6d5145]">Create login credentials and delivery details before placing the order.</p>
        </div>
        <form className="app-card mt-6 grid gap-5 p-6" onSubmit={submit}>
          <GoogleAuthButton role="buyer" />
          <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.16em] text-[#9a8175]"><span className="h-px flex-1 bg-[#eadbcf]" />or register with password<span className="h-px flex-1 bg-[#eadbcf]" /></div>
          <label>
            <span className="field-label">Buyer name</span>
            <input className="field" name="buyer_name" placeholder="Aarav Sharma" />
            {errors.buyer_name && <p className="mt-1 text-sm text-red-700">{errors.buyer_name}</p>}
          </label>
          <div className="grid gap-5 sm:grid-cols-2">
            <label>
              <span className="field-label">Mobile number</span>
              <input className="field" inputMode="numeric" name="phone" placeholder="9876501234" />
              {errors.phone && <p className="mt-1 text-sm text-red-700">{errors.phone}</p>}
            </label>
            <label>
              <span className="field-label">Email optional</span>
              <input className="field" name="email" placeholder="buyer@example.com" />
              {errors.email && <p className="mt-1 text-sm text-red-700">{errors.email}</p>}
            </label>
          </div>
          <label>
            <span className="field-label">Delivery address / city</span>
            <textarea className="field min-h-24" name="delivery_address" placeholder="Jaipur, Rajasthan" />
            {errors.delivery_address && <p className="mt-1 text-sm text-red-700">{errors.delivery_address}</p>}
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
          <label>
            <span className="field-label">Preferred language</span>
            <select className="field" onChange={(event) => setLanguage(event.target.value as typeof preferredLanguage)} value={preferredLanguage}>
              {languageOptions.map((language) => <option key={language.code} value={language.code}>{language.label}</option>)}
            </select>
          </label>
          <button className="primary-button w-full bg-[#2d6a4f]" disabled={busy} type="submit">
            {busy ? "Saving..." : "Create buyer account"}
          </button>
          {formError && <p className="rounded-2xl bg-red-50 p-4 text-red-800">{formError}</p>}
        </form>
      </section>
    </div>
  );
}
