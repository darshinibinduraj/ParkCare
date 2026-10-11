import type { Metadata } from "next";
import { cookies } from "next/headers";
import "@fontsource/atkinson-hyperlegible/latin-400.css";
import "@fontsource/atkinson-hyperlegible/latin-700.css";
import { Providers } from "@/components/providers";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { isTextSize, isTheme, THEME_BOOT_SCRIPT } from "@/lib/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "ParkCare", template: "%s · ParkCare" },
  description:
    "ParkCare helps people with Parkinson's and caregivers turn one story into a single informational care plan.",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const jar = await cookies();
  const themeCookie = jar.get("parkcare_theme")?.value;
  const sizeCookie = jar.get("parkcare_text")?.value;
  const theme = isTheme(themeCookie) ? themeCookie : "light";
  const textSize = isTextSize(sizeCookie) ? sizeCookie : "md";

  return (
    <html lang="en" data-theme={theme} data-text-size={textSize} suppressHydrationWarning>
      <body className="flex min-h-screen flex-col">
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <Providers>
          <SiteHeader />
          <div className="flex-1">{children}</div>
          <SiteFooter />
        </Providers>
      </body>
    </html>
  );
}
