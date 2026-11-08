import type { Metadata } from "next";
import { Syne, Figtree } from "next/font/google";
import "./globals.css";

const syne = Syne({
  subsets: ["latin", "latin-ext"],
  variable: "--font-display",
  weight: ["500", "600", "700", "800"],
});

const figtree = Figtree({
  subsets: ["latin", "latin-ext"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Kosino Movie Studio",
  description: "Storyboard a preprodukce — Character Lock, Location Lock, Shot List, Animace",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="cs" className={`${syne.variable} ${figtree.variable}`}>
      <body>{children}</body>
    </html>
  );
}
