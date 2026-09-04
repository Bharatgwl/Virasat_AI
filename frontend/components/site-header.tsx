"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/components/language-provider";
import { languageOptions } from "@/lib/services/language";
import type { LanguageCode } from "@/lib/types";

const sellerLinks = [
  ["dashboard", "/seller/dashboard"],
  ["catalog", "/seller/catalog"],
  ["inquiries", "/seller/inquiries"],
  ["sellerProfile", "/seller/profile"],
] as const;

const buyerLinks = [
  ["marketplace", "/buyer/marketplace"],
  ["cart", "/buyer/cart"],
  ["orders", "/buyer/orders"],
  ["buyerProfile", "/buyer/profile"],
] as const;

function getCurrentArea(pathname: string) {
  if (pathname === "/") return "home";
  if (pathname.startsWith("/buyer")) return "buyer";
  if (pathname.startsWith("/seller")) return "seller";
  return "home";
}

export function SiteHeader() {
  const { language, setLanguage, t } = useLanguage();
  const pathname = usePathname();
  const area = getCurrentArea(pathname);
  const links = area === "buyer" ? buyerLinks : area === "seller" ? sellerLinks : [];
  const homeHref = area === "buyer" ? "/buyer/marketplace" : area === "seller" ? "/seller/dashboard" : "/";
  const subtitle =
    area === "buyer"
      ? t("brandSubtitleBuyer")
      : area === "seller"
        ? t("brandSubtitleSeller")
        : t("brandSubtitleHome");

  return (
    <header className="sticky top-0 z-30 border-b border-[#eadbcf] bg-[#fcf9f6]/95 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link className="flex items-center gap-3" href={homeHref}>
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#b84f28] text-lg font-black text-white">
            V
          </span>
          <span>
            <span className="block text-lg font-bold text-[#211814]">Viraasat AI</span>
            <span className="block text-xs font-semibold text-[#7a5b4d]">{subtitle}</span>
          </span>
        </Link>
        <label className="md:hidden">
          <span className="sr-only">Language</span>
          <select className="max-w-28 rounded-full border border-[#eadbcf] bg-white px-2 py-2 text-sm font-semibold text-[#4f3a31]" onChange={(event) => setLanguage(event.target.value as LanguageCode)} value={language}>
            {languageOptions.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}
          </select>
        </label>
        <div className="hidden items-center gap-1 text-sm font-semibold text-[#4f3a31] md:flex">
          {links.map(([label, href]) => (
            <Link
              className={`rounded-full px-3 py-2 ${
                pathname === href ? "bg-[#b84f28] text-white" : "hover:bg-[#f4e9df]"
              }`}
              href={href}
              key={href}
            >
              {t(label)}
            </Link>
          ))}
          <label className="ml-1">
            <span className="sr-only">Language</span>
            <select className="rounded-full border border-[#eadbcf] bg-white px-3 py-2 text-[#4f3a31]" onChange={(event) => setLanguage(event.target.value as LanguageCode)} value={language}>
              {languageOptions.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}
            </select>
          </label>
        </div>
      </nav>
    </header>
  );
}
