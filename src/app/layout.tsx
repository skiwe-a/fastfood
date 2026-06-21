import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import Providers from "./Providers";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["400", "700", "900"],
  variable: "--font-cairo",
});

export const metadata: Metadata = {
  title: "مطاعم السودان | اكتشف أفضل المطاعم",
  description: "منصة رقمية متعددة المستأجرين للمطاعم السودانية - اكتشف، تابع، اطلب عبر واتساب",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body className={`${cairo.variable} font-sans antialiased bg-white text-gray-800`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
