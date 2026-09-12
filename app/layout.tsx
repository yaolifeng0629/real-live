import type { Metadata, Viewport } from "next";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://github.com/yaolifeng0629/real-live"),
  title: "Real Live — Fullscreen Camera Monitor",
  description:
    "Real Live turns your device camera into a fullscreen live monitor. Privacy-first: video never leaves your device.",
  applicationName: "Real Live",
  keywords: ["camera", "webcam", "live monitor", "fullscreen", "getUserMedia"],
  authors: [{ name: "Immerse", url: "https://github.com/yaolifeng0629" }],
  openGraph: {
    type: "website",
    title: "Real Live — Fullscreen Camera Monitor",
    description:
      "Turns your device camera into a fullscreen live monitor. Privacy-first: video never leaves your device.",
    siteName: "Real Live",
  },
  twitter: {
    card: "summary_large_image",
    title: "Real Live — Fullscreen Camera Monitor",
    description:
      "Turns your device camera into a fullscreen live monitor. Privacy-first: video never leaves your device.",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
