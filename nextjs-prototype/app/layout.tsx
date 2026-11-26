import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PixelPop — Sinhala Subtitles for Every Story",
  description: "Discover Sinhala subtitles for movies and TV series on PixelPop.",
  applicationName: "PixelPop",
  themeColor: "#0a0b0d",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="si">
      <body>{children}</body>
    </html>
  );
}
