import type { Metadata, Viewport } from "next";
import { DM_Sans, Playfair_Display } from "next/font/google";
import "./globals.css";

const corpo = DM_Sans({ subsets: ["latin"], variable: "--fonte-corpo", display: "swap" });
const titulo = Playfair_Display({ subsets: ["latin"], weight: ["600", "700"], variable: "--fonte-titulo", display: "swap" });

export const metadata: Metadata = {
  title: "Canal Dark · TikTok Shop",
  description: "Estúdio de vídeos com IA para TikTok Shop",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b0b10",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${corpo.variable} ${titulo.variable}`}>
      <body>{children}</body>
    </html>
  );
}
