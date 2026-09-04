"use client";

import Link from "next/link";
import { useLanguage } from "@/components/language-provider";

export default function HomePage() {
  const { t } = useLanguage();
  return (
    <div className="app-shell">
      <section className="mx-auto max-w-5xl">
        <div className="text-center">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#b84f28]">Viraasat AI</p>
          <h1 className="mt-3 text-5xl font-black">{t("chooseSide")}</h1>
          <p className="mx-auto mt-4 max-w-2xl text-[#6d5145]">
            {t("homeIntro")}
          </p>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <article className="warm-card p-7">
            <span className="pill bg-white text-[#b84f28]">{t("sellerRole")}</span>
            <h2 className="mt-5 text-3xl font-black">{t("sellerTitle")}</h2>
            <p className="mt-3 text-[#6d5145]">{t("sellerIntro")}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link className="primary-button inline-flex" href="/language">{t("createSeller")}</Link>
              <Link className="secondary-button inline-flex" href="/seller/login">{t("sellerLogin")}</Link>
            </div>
          </article>

          <article className="app-card p-7">
            <span className="pill bg-[#e8f3ec] text-[#2d6a4f]">{t("buyerRole")}</span>
            <h2 className="mt-5 text-3xl font-black">{t("buyerTitle")}</h2>
            <p className="mt-3 text-[#6d5145]">{t("buyerIntro")}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link className="primary-button inline-flex bg-[#2d6a4f]" href="/buyer/register">{t("createBuyer")}</Link>
              <Link className="secondary-button inline-flex" href="/buyer/login">{t("buyerLogin")}</Link>
              <Link className="secondary-button inline-flex" href="/buyer/login">{t("browseFirst")}</Link>
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}
