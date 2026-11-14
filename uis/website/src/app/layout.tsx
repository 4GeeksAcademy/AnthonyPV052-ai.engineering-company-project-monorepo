import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Brasaland — Cocina a la brasa · Colombia + Florida",
    template: "%s · Brasaland",
  },
  description:
    "14 restaurantes en Colombia y Florida. Brasaland transforma la cocina a la brasa en una experiencia confiable, rápida y humana.",
  openGraph: {
    title: "Brasaland — Cocina a la brasa",
    description:
      "14 restaurantes en Colombia y Florida. Brasaland transforma la cocina a la brasa en una experiencia confiable, rápida y humana.",
    siteName: "Brasaland",
    locale: "es_CO",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link rel="preconnect" href="https://dummyimage.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
