import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navigacija from "@/components/Navigacija";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FitRecepti",
  description: "Deljenje recepata sa automatski izračunatim nutritivnim vrednostima",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="sr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Navigacija />
        {children}
      </body>
    </html>
  );
}
