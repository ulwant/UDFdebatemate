import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/app/components/Sidebar";
import Topbar from "@/app/components/Topbar";
import DevServiceWorkerReset from "@/app/components/DevServiceWorkerReset";
import ApprovalGate from "@/app/components/ApprovalGate";
import { UserProvider } from "@/lib/UserContext";

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
  icons: {
    icon: [
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Debate Mate UDF",
  },
  formatDetection: {
    telephone: false,
  },
};

import ThemeProvider from "@/app/components/ThemeProvider";

import { ToastProvider } from "@/app/components/ToastContext";
import ErrorBoundary from "@/app/components/ErrorBoundary";
import BottomNav from "@/app/components/BottomNav";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <DevServiceWorkerReset />
        <ThemeProvider>
          <ToastProvider>
            <UserProvider>
              <ErrorBoundary>
                <div className="app-shell">
                  <Sidebar />
                  <main className="main">
                    <Topbar />
                    <ApprovalGate>{children}</ApprovalGate>
                  </main>
                </div>
                <BottomNav />
              </ErrorBoundary>
            </UserProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
