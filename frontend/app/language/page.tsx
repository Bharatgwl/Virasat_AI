"use client";

import { useRouter } from "next/navigation";
import { languageOptions } from "@/lib/services/language";
import { useLanguage } from "@/components/language-provider";
import { getActiveAccount } from "@/lib/services/accounts";
import type { LanguageCode } from "@/lib/types";

export default function LanguagePage() {
  const router = useRouter();
  const { language, selectedLanguage, setLanguage, t } = useLanguage();

  function chooseLanguage(nextLanguage: LanguageCode) {
    setLanguage(nextLanguage);
  }

  function continueToRegistration(role: "seller" | "buyer") {
    if (!selectedLanguage) return;
    const account = getActiveAccount();
    router.replace(
      account
        ? account.role === "seller" ? "/seller/dashboard" : "/buyer/marketplace"
        : role === "seller" ? "/seller/register" : "/buyer/register",
    );
  }

  return (
    <div className="app-shell">
      <section className="mx-auto max-w-3xl">
        <div className="text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[#b84f28] text-2xl font-black text-white">
            V
          </div>
          <p className="mt-5 text-sm font-bold uppercase tracking-[0.2em] text-[#2d6a4f]">
            Viraasat AI · {languageOptions.find((item) => item.code === language)?.english}
          </p>
          <h1 className="mt-3 text-4xl font-black">{t("selectLanguage")}</h1>
          <p className="mx-auto mt-3 max-w-xl text-[#6d5145]">
            {t("languageIntro")}
          </p>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {languageOptions.map((language) => {
            const active = selectedLanguage === language.code;
            return (
              <button
                className={`app-card min-h-24 p-4 text-left transition ${
                  active ? "border-[#b84f28] bg-[#fff6ef] shadow-[0_10px_24px_rgba(184,79,40,0.14)]" : ""
                }`}
                key={language.code}
                aria-pressed={active}
                onClick={() => chooseLanguage(language.code)}
                type="button"
              >
                <span className="block text-lg font-black">{language.label}</span>
                <span className="mt-1 block text-sm font-semibold text-[#7a5b4d]">{language.english}</span>
                <span className="mt-3 inline-flex rounded-full bg-[#f4e9df] px-2 py-1 text-xs font-bold text-[#6d5145]">
                  {language.locale}
                </span>
              </button>
            );
          })}
        </div>

        <div className="warm-card mt-6 flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-bold">{t("selectedLanguage")}: {languageOptions.find((item) => item.code === selectedLanguage)?.label ?? t("noneSelected")}</p>
            <p className="mt-1 text-sm text-[#6d5145]">{t("voiceHint")}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button className="primary-button" disabled={!selectedLanguage} onClick={() => continueToRegistration("seller")} type="button">
              {t("createSeller")}
            </button>
            <button className="primary-button bg-[#2d6a4f]" disabled={!selectedLanguage} onClick={() => continueToRegistration("buyer")} type="button">
              {t("createBuyer")}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
