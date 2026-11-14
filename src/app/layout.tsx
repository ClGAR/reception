import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { cx } from "@/lib/cx";

// Geist for reading, Geist Mono for times and prices, Space Grotesk (preset b5J6bYbVg) for page titles.
const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });
const display = Space_Grotesk({ subsets: ["latin"], variable: "--font-display" });

export const metadata: Metadata = {
  title: "Reception",
  description: "Every inquiry, handled. AI reception and booking for service businesses.",
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

// Light for everyone unless the reader chose dark; applied before paint so it never flashes.
const themeScript = `(function(){try{var t=localStorage.getItem("reception-theme");if(t==="dark"){document.documentElement.dataset.theme=t}}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={cx("h-full antialiased", geist.variable, geistMono.variable, display.variable)} suppressHydrationWarning>
      <body className="min-h-full">
        <Script id="theme-init" strategy="beforeInteractive">
          {themeScript}
        </Script>
        {children}
      </body>
    </html>
  );
}
