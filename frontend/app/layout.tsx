import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LearnerMax Course App",
  description: "A fully open source Course application that is modern and hackable",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
