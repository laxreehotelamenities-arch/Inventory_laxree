import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LaxRee Inventory Portal · Hotel Amenities Stock & Catalog",
  description:
    "Mobile-first inventory portal for LaxRee Hotel Supplies. Browse tiered product catalog (Essential / Premium / Luxury), check real-time stock, request quotes, and manage dispatch.",
  keywords: [
    "LaxRee",
    "hotel amenities",
    "inventory",
    "stock",
    "catalog",
    "Essential",
    "Premium",
    "Luxury",
    "hospitality supplies",
  ],
  authors: [{ name: "LaxRee Hotel Supplies" }],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
