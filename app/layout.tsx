import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { Toaster } from "@/components/Toast";
import { TooltipProvider } from "@/components/ui/tooltip";

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex-sans",
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
      className={`h-full ${plexSans.variable} ${plexMono.variable} font-sans antialiased`}
    >
      <body className="min-h-full">
        <TooltipProvider>
          <Navbar />
          <main className="bg-background min-h-screen pt-14">{children}</main>
          <Toaster />
        </TooltipProvider>
      </body>
    </html>
  );
}
