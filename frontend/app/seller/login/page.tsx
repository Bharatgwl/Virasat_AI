"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { loginAccount, validateAccountLogin } from "@/lib/services/accounts";
import { GoogleAuthButton } from "@/components/google-auth-button";

export default function SellerLoginPage() {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    const form = new FormData(event.currentTarget);
    const input = {
      role: "seller" as const,
      identifier: String(form.get("identifier") ?? ""),
      password: String(form.get("password") ?? ""),
    };
    const nextErrors = validateAccountLogin(input);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setBusy(true);
    try {
      await loginAccount(input);
      router.replace("/seller/dashboard");
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Could not login.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app-shell">
      <section className="mx-auto max-w-xl">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#b84f28]">Seller login</p>
          <h1 className="mt-2 text-4xl font-black">Enter artisan dashboard</h1>
          <p className="mt-2 text-[#6d5145]">Use the seller account created during artisan registration.</p>
        </div>

        <form className="app-card mt-6 grid gap-5 p-6" onSubmit={submit}>
          <GoogleAuthButton role="seller" />
          <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.16em] text-[#9a8175]"><span className="h-px flex-1 bg-[#eadbcf]" />or use password<span className="h-px flex-1 bg-[#eadbcf]" /></div>
          <label>
            <span className="field-label">Phone or email</span>
            <input className="field" name="identifier" placeholder="9876543210 or seller@example.com" />
            {errors.identifier && <p className="mt-1 text-sm text-red-700">{errors.identifier}</p>}
          </label>
          <label>
            <span className="field-label">Password</span>
            <input className="field" name="password" type="password" />
            {errors.password && <p className="mt-1 text-sm text-red-700">{errors.password}</p>}
          </label>
          {formError && <p className="rounded-2xl bg-red-50 p-4 text-red-800">{formError}</p>}
          <button className="primary-button w-full" disabled={busy} type="submit">
            {busy ? "Logging in..." : "Login as seller"}
          </button>
          <Link className="text-center text-sm font-bold text-[#b84f28]" href="/language">
            Create new seller account
          </Link>
        </form>
      </section>
    </div>
  );
}
