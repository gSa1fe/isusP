import type { Metadata } from "next";
import { Kanit } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import FooterWrapper from '@/components/FooterWrapper'
import { Toaster } from "@/components/ui/sonner"

// ตั้งค่าฟอนต์
const kanit = Kanit({ 
  subsets: ["thai", "latin"], 
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-kanit"
});

export const metadata: Metadata = {
  title: "HEEDOM881",
  description: "อ่านการ์ตูนเว็บตูนแปลไทยฟรี อัปเดตไว",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className="dark" style={{ colorScheme: 'dark' }}>
      <body className={`${kanit.className} antialiased bg-background text-foreground`}>
        <Navbar /> 
        {children}
        <FooterWrapper />
        <Toaster richColors position="top-center" /> 
      </body>
    </html>
  );
}