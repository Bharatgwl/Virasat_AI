"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/language-provider";
import { getActiveAccount } from "@/lib/services/accounts";
import { createBuyer, validateBuyer } from "@/lib/services/buyers";
import { languageOptions } from "@/lib/services/language";

export default function BuyerOnboardingPage() {
  const router = useRouter();
  const { language: preferredLanguage, setLanguage } = useLanguage();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const account = getActiveAccount();
    if (!account || account.role !== "buyer") return;
    const form = new FormData(event.currentTarget);
    const input = {
      account_id: account.id,
      buyer_name: account.display_name,
      phone: String(form.get("phone") ?? ""),
      email: account.email,
      delivery_address: String(form.get("delivery_address") ?? ""),
      preferred_language: preferredLanguage,
    };
    const nextErrors = validateBuyer(input);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setBusy(true);
    setFormError("");
    try {
      await createBuyer(input);
      setLanguage(preferredLanguage);
      router.replace("/buyer/marketplace");
    } catch (requestError) {
      setFormError(requestError instanceof Error ? requestError.message : "Could not finish buyer profile.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app-shell">
      <section className="mx-auto max-w-2xl">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#2d6a4f]">Google buyer setup</p>
        <h1 className="mt-2 text-4xl font-black">Complete your customer profile</h1>
        <p className="mt-3 text-[#6d5145]">Google verified your identity. Add the details needed for delivery and orders.</p>
        <form className="app-card mt-6 grid gap-5 p-6" onSubmit={submit}>
          <div className="rounded-2xl bg-[#fcf9f6] p-4"><span className="field-label">Google account</span><p className="font-bold">Your Google identity has been verified.</p></div>
          <label><span className="field-label">Mobile number</span><input className="field" inputMode="numeric" name="phone" />{errors.phone && <p className="mt-1 text-sm text-red-700">{errors.phone}</p>}</label>
          <label><span className="field-label">Delivery address</span><textarea className="field min-h-24" name="delivery_address" />{errors.delivery_address && <p className="mt-1 text-sm text-red-700">{errors.delivery_address}</p>}</label>
          <label><span className="field-label">Preferred language</span><select className="field" onChange={(event) => setLanguage(event.target.value as typeof preferredLanguage)} value={preferredLanguage}>{languageOptions.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}</select></label>
          {formError && <p className="rounded-2xl bg-red-50 p-4 text-red-800" role="alert">{formError}</p>}
          <button className="primary-button bg-[#2d6a4f]" disabled={busy} type="submit">{busy ? "Saving profile..." : "Finish buyer setup"}</button>
        </form>
      </section>
    </div>
  );
}
