import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans, Caveat, Dancing_Script } from "next/font/google";
import { VaultProvider } from "@/src/context/VaultContext";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const caveat = Caveat({
  subsets: ["latin"],
  variable: "--font-handwritten",
  display: "swap",
});

const landingScript = Dancing_Script({
  subsets: ["latin"],
  variable: "--font-landing-script",
  display: "swap",
});

const display = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Persoulna",
  description:
    "Multi-platform social media content orchestration. Write, schedule, and analyze posts across X, LinkedIn, Threads, Medium, and more.",
  icons: {
    icon: "/favicon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${display.variable} ${caveat.variable} ${landingScript.variable}`}
    >
      <body>
        <VaultProvider>
          {children}
        </VaultProvider>
      </body>
    </html>
  );
}
