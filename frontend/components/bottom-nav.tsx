"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/components/language-provider";

const sellerItems = [
  ["dashboard", "/seller/dashboard"],
  ["catalog", "/seller/catalog"],
  ["inquiries", "/seller/inquiries"],
  ["sellerProfile", "/seller/profile"],
] as const;

const buyerItems = [
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

export function BottomNav() {
  const { t } = useLanguage();
  const pathname = usePathname();
  const area = getCurrentArea(pathname);
  const navItems = area === "buyer" ? buyerItems : area === "seller" ? sellerItems : [];

  if (area === "home") return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[#eadbcf] bg-white/95 shadow-[0_-10px_30px_rgba(70,35,18,0.08)] backdrop-blur md:hidden">
      <div className="mx-auto grid max-w-md grid-cols-4 px-2 py-2">
        {navItems.map(([label, href]) => {
          const active = pathname === href;
          return (
            <Link
              className={`rounded-xl px-2 py-2 text-center text-xs font-bold ${
                active ? "bg-[#b84f28] text-white" : "text-[#6d5145]"
              }`}
              href={href}
              key={href}
            >
              {t(label)}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
