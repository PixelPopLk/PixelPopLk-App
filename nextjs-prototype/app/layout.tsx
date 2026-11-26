import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PixelPop — Sinhala Subtitles",
  description: "Find Sinhala subtitles for your favourite movies and TV series.",
  applicationName: "PixelPop",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="si">
      <body>{children}</body>
    </html>
  );
}
