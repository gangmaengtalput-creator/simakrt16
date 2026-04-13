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
      {/* Body sekarang 'Fixed' (Tetap):
          - bg-white: Latar belakang selalu putih.
          - text-gray-900: Tulisan selalu hitam pekat.
      */}
      <body className="min-h-full flex flex-col bg-white text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}