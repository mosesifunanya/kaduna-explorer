import "./globals.css";
import { Suspense } from "react";
import Script from "next/script";
import RouteTransitionProvider from "@/components/RouteTransitionProvider";
import { Toaster } from "sonner";
import localFont from "next/font/local";
import { AuthProvider } from "@/components/AuthProvider";
import MobileBottomNavigation from "@/components/MobileBottomNavigation";

const playfair = localFont({
  src: "./fonts/playfair-display.woff2",
  variable: "--font-playfair",
  display: "optional",
  weight: "500 800",
});

const dmSans = localFont({
  src: "./fonts/dm-sans.woff2",
  variable: "--font-inter",
  display: "optional",
  weight: "400 800",
});

export const metadata = {
  title: "Kaduna Explorer | Croc City",
  description:
    "Discover Kaduna's destinations, culture, food, events, accommodation and essential local services.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <Script
          id="ke-native-scroll-restoration"
          strategy="beforeInteractive"
        >{`try { window.history.scrollRestoration = "auto"; } catch (error) {}`}</Script>
      </head>

      <body
        className={`${playfair.variable} ${dmSans.variable} font-[family-name:var(--font-inter)] antialiased`}
      >
        <AuthProvider>
          <RouteTransitionProvider>
            {children}
            <Suspense fallback={null}>
              <MobileBottomNavigation />
            </Suspense>
          </RouteTransitionProvider>

          <Toaster
            position="top-right"
            richColors
            closeButton
            duration={4000}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
