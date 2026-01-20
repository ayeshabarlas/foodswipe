import type { Metadata } from "next";
import { Poppins, Plus_Jakarta_Sans, Inter } from "next/font/google";
import "./globals.css";
import { CartProvider } from "../context/CartContext";
import SystemWrapper from "../components/SystemWrapper";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Foodswipe",
  description: "TikTok-style food delivery app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
      </head>
      <body
        className={`${inter.variable} ${poppins.variable} ${plusJakartaSans.variable} antialiased`}
      >
        <SystemWrapper>
          <CartProvider>
            {children}
          </CartProvider>
        </SystemWrapper>
      </body>
    </html>
  );
}
