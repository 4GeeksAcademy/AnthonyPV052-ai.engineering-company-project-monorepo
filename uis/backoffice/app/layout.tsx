import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Brasaland Backoffice",
  description: "Panel interno para operacion y metricas",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full bg-[var(--bg)] text-[var(--text)]">{children}</body>
    </html>
  );
}
