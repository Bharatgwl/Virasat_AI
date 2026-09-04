"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useLanguage } from "@/components/language-provider";
import { isApiRequestError } from "@/lib/api-client";
import {
  clearAccountSession,
  getActiveAccount,
  refreshAccount,
} from "@/lib/services/accounts";
import { getCurrentArtisan } from "@/lib/services/artisans";
import { getCurrentBuyer } from "@/lib/services/buyers";
import { getStoredLanguage } from "@/lib/services/storage";
import type { Account, AccountRole } from "@/lib/types";

const sellerAuthRoutes = ["/seller/register", "/seller/login"];
const buyerAuthRoutes = ["/buyer/register", "/buyer/login"];
const legacySellerRoutes = ["/dashboard", "/add-product", "/product-review", "/catalog", "/inquiries", "/profile", "/register"];
const legacyBuyerRoutes = ["/marketplace", "/product"];

function isRouteIn(pathname: string, routes: string[]) {
  return routes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

function requiredRole(pathname: string): AccountRole | null {
  if (pathname.startsWith("/seller") && !sellerAuthRoutes.includes(pathname)) return "seller";
  if (pathname.startsWith("/buyer") && !buyerAuthRoutes.includes(pathname)) return "buyer";
  if (isRouteIn(pathname, legacySellerRoutes)) return "seller";
  if (isRouteIn(pathname, legacyBuyerRoutes)) return "buyer";
  return null;
}

function isAuthRoute(pathname: string) {
  return sellerAuthRoutes.includes(pathname) || buyerAuthRoutes.includes(pathname);
}

function loginFor(role: AccountRole) {
  return role === "seller" ? "/seller/login" : "/buyer/login";
}

function onboardingFor(role: AccountRole) {
  return role === "seller" ? "/seller/onboarding" : "/buyer/onboarding";
}

function homeFor(role: AccountRole) {
  return role === "seller" ? "/seller/dashboard" : "/buyer/marketplace";
}

function canonicalLegacyPath(pathname: string) {
  if (pathname === "/dashboard") return "/seller/dashboard";
  if (pathname === "/catalog") return "/seller/catalog";
  if (pathname === "/add-product") return "/seller/products/new";
  if (pathname === "/product-review") return "/seller/products/review";
  if (pathname === "/inquiries") return "/seller/inquiries";
  if (pathname === "/profile") return "/seller/profile";
  if (pathname === "/register") return "/seller/register";
  if (pathname === "/marketplace") return "/buyer/marketplace";
  if (pathname.startsWith("/product/")) return pathname.replace("/product/", "/buyer/products/");
  return null;
}

function isMissingProfile(error: unknown, role: AccountRole) {
  const expectedCode = role === "seller" ? "ARTISAN_NOT_FOUND" : "BUYER_NOT_FOUND";
  return isApiRequestError(error) && (error.status === 404 || error.code === expectedCode);
}

async function ensureCompletedProfile(account: Account) {
  if (account.role === "seller") {
    await getCurrentArtisan();
  } else {
    await getCurrentBuyer();
  }
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { t } = useLanguage();
  const pathname = usePathname();
  const router = useRouter();
  const [checking, setChecking] = useState(
    () => Boolean(requiredRole(pathname) || isAuthRoute(pathname)),
  );

  useEffect(() => {
    let alive = true;

    function showPage() {
      if (alive) setChecking(false);
    }

    function redirect(path: string) {
      if (!alive) return;
      setChecking(true);
      router.replace(path);
    }

    async function checkAuth() {
      const cached = getActiveAccount();
      const routeRole = requiredRole(pathname);
      const authRoute = isAuthRoute(pathname);
      const canonicalPath = canonicalLegacyPath(pathname);

      if (canonicalPath) {
        if (cached && routeRole && cached.role !== routeRole) {
          redirect(homeFor(cached.role));
        } else {
          const search = typeof window === "undefined" ? "" : window.location.search;
          redirect(`${canonicalPath}${search}`);
        }
        return;
      }

      if (pathname === "/") {
        if (cached) {
          redirect(homeFor(cached.role));
          return;
        }
        if (!getStoredLanguage()) {
          redirect("/language");
          return;
        }
      }

      if (!routeRole && !authRoute) {
        showPage();
        return;
      }

      if (!cached) {
        if (routeRole) {
          redirect(loginFor(routeRole));
        } else {
          showPage();
        }
        return;
      }

      if (routeRole && cached.role !== routeRole) {
        redirect(homeFor(cached.role));
        return;
      }

      let account: Account | null;
      try {
        account = await refreshAccount();
      } catch {
        // Temporary backend failures should render an error, never start a redirect loop.
        showPage();
        return;
      }

      if (!alive) return;

      if (!account) {
        clearAccountSession();
        if (routeRole) {
          redirect(loginFor(routeRole));
        } else {
          showPage();
        }
        return;
      }

      if (routeRole && account.role !== routeRole) {
        redirect(homeFor(account.role));
        return;
      }

      try {
        await ensureCompletedProfile(account);
      } catch (profileError) {
        if (!alive) return;
        if (isMissingProfile(profileError, account.role)) {
          const onboarding = onboardingFor(account.role);
          if (pathname !== onboarding) {
            redirect(onboarding);
          } else {
            showPage();
          }
          return;
        }

        // Destination pages own transient API error and retry presentation.
        if (authRoute) {
          redirect(homeFor(account.role));
        } else {
          showPage();
        }
        return;
      }

      if (!alive) return;

      const onboarding = onboardingFor(account.role);
      if (authRoute || pathname === onboarding) {
        redirect(homeFor(account.role));
        return;
      }

      showPage();
    }

    void checkAuth();
    return () => {
      alive = false;
    };
  }, [pathname, router]);

  if (checking) {
    return (
      <main className="app-shell">
        <section className="app-card p-6 text-[#6d5145]">{t("checkingSession")}</section>
      </main>
    );
  }

  return children;
}
