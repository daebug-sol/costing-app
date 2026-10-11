import type { Metadata } from "next";
import { DM_Sans, Doto, IBM_Plex_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { AppProviders } from "@/components/app-providers";
import { THEME_INIT_SCRIPT } from "@/lib/theme-preferences";
import { cn } from "@/lib/utils";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

const doto = Doto({
  subsets: ["latin"],
  weight: ["400", "900"],
  variable: "--font-dot",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Costing App",
  description: "AHU project costing — multi-tenant SaaS",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      data-palette="dotmatrix"
      suppressHydrationWarning
      className={cn(
        "h-full font-sans antialiased",
        dmSans.variable,
        doto.variable,
        plexMono.variable
      )}
    >
      <head>
        <Script id="theme-init" strategy="beforeInteractive">
          {THEME_INIT_SCRIPT}
        </Script>
      </head>
      <body className="min-h-full">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}