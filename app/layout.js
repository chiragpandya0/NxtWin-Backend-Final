import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "./components/ui/sonner";
import Header from "./components/layout/Header";
import AccaSlip from "./components/AccaSlip";
import { ThemeProvider } from "next-themes";
import { Analytics } from "@vercel/analytics/next";
import Script from "next/script";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "gaffr.",
  description: "Free-to-play Premier League prediction market",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
        <head>
          <meta
            name="google-adsense-account"
            content="ca-pub-2888185726114325"
          ></meta>
          <Script
            async
            src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2888185726114325"
            crossorigin="anonymous"
          />
        </head>
        <body className={inter.className}>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem={false}
            disableTransitionOnChange
          >
            <Header />
            {children}
            <AccaSlip />
            <Toaster />
            <Analytics />
          </ThemeProvider>
        </body>
      </html>
  );
}
