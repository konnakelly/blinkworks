import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/contexts/AuthContext";
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
  title: "BlinkWorks - Creative Brief Platform",
  description: "Streamline your creative workflow with our comprehensive brief management platform",
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
            <AuthProvider>
              {children}
            </AuthProvider>
          </body>
        </html>
  );
}
