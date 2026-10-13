import type { Metadata } from "next";
import { Inter, Outfit, Geist } from "next/font/google";
import "./globals.css";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { cn } from "@/lib/utils";
import { getMediaUrl } from "@/lib/media";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://gamingmaniadelhi.com"),
  title: {
    default: "Gaming Mania Delhi | Premium Esports & PC Gaming Lounge",
    template: "%s | Gaming Mania Delhi",
  },
  description:
    "Delhi's ultimate premium gaming destination. Experience high-performance PC gaming, PS5 lounges, and a professional esports environment in Kalkaji.",
  alternates: { canonical: "https://gamingmaniadelhi.com" },
  keywords: [
    "Gaming Lounge Delhi",
    "PC Gaming Cafe Kalkaji",
    "Esports Hub Delhi",
    "PS5 Lounge Delhi",
    "Gaming Cafe South Delhi",
    "Pro Gaming Station",
  ],
  authors: [{ name: "Gaming Mania Delhi" }],
  creator: "Gaming Mania Delhi",
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "https://gamingmaniadelhi.com",
    title: "Gaming Mania Delhi | Ultimate Premium Gaming Experience",
    description:
      "High-performance rigs, immersive atmosphere, and the best gaming community in Delhi.",
    siteName: "Gaming Mania Delhi",
    images: [
      {
        url: getMediaUrl("site/og-image.svg"),
        width: 1200,
        height: 630,
        alt: "Gaming Mania Delhi - Premium Gaming Lounge",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Gaming Mania Delhi | Premium Gaming Lounge",
    description:
      "Extreme performance and immersive gaming environment in Delhi.",
    images: [getMediaUrl("site/og-image.svg")],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={cn("scroll-smooth", "font-sans", geist.variable)}>
      <body
        className={`${inter.variable} ${outfit.variable} antialiased bg-background text-foreground min-h-screen flex flex-col`}
      >
        <SiteChrome>{children}</SiteChrome>
      </body>
    </html>
  );
}
