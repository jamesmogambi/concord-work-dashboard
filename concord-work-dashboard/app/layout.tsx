import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Concord Work Dashboard",
  description: "Live coordination state for Concord coding agents — tasks, overlaps, and activity.",
  keywords: ["concord", "agents", "coordination", "dashboard"],
  authors: [{ name: "Concord" }],
  openGraph: {
    title: "Concord Work Dashboard",
    description: "Live coordination state for Concord coding agents.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Concord Work Dashboard",
    description: "Live coordination state for Concord coding agents.",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
