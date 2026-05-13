import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/app/components/Sidebar";
import Topbar from "@/app/components/Topbar";
import DevServiceWorkerReset from "@/app/components/DevServiceWorkerReset";

const inter = Inter({
  subsets: ["latin"],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
});

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: "Debate Mate UDF",
  description: "Debate operations, all in one place.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Debate Mate UDF",
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <DevServiceWorkerReset />
        <div className="app-shell">
          <Sidebar />
          <main className="main">
            <Topbar />
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
