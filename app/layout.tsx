import type { Metadata } from "next";
import { Cormorant_Garamond, IBM_Plex_Mono, Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { AppProviders } from "@/components/app-providers";
import { THEME_INIT_SCRIPT } from "@/lib/theme-preferences";
import { cn } from "@/lib/utils";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const displaySerif = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
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
      data-palette="professional"
      suppressHydrationWarning
      className={cn(
        "h-full font-sans antialiased",
        inter.variable,
        displaySerif.variable,
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