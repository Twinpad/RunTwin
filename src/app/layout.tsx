import type { Metadata, Viewport } from "next";
import { Baloo_2, JetBrains_Mono, Nunito } from "next/font/google";
import "./globals.css";
import { WalletProviders } from "@/components/wallet/wallet-providers";
import { AppShell } from "@/components/layout/app-shell";
import { ThemeProvider } from "@/components/theme/theme-provider";

const inter = Nunito({ subsets: ["latin"], variable: "--font-sans" });
const display = Baloo_2({ subsets: ["latin"], variable: "--font-display" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

/**
 * Theme bootstrap — runs before first paint (no flash of the wrong theme).
 * Reads the persisted preference (default: dark — first-time visitors get
 * Dark Mode, never the OS preference) and applies the `.dark` class to
 * <html>; a saved "system" preference follows prefers-color-scheme. Kept in
 * sync with src/components/theme/theme-provider.tsx (STORAGE_KEY + apply
 * logic).
 */
const themeBootstrap = `(function(){try{var t=localStorage.getItem("twinpad-theme");if(t!=="light"&&t!=="dark"&&t!=="system")t="dark";var d=t==="dark"||(t==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);var e=document.documentElement.classList;d?e.add("dark"):e.remove("dark");document.documentElement.style.colorScheme=d?"dark":"light";}catch(e){document.documentElement.classList.add("dark");document.documentElement.style.colorScheme="dark";}})();`;

/**
 * metadataBase origin — resolves relative Open Graph / Twitter image URLs
 * (e.g. /twin-og.png) to absolute URLs.
 *
 * - Production (Vercel builds): VERCEL_PROJECT_PRODUCTION_URL is injected by
 *   the platform and reflects the production domain (note: the project may be
 *   behind Vercel Deployment Protection/SSO until public launch, and any
 *   custom domain added in the Vercel dashboard is picked up automatically).
 * - Local development: NEXT_PUBLIC_APP_URL from .env.local
 *   (http://localhost:3300).
 */
const metadataOrigin = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(metadataOrigin),
  title: {
    default: "TwinPad — One Platform. Two Ways to Launch.",
    template: "%s | TwinPad",
  },
  description:
    "TwinPad puts two of Solana's favorite launch paths side by side: start on the Pump.fun curve, or go with Raydium LaunchLab. Track new tokens, follow the market, and ship your own idea — no code, no custody.",
  applicationName: "TwinPad",
  openGraph: {
    title: "TwinPad — One Platform. Two Ways to Launch.",
    description:
      "Pump.fun or Raydium LaunchLab? Pick your path, mint your token, and watch the ecosystem unfold around you — all in one playful corner of Solana.",
    siteName: "TwinPad",
    type: "website",
    images: [{ url: "/branding/og-default.png", width: 1200, height: 630, alt: "TwinPad — One Platform. Two Ways to Launch." }],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F4F2FE" },
    { media: "(prefers-color-scheme: dark)", color: "#120A34" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`dark ${inter.variable} ${mono.variable} ${display.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen font-sans antialiased">
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
        <ThemeProvider>
          <WalletProviders>
            <AppShell>{children}</AppShell>
          </WalletProviders>
        </ThemeProvider>
      </body>
    </html>
  );
}
