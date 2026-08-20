import type { Metadata } from "next";
import Script from "next/script";
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
      <body>
        {children}
        {/* Popunder / Popunder_1 — JS SYNC */}
        <Script
          id="effectivecpm-popunder"
          src="https://pl30932501.effectivecpmnetwork.com/7b/ef/18/7bef181c8113410d16150bc146afb2f2.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
