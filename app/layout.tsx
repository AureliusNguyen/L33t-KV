import type { Metadata } from "next";
import { Fraunces, Newsreader, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  axes: ["SOFT", "WONK", "opsz"],
  display: "swap",
  variable: "--font-fraunces",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400", "500"],
  display: "swap",
  variable: "--font-newsreader",
});

const plex = IBM_Plex_Mono({
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-plex",
});

export const metadata: Metadata = {
  title: "L33T KV - a custom KV store that beats Redis 6.0",
  description:
    "L33T KV: a custom binary-protocol key-value store written from scratch in ~400 lines of C. Beats Redis 6.0 on a 3-node lab LAN at 36,234 ops/sec and ranked 1/40 grad students in a KV store competition.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${newsreader.variable} ${plex.variable}`}
    >
      <body className="antialiased">{children}</body>
    </html>
  );
}
