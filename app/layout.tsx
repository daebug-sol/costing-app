import type { Metadata } from "next";
import { IBM_Plex_Mono, Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { Toaster } from "@/components/Toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Costing App — PT Thermal True Indonesia",
  description: "AHU project costing for PT Thermal True Indonesia",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn("h-full font-sans antialiased", inter.variable, plexMono.variable)}
    >
      <body className="min-h-full">
        <TooltipProvider>
          <Navbar />
          <main className="min-h-screen bg-muted/30 pt-14">{children}</main>
          <Toaster />
        </TooltipProvider>
      </body>
    </html>
  );
}
