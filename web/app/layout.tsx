import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ContractScan - AI Smart Contract Analysis",
  description: "Instantly analyze any verified smart contract on Ethereum, Base, or Arbitrum. Get security insights, risk scores, and plain English explanations.",
  keywords: ["smart contract", "security analysis", "ethereum", "base", "arbitrum", "blockchain", "defi"],
  openGraph: {
    title: "ContractScan - AI Smart Contract Analysis",
    description: "Instantly analyze any verified smart contract. Get security insights and risk scores.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
