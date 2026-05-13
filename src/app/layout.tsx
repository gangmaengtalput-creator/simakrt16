import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// 1. IMPORT KOMPONEN AUTOLOGOUT DENGAN RELATIVE PATH (Tanpa @)
import AutoLogout from "../components/AutoLogout";
import PwaRegister from "../components/PwaRegister";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Metadata Proyek
export const metadata: Metadata = {
  title: "Gang Maeng",
  description: "Sistem Informasi Manajemen Kependudukan RT.16 Kelurahan Talangputri",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <meta name="theme-color" content="#0B1120" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black" />
        <meta name="apple-mobile-web-app-title" content="SIMAKRT" />

        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="icon" href="/logo-maeng.png" sizes="192x192" type="image/png" />
        <link rel="apple-touch-icon" href="/logo-maeng.png" sizes="1024x1024" />
      </head>
      {/* Body sekarang 'Fixed' (Tetap):
          - bg-white: Latar belakang selalu putih.
          - text-gray-900: Tulisan selalu hitam pekat.
      */}
      <body className="min-h-full flex flex-col bg-white text-gray-900 antialiased">
        
        {/* 2. PASANG SENSOR AKTIVITAS SILUMAN DI SINI */}
        <AutoLogout />
        <PwaRegister />
        
        {children}
      </body>
    </html>
  );
}