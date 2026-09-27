import type { Metadata, Viewport } from "next";
import { DM_Sans, Playfair_Display } from "next/font/google";
import "./globals.css";

const corpo = DM_Sans({ subsets: ["latin"], variable: "--fonte-corpo", display: "swap" });
const titulo = Playfair_Display({ subsets: ["latin"], weight: ["600", "700"], variable: "--fonte-titulo", display: "swap" });

export const metadata: Metadata = {
  title: "Tia Fifi · Painel de Ofertas",
  description: "Painel de ofertas para afiliados",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6efe8" },
    { media: "(prefers-color-scheme: dark)", color: "#1b1216" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${corpo.variable} ${titulo.variable}`}>
      <body>{children}</body>
    </html>
  );
}
