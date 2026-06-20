import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { themeBootScript } from "@/lib/theme";
import ThemeEffect from "@/components/ThemeEffect";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Coherence",
  description: "A calm, local-first HRV coherence biofeedback trainer.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="dark"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* Sets data-theme before first paint to avoid a flash of the wrong
            theme. Runs synchronously during HTML parsing. */}
        <script dangerouslySetInnerHTML={{ __html: themeBootScript() }} />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeEffect />
        {children}
        <footer className="relative z-10 shrink-0 px-6 pb-4 pt-2 text-center text-xs text-fg-faint">
          Everything runs on your device. Nothing is sent anywhere.
        </footer>
      </body>
    </html>
  );
}
