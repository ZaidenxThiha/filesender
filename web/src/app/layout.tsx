import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Croc Web — simple peer-to-peer file transfer",
  description:
    "Send files directly between browsers with one memorable receive code.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <head>
        {/* EffectiveCPM — Popunder JS SYNC */}
        <script
          src="https://pl30932547.effectivecpmnetwork.com/30/19/96/3019962f11d631fcdd7a4e17c86089a3.js"
        ></script>
        <script
          src="https://elseconcerning.com/7b/ef/18/7bef181c8113410d16150bc146afb2f2.js"
        ></script>
        {/* EffectiveCPM — Native banner */}
        <script
          async
          data-cfasync="false"
          src="https://pl30932608.effectivecpmnetwork.com/a6ce759d2c8fd02ae30424dfc026d840/invoke.js"
        ></script>
      </head>
      <body>{children}</body>
    </html>
  );
}
