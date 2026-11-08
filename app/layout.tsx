import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="cs">
      <body>{children}</body>
    </html>
  );
}
