import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import { SWRProvider } from "@/lib/swr-config";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "LearnWithRico",
  description: "Agentic Coding with Rico Romero",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${poppins.variable} font-sans antialiased`}
      >
        <SWRProvider>
          {children}
        </SWRProvider>
        <Analytics />
      </body>
    </html>
  );
}
