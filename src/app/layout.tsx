import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "next-themes";

/**
 * Inline script to patch history.replaceState/pushState for sandboxed iframes.
 * Must run BEFORE Next.js client router hydrates.
 * In sandboxed iframes (like preview panels), replaceState throws SecurityError.
 * This patch silently catches the error so the app still works.
 */
const sandboxPatch = `
(function() {
  var origReplace = history.replaceState;
  var origPush = history.pushState;
  history.replaceState = function() {
    try { return origReplace.apply(this, arguments); }
    catch(e) { if (e.name !== 'SecurityError') throw e; }
  };
  history.pushState = function() {
    try { return origPush.apply(this, arguments); }
    catch(e) { if (e.name !== 'SecurityError') throw e; }
  };
})();
`;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Varga Sign Analysis — Exact Boundary Computation",
  description: "Vedic astrology Varga sign analysis with exact fractional arithmetic. Visualize parity, modality, and element distributions across 16 divisional charts (D1-D60).",
  keywords: ["Vedic astrology", "Jyotish", "Varga", "Navamsa", "D9", "divisional charts", "zodiac", "modality", "element"],
  authors: [{ name: "Varga Analysis" }],
  openGraph: {
    title: "Varga Sign Analysis",
    description: "Exact boundary computation across 16 Vedic divisional charts",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Varga Sign Analysis",
    description: "Exact boundary computation across 16 Vedic divisional charts",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark no-transition">
      <head>
        <script dangerouslySetInnerHTML={{ __html: sandboxPatch }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
