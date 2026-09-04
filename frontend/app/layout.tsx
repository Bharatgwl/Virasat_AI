import type { Metadata } from "next";
import { AuthGate } from "@/components/auth-gate";
import { BottomNav } from "@/components/bottom-nav";
import { SiteHeader } from "@/components/site-header";
import { LanguageProvider } from "@/components/language-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Viraasat AI",
  description: "Simple AI-assisted cataloging for Indian artisans",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <LanguageProvider>
          <SiteHeader />
          <AuthGate>
            <main>{children}</main>
          </AuthGate>
          <BottomNav />
        </LanguageProvider>
      </body>
    </html>
  );
}
